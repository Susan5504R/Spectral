'use strict';

/**
 * graph/treeDiff.js — Zhang-Shasha Tree Edit Distance Engine
 *
 * Implements the Zhang & Shasha (1989) algorithm entirely from scratch
 * in ~250 lines of Node.js.  No external TED library is used.
 *
 * Sub-Phase 2.1 — Internal tree representation + tree-sitter converter
 * Sub-Phase 2.2 — Zhang-Shasha bottom-up DP on postorder arrays
 * Sub-Phase 2.3 — Edit operation extraction + public diff() API
 *
 * ── Algorithm summary ────────────────────────────────────────────────────────
 * Zhang-Shasha works in three steps:
 *   1. Convert both trees to postorder arrays and compute lm[i] (leftmost
 *      leaf descendant index) for every node.
 *   2. Identify "keyroots": for each distinct lm value, the rightmost
 *      node with that lm is a keyroot.
 *   3. For each pair of keyroots (k1, k2), run computeForestDist which
 *      fills the global td table cell-by-cell using two cases:
 *        • Tree case  (lm(i)==lm(k1) && lm(j)==lm(k2)):  rename/match cost
 *        • Forest case (otherwise):                         subtree move cost
 *   Processing keyroots in ascending index order guarantees that any
 *   td[i][j] needed by the forest case was already set by a previous call.
 *
 * ── Cost model ────────────────────────────────────────────────────────────────
 *   delete node   = 1
 *   insert node   = 1
 *   rename (type changed) = 1
 *   match  (same type)    = 0
 *
 * ── Public API ────────────────────────────────────────────────────────────────
 *   diff(code1, code2, lang)
 *     → Promise<{ distance, ops, jaccard, fallback }>
 */

const { parseToTree } = require('../anticheat/astParser');

// ─── Constants ────────────────────────────────────────────────────────────────

/** Trees larger than SIZE_GUARD skip TED (O(n²m²)) and return Jaccard only. */
const SIZE_GUARD = 500;

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-Phase 2.1 — Internal Tree Representation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create an internal tree node.
 * @param {string} type     - Normalized node type (e.g. 'for_statement', 'ID')
 * @param {Array}  children - Child nodes in left-to-right (preorder) order
 * @param {object} extras   - Optional extra properties (callee, text, etc.)
 */
function makeNode(type, children = [], extras = {}) {
    return { type, children, ...extras };
}

/**
 * Convert a web-tree-sitter SyntaxNode to an internal tree node (recursive).
 *
 * Rules applied during conversion:
 *   • Anonymous nodes (punctuation, brackets) → dropped
 *   • comment / line_comment / block_comment  → dropped
 *   • identifier / variable_name / name       → type: 'ID'   (anonymized)
 *   • string_literal / string                 → type: 'STR'
 *   • number_literal / integer / float        → type: 'NUM'
 *   • call_expression                         → extras.callee set to fn name
 *     (needed by Phase 3 rule engine to detect e.g. 'unordered_map' calls)
 *
 * @param  {SyntaxNode} tsNode - tree-sitter node
 * @returns {object|null}       - internal node, or null if the node is dropped
 */
function fromTreeSitter(tsNode) {
    if (!tsNode) return null;
    if (!tsNode.isNamed) return null;               // drop anonymous (punctuation)

    const t = tsNode.type;
    if (t === 'comment' || t === 'line_comment' || t === 'block_comment') return null;

    // Recursively convert all named children (drops anonymous automatically)
    const children = [];
    for (let i = 0; i < tsNode.childCount; i++) {
        const child = fromTreeSitter(tsNode.child(i));
        if (child !== null) children.push(child);
    }

    // Normalize type + collect extras
    let type = t;
    const extras = {};

    if (t === 'identifier' || t === 'variable_name' || t === 'name') {
        type = 'ID';
    } else if (t === 'string_literal' || t === 'string' || t === 'string_content') {
        type = 'STR';
    } else if (t === 'number_literal' || t === 'integer' || t === 'float') {
        type = 'NUM';
    }

    // Enrich call_expression with callee name so Phase 3 rules can check it
    if (t === 'call_expression') {
        const fn = tsNode.namedChild(0);
        if (fn) extras.callee = fn.text;
    }

    return makeNode(type, children, extras);
}

// ─── Postorder Traversal + Leftmost Leaf Computation ─────────────────────────

/**
 * Build a 1-indexed postorder array from an internal tree root.
 *
 * Each node is annotated with:
 *   _idx  - its 1-based index in the postorder array
 *   _lm   - postorder index of its leftmost leaf descendant
 *           (a leaf's leftmost leaf is itself)
 *
 * The leftmost leaf of a node = the leftmost leaf of its first (leftmost) child,
 * computed bottom-up during the postorder walk.
 *
 * @param  {object} root - internal tree root (from fromTreeSitter or makeNode)
 * @returns {Array}       [null, node₁, node₂, …, nodeₙ]  (1-indexed)
 */
function buildPostorder(root) {
    const nodes = [null]; // nodes[0] unused; nodes[1..n] are postorder nodes

    function walk(n) {
        let firstChildLM = null;
        for (const c of n.children) {
            walk(c);
            // firstChildLM captures _lm of the LEFTMOST child (first visited)
            if (firstChildLM === null) firstChildLM = c._lm;
        }
        nodes.push(n);
        n._idx = nodes.length - 1;
        n._lm  = (n.children.length === 0)
            ? n._idx       // leaf: leftmost leaf is itself
            : firstChildLM; // internal: leftmost leaf from leftmost child
    }

    walk(root);
    return nodes;
}

/** Extract _lm values into a plain 1-indexed array for fast access. */
function buildLM(nodes) {
    const n  = nodes.length - 1;
    const lm = new Array(n + 1).fill(0);
    for (let i = 1; i <= n; i++) lm[i] = nodes[i]._lm;
    return lm;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-Phase 2.2 — Zhang-Shasha Core Algorithm
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute keyroots for a postorder array.
 *
 * Definition: for each distinct lm[i] value L, the keyroot is the index
 * of the rightmost node with lm[i] == L.
 *
 * Keyroots are returned sorted in ascending index order. This ordering
 * guarantees that when computeForestDist(k1,k2) accesses td[i][j] in
 * the "forest case", td[i][j] was already populated by an earlier call
 * for the pair (keyroot_of_i, keyroot_of_j) — both of which are smaller
 * than the current (k1, k2) in the sorted ordering.
 *
 * @param {number} n   - tree size (nodes.length - 1)
 * @param {number[]} lm - leftmost leaf array (1-indexed)
 * @returns {number[]}  sorted keyroot indices
 */
function getKeyroots(n, lm) {
    const map = new Map(); // lm value → rightmost index with that lm
    for (let i = 1; i <= n; i++) {
        const l = lm[i];
        if (!map.has(l) || i > map.get(l)) map.set(l, i);
    }
    return [...map.values()].sort((a, b) => a - b);
}

/**
 * Compute the Tree Edit Distance between two internal trees.
 *
 * Time:  O(n² · m²) worst case; O(n · m · min(depth₁, leaves₁) · min(depth₂, leaves₂))
 *        in the general case — fast for competitive-programming-sized trees.
 * Space: O(n · m) for the td table + O(range₁ · range₂) per keyroot pair call.
 *
 * @param  {Array} nodes1 - postorder array for tree 1
 * @param  {Array} nodes2 - postorder array for tree 2
 * @returns {{ distance: number, td: Float32Array[], lm1, lm2, n1, n2 }}
 */
function zhang_shasha(nodes1, nodes2) {
    const n1 = nodes1.length - 1;
    const n2 = nodes2.length - 1;

    const lm1 = buildLM(nodes1);
    const lm2 = buildLM(nodes2);
    const kr1 = getKeyroots(n1, lm1);
    const kr2 = getKeyroots(n2, lm2);

    // td[i][j] = tree edit distance: subtree(nodes1[i]) → subtree(nodes2[j])
    // Initialized to 0; every (i,j) cell is set exactly once by its responsible
    // keyroot pair before it's read in any forest case.
    const td = [];
    for (let i = 0; i <= n1; i++) td.push(new Float32Array(n2 + 1));

    /**
     * Fill td for one keyroot pair (k1, k2).
     *
     * Maintains a per-call fdMap (forest distance) indexed by absolute node
     * indices.  The Map is discarded after this call — all keeper values have
     * been written into the global td table.
     *
     * Two cases:
     *   Tree case  — lm1[i1]==l1 && lm2[j1]==l2: i1 and j1 are the roots of
     *                complete subtrees relative to this keyroot pair.
     *                td[i1][j1] = min(del, ins, rename/match)
     *
     *   Forest case — otherwise: i1 or j1 lives inside a larger forest.
     *                 We treat moving the entire subtree as one atomic operation.
     *                 fd[i1][j1] = min(del, ins, fd[lm(i1)−1][lm(j1)−1]+td[i1][j1])
     *                 td[i1][j1] was set by a PREVIOUS (smaller) keyroot pair.
     */
    function computeForestDist(k1, k2) {
        const l1 = lm1[k1];
        const l2 = lm2[k2];

        // fdMap key = i * stride + j  (stride > n2 prevents collisions)
        const stride = n2 + 2;
        const fdMap  = new Map();
        const fdGet  = (i, j) => fdMap.get(i * stride + j) ?? 0;
        const fdSet  = (i, j, v) => fdMap.set(i * stride + j, v);

        // ── Boundary initialization ──────────────────────────────────────────
        fdSet(l1 - 1, l2 - 1, 0);                          // empty ↔ empty

        for (let i1 = l1; i1 <= k1; i1++)                  // delete T1[l1..i1]
            fdSet(i1, l2 - 1, fdGet(i1 - 1, l2 - 1) + 1);

        for (let j1 = l2; j1 <= k2; j1++)                  // insert T2[l2..j1]
            fdSet(l1 - 1, j1, fdGet(l1 - 1, j1 - 1) + 1);

        // ── Main DP ──────────────────────────────────────────────────────────
        for (let i1 = l1; i1 <= k1; i1++) {
            for (let j1 = l2; j1 <= k2; j1++) {
                const delCost = fdGet(i1 - 1, j1    ) + 1; // delete nodes1[i1]
                const insCost = fdGet(i1,     j1 - 1) + 1; // insert nodes2[j1]

                if (lm1[i1] === l1 && lm2[j1] === l2) {
                    // ── Tree case ─────────────────────────────────────────────
                    // i1 and j1 are roots of complete subtrees for this pair.
                    const renameCost = (nodes1[i1].type === nodes2[j1].type) ? 0 : 1;
                    const best       = Math.min(delCost, insCost, fdGet(i1 - 1, j1 - 1) + renameCost);
                    fdSet(i1, j1, best);
                    td[i1][j1] = best;          // ← committed to global table

                } else {
                    // ── Forest case ───────────────────────────────────────────
                    // Move subtrees (i1, j1) as whole units; td[i1][j1] is the
                    // precomputed cost of aligning those two subtrees alone.
                    const subCost = fdGet(lm1[i1] - 1, lm2[j1] - 1) + td[i1][j1];
                    fdSet(i1, j1, Math.min(delCost, insCost, subCost));
                    // (not written to td — this is a forest-level accumulator)
                }
            }
        }
    }

    // Process all keyroot pairs in ascending order (crucial for forest-case
    // correctness: td[i][j] needed in forest case is always pre-populated).
    for (const k1 of kr1)
        for (const k2 of kr2)
            computeForestDist(k1, k2);

    return { distance: td[n1][n2], td, lm1, lm2, n1, n2 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-Phase 2.3 — Edit Operation Extraction
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract structural edit operations as a net multiset diff of node types.
 *
 * This gives Phase 3's rule engine exactly what it needs:
 *   { op: 'insert', node: { type, callee? } }
 *   { op: 'delete', node: { type } }
 *
 * Approach: compare multisets of node types between the two trees.
 *   • Types that appear MORE in T2 than T1 → 'insert' ops
 *   • Types that appear MORE in T1 than T2 → 'delete' ops
 *
 * This captures structural changes without a full TED traceback, and is
 * sufficient for all rule patterns in Phase 3 (e.g. "deleted for_statement
 * AND inserted call to unordered_map → Added HashMap").
 *
 * @param  {Array} nodes1 - postorder array for T1
 * @param  {Array} nodes2 - postorder array for T2
 * @returns {Array}         ops list
 */
function extractOps(nodes1, nodes2) {
    const count1   = new Map(); // type → count in T1
    const count2   = new Map(); // type → count in T2
    const example2 = new Map(); // type → first node of that type in T2 (for extras)

    for (let i = 1; i < nodes1.length; i++) {
        const t = nodes1[i].type;
        count1.set(t, (count1.get(t) || 0) + 1);
    }
    for (let j = 1; j < nodes2.length; j++) {
        const n = nodes2[j];
        const t = n.type;
        count2.set(t, (count2.get(t) || 0) + 1);
        if (!example2.has(t)) example2.set(t, n);
    }

    const ops = [];

    // Net insertions — more occurrences of this type in T2 than T1
    for (const [type, c2] of count2) {
        const c1    = count1.get(type) || 0;
        const extra = c2 - c1;
        for (let k = 0; k < extra; k++) {
            const node = { type };
            const ex   = example2.get(type);
            if (ex?.callee) node.callee = ex.callee; // for call_expression rules
            ops.push({ op: 'insert', node });
        }
    }

    // Net deletions — more occurrences of this type in T1 than T2
    for (const [type, c1] of count1) {
        const c2    = count2.get(type) || 0;
        const extra = c1 - c2;
        for (let k = 0; k < extra; k++) {
            ops.push({ op: 'delete', node: { type } });
        }
    }

    return ops;
}

// ─── Jaccard similarity (token types) ────────────────────────────────────────

function tokenTypes(nodes) {
    const arr = [];
    for (let i = 1; i < nodes.length; i++) arr.push(nodes[i].type);
    return arr;
}

function jaccardSimilarity(a, b) {
    const s1 = new Set(a);
    const s2 = new Set(b);
    let inter = 0;
    for (const t of s1) if (s2.has(t)) inter++;
    const union = s1.size + s2.size - inter;
    return union === 0 ? 1.0 : inter / union;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-Phase 2.3 — Public API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute the structural difference between two code submissions.
 *
 * Steps:
 *   1. Parse both snippets via web-tree-sitter (reuses anticheat/astParser.js)
 *   2. Convert to internal trees (fromTreeSitter)
 *   3. Build postorder arrays (buildPostorder)
 *   4. Run Zhang-Shasha (zhang_shasha) — unless either tree exceeds SIZE_GUARD
 *   5. Extract op list (extractOps)
 *
 * @param  {string} code1 - Previous code submission
 * @param  {string} code2 - Current code submission
 * @param  {string} lang  - 'cpp' | 'c' | 'python' | 'java'
 * @returns {Promise<{
 *   distance: number|null,   TED (null if size guard triggered)
 *   ops:      Array,         structural edit ops for rule engine
 *   jaccard:  number,        Jaccard similarity [0,1] — always computed
 *   fallback: boolean        true when size guard skipped TED
 * }>}
 */
async function diff(code1, code2, lang) {
    const tree1 = await parseToTree(code1, lang);
    const tree2 = await parseToTree(code2, lang);

    const root1 = fromTreeSitter(tree1.rootNode);
    const root2 = fromTreeSitter(tree2.rootNode);

    if (!root1 || !root2) {
        throw new Error(`[TreeDiff] Failed to convert ${lang} parse tree to internal format`);
    }

    const nodes1 = buildPostorder(root1);
    const nodes2 = buildPostorder(root2);
    const n1     = nodes1.length - 1;
    const n2     = nodes2.length - 1;

    const jaccard = jaccardSimilarity(tokenTypes(nodes1), tokenTypes(nodes2));

    // Size guard — TED is O(n²m²); skip for very large trees to stay non-blocking
    if (n1 > SIZE_GUARD || n2 > SIZE_GUARD) {
        console.warn(`[TreeDiff] Size guard triggered (T1=${n1}, T2=${n2} nodes). Using Jaccard only.`);
        return { distance: null, ops: [], jaccard, fallback: true };
    }

    const { distance } = zhang_shasha(nodes1, nodes2);
    const ops          = extractOps(nodes1, nodes2);

    return { distance, ops, jaccard, fallback: false };
}

module.exports = {
    // Public API
    diff,
    // Exported for testing (graph/tests/tedTests.js)
    makeNode,
    fromTreeSitter,
    buildPostorder,
    zhang_shasha,
    extractOps,
};
