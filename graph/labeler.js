'use strict';

/**
 * graph/labeler.js — Transformation Labeling Rule Engine
 *
 * Sub-Phase 3.1: Rule-based labeling (fast, deterministic)
 * Sub-Phase 3.2: Gemini AI fallback when no rule matches
 *
 * ── How it works ──────────────────────────────────────────────────────────────
 *   1. applyRules(ops, code1, code2) runs all rules in parallel.
 *      Every matching rule contributes a label — multiple labels are valid
 *      (e.g., a submission that adds both a sort AND binary search gets both).
 *   2. If no rule fires, label() calls graph/geminiLabeler.js which asks
 *      Gemini Flash to classify the transformation.  Results are cached in
 *      Redis to avoid repeated API calls.
 *
 * ── Rule design ───────────────────────────────────────────────────────────────
 *   Each rule receives:
 *     ops   — array of { op: 'insert'|'delete', node: { type, callee? } }
 *             (output of graph/treeDiff.js extractOps)
 *     c1    — previous submission source code  (string)
 *     c2    — current submission source code   (string)
 *
 *   Rules combine STRUCTURAL signals (ops node types) with TEXT signals
 *   (codeHas keyword search on c1/c2).  Using both prevents false positives:
 *   a structural insert of call_expression alone doesn't mean "Added HashMap"
 *   — the code must actually contain map-related keywords.
 *
 * ── Public API ────────────────────────────────────────────────────────────────
 *   applyRules(ops, code1, code2) → string[] | null
 *   label(ops, code1, code2, lang, hash1?, hash2?)
 *     → Promise<{ labels, source, confidence, explanation? }>
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Check whether the code string contains at least one of the given keywords.
 * @param  {string}          code
 * @param  {string|string[]} keywords
 * @returns {boolean}
 */
const codeHas = (code, keywords) => {
    const kws = Array.isArray(keywords) ? keywords : [keywords];
    return kws.some(kw => code.includes(kw));
};

/** Return the Set of node types that were net-inserted (appear more in T2). */
const insertedTypes = (ops) =>
    new Set(ops.filter(o => o.op === 'insert').map(o => o.node.type));

/** Return the Set of node types that were net-deleted (appear more in T1). */
const deletedTypes = (ops) =>
    new Set(ops.filter(o => o.op === 'delete').map(o => o.node.type));

/** Return all callee strings from inserted call_expression ops. */
const insertedCallees = (ops) =>
    ops
        .filter(o => o.op === 'insert' && o.node.type === 'call_expression' && o.node.callee)
        .map(o => o.node.callee);

/** Return all callee strings from deleted call_expression ops. */
const deletedCallees = (ops) =>
    ops
        .filter(o => o.op === 'delete' && o.node.type === 'call_expression' && o.node.callee)
        .map(o => o.node.callee);

/** Count how many loop returns are in a code string (rough estimate). */
const loopCount = (code) =>
    (code.match(/\b(for|while)\s*\(/g) || []).length;

// ─── Rule Definitions ─────────────────────────────────────────────────────────

const rules = [

    // ── Hash Maps / Dictionaries ───────────────────────────────────────────
    {
        label: 'Added HashMap',
        match: (ops, c1, c2) => {
            const MAP_KW = ['unordered_map', 'HashMap', 'defaultdict', 'TreeMap',
                            'unordered_multimap', 'LinkedHashMap'];
            const calleeHit = insertedCallees(ops).some(
                cl => MAP_KW.some(kw => cl.includes(kw))
            );
            const codeHit = !codeHas(c1, MAP_KW) && codeHas(c2, MAP_KW);
            return calleeHit || codeHit;
        },
    },
    {
        label: 'Added Set',
        match: (ops, c1, c2) => {
            const SET_KW = ['unordered_set', 'HashSet', 'set<', 'TreeSet', 'multiset<'];
            return !codeHas(c1, SET_KW) && codeHas(c2, SET_KW);
        },
    },

    // ── Stack / Queue ──────────────────────────────────────────────────────
    {
        label: 'Added Stack',
        match: (ops, c1, c2) =>
            !codeHas(c1, ['stack<', 'Stack(', 'Stack()']) &&
             codeHas(c2, ['stack<', 'Stack(', 'Stack()']),
    },
    {
        label: 'Added Queue',
        match: (ops, c1, c2) =>
            !codeHas(c1, ['queue<', 'Queue(', 'ArrayDeque', 'deque<', 'collections.deque']) &&
             codeHas(c2, ['queue<', 'Queue(', 'ArrayDeque', 'deque<', 'collections.deque']),
    },
    {
        label: 'Added Priority Queue',
        match: (ops, c1, c2) => {
            const PQ = ['priority_queue', 'PriorityQueue', 'heapq', 'heap.push'];
            return !codeHas(c1, PQ) && codeHas(c2, PQ);
        },
    },

    // ── Loop Structural Changes ────────────────────────────────────────────
    {
        label: 'Removed Nested Loop',
        match: (ops, c1, c2) => {
            const dels = ops.filter(o =>
                o.op === 'delete' &&
                ['for_statement', 'while_statement', 'do_statement'].includes(o.node.type)
            );
            return dels.length >= 1 && loopCount(c2) < loopCount(c1);
        },
    },
    {
        label: 'Added Loop',
        match: (ops, c1, c2) => {
            const ins = insertedTypes(ops);
            return (ins.has('for_statement') || ins.has('while_statement')) &&
                   loopCount(c2) > loopCount(c1);
        },
    },

    // ── Algorithm Class Changes ────────────────────────────────────────────
    {
        label: 'Recursion to Iteration',
        match: (ops, c1, c2) => {
            const ins = insertedTypes(ops);
            const del = deletedTypes(ops);
            // Lost recursive calls + gained a loop
            return del.has('call_expression') &&
                   (ins.has('while_statement') || ins.has('for_statement')) &&
                   loopCount(c2) > loopCount(c1);
        },
    },
    {
        label: 'Added Binary Search',
        match: (ops, c1, c2) => {
            const BS_KW = ['lower_bound', 'upper_bound', 'binary_search',
                           'bisect_left', 'bisect_right', 'bisect', 'Arrays.binarySearch'];
            const calleeHit = insertedCallees(ops).some(
                cl => BS_KW.some(kw => cl.includes(kw))
            );
            const codeHit = !codeHas(c1, BS_KW) && codeHas(c2, BS_KW);
            return calleeHit || codeHit;
        },
    },
    {
        label: 'Added Sorting Step',
        match: (ops, c1, c2) => {
            const SORT_KW  = ['sort(', '.sort(', 'Arrays.sort', 'sorted(', 'Collections.sort'];
            const SORT_FNS = ['sort', 'sorted', 'Arrays.sort', 'Collections.sort', 'std::sort'];
            const calleeHit = insertedCallees(ops).some(
                cl => SORT_FNS.some(fn => cl.includes(fn))
            );
            const codeHit = !codeHas(c1, SORT_KW) && codeHas(c2, SORT_KW);
            return calleeHit || codeHit;
        },
    },
    {
        label: 'Added Memoization',
        match: (ops, c1, c2) => {
            const MEMO_KW = ['dp[', 'memo[', 'cache[', '@lru_cache', '@cache', 'memo.get(', 'cache.get('];
            return !codeHas(c1, MEMO_KW) && codeHas(c2, MEMO_KW);
        },
    },
    {
        label: 'Added Dynamic Programming',
        match: (ops, c1, c2) => {
            const DP_KW = ['dp[', 'dp =', 'dp[i]', 'dp[j]', 'f[i]', 'f[j]'];
            const ins   = insertedTypes(ops);
            const del   = deletedTypes(ops);
            // Core DP pattern: added array + loop, removed recursion
            return !codeHas(c1, DP_KW) && codeHas(c2, DP_KW) &&
                   ins.has('for_statement') &&
                   (del.has('call_expression') || !codeHas(c1, DP_KW));
        },
    },
    {
        label: 'Added Two Pointers',
        match: (ops, c1, c2) =>
            !codeHas(c1, 'while') &&
             codeHas(c2, 'while') &&
            (codeHas(c2, ['left', 'lo', 'start']) && codeHas(c2, ['right', 'hi', 'end'])),
    },
    {
        label: 'Added Prefix Sum',
        match: (ops, c1, c2) => {
            const PS_KW = ['prefix', 'cumsum', 'cumulative', 'presum', 'prefix_sum',
                           'ps[', 'pre[', 'cum['];
            return !codeHas(c1, PS_KW) && codeHas(c2, PS_KW);
        },
    },
    {
        label: 'Added Sliding Window',
        match: (ops, c1, c2) => {
            const SW_KW = ['window', 'sliding', 'maxLen', 'minLen', 'windowSize', 'win_start', 'win_end'];
            return !codeHas(c1, SW_KW) && codeHas(c2, SW_KW);
        },
    },

    // ── Graph Algorithms ──────────────────────────────────────────────────
    {
        label: 'Added BFS',
        match: (ops, c1, c2) =>
            !codeHas(c1, ['bfs', 'BFS', 'queue<', 'Queue(']) &&
             codeHas(c2, ['queue<', 'Queue(', 'ArrayDeque', 'collections.deque']) &&
            (codeHas(c2, 'visited') || codeHas(c2, 'level')),
    },
    {
        label: 'Added DFS',
        match: (ops, c1, c2) =>
            !codeHas(c1, ['dfs(', 'DFS(', 'visited']) &&
             codeHas(c2, ['dfs(', 'DFS(', 'visited']) &&
             insertedTypes(ops).has('call_expression'),
    },
    {
        label: 'Added Graph Algorithm',
        match: (ops, c1, c2) => {
            const GRAPH_KW = ['adj[', 'graph[', 'adjacency', 'addEdge', 'vertex', 'vertices', 'edges.push'];
            return !codeHas(c1, GRAPH_KW) && codeHas(c2, GRAPH_KW);
        },
    },

    // ── Micro-Optimizations ───────────────────────────────────────────────
    {
        label: 'Added Early Exit',
        match: (ops, c1, c2) => {
            const ins          = insertedTypes(ops);
            const returnInC1   = (c1.match(/\breturn\b/g) || []).length;
            const returnInC2   = (c2.match(/\breturn\b/g) || []).length;
            return ins.has('return_statement') && returnInC2 > returnInC1;
        },
    },
    {
        label: 'Added Fast I/O',
        match: (ops, c1, c2) => {
            const FIO = ['ios::sync_with_stdio', 'cin.tie', 'BufferedReader', 'sys.stdin'];
            return !codeHas(c1, FIO) && codeHas(c2, FIO);
        },
    },
    {
        label: 'Added Bit Manipulation',
        match: (ops, c1, c2) => {
            const BIT_KW = ['>> ', '<< ', '& 1', '| 1', '^ 1',
                            '__builtin_popcount', 'Integer.bitCount', '>>= ', '<<= '];
            return !codeHas(c1, BIT_KW) && codeHas(c2, BIT_KW);
        },
    },
    {
        label: 'Added Greedy Approach',
        match: (ops, c1, c2) => {
            const SORT_KW = ['sort(', '.sort(', 'Arrays.sort'];
            return codeHas(c2, SORT_KW) &&
                   !codeHas(c1, SORT_KW) &&
                   insertedTypes(ops).has('for_statement');
        },
    },
    {
        label: 'Reduced Comparisons',
        match: (ops) => {
            const del = deletedTypes(ops);
            return del.has('if_statement') && !insertedTypes(ops).has('if_statement');
        },
    },

    // ── Catch-all for purely textual changes ─────────────────────────────
    {
        label: 'Minor Tweak',
        match: (ops) => ops.length === 0,
        // Fires when only literals/identifiers changed (e.g., off-by-one fix)
        // These changes are invisible to the structural TED because we anonymize IDs.
    },
];

// ─── Rule Application ─────────────────────────────────────────────────────────

/**
 * Run all rules against the ops list and optional code strings.
 * Returns an array of matched labels (may be empty or multi-label).
 *
 * @param  {Array}  ops   - extractOps output
 * @param  {string} code1 - previous code
 * @param  {string} code2 - current code
 * @returns {string[]|null} matched label list, or null if empty
 */
function applyRules(ops, code1 = '', code2 = '') {
    const matched = rules.filter(r => {
        try { return r.match(ops, code1, code2); }
        catch (e) {
            console.warn(`[Labeler] Rule "${r.label}" threw:`, e.message);
            return false;
        }
    });
    return matched.length > 0 ? matched.map(r => r.label) : null;
}

// ─── Unified label() Entry Point ──────────────────────────────────────────────

/**
 * Label a code transformation.
 *
 * Tries the rule engine first; falls back to Gemini + Redis cache.
 *
 * @param  {Array}   ops   - extractOps output from treeDiff.diff()
 * @param  {string}  code1 - previous submission code
 * @param  {string}  code2 - current submission code
 * @param  {string}  lang  - 'cpp' | 'c' | 'python' | 'java'
 * @param  {string=} hash1 - optional pre-computed hash (skips re-parsing)
 * @param  {string=} hash2 - optional pre-computed hash
 * @returns {Promise<{
 *   labels:       string[],
 *   source:       'rule' | 'gemini' | 'fallback',
 *   confidence:   number,
 *   explanation?: string
 * }>}
 */
async function label(ops, code1, code2, lang, hash1 = null, hash2 = null) {
    // ── 1. Rule engine ─────────────────────────────────────────────────────
    const ruleResult = applyRules(ops, code1, code2);
    if (ruleResult) {
        return { labels: ruleResult, source: 'rule', confidence: 1.0 };
    }

    // ── 2. Compute hashes if not given (for cache key) ─────────────────────
    if (!hash1 || !hash2) {
        try {
            const { getTokensAndHistogram } = require('../anticheat/astParser');
            const { hashCode }              = require('./utils');
            const [{ tokens: t1 }, { tokens: t2 }] = await Promise.all([
                getTokensAndHistogram(code1, lang),
                getTokensAndHistogram(code2, lang),
            ]);
            hash1 = hash1 || hashCode(t1);
            hash2 = hash2 || hashCode(t2);
        } catch {
            hash1 = hash1 || `nohash_${Date.now()}`;
            hash2 = hash2 || `nohash_${Date.now() + 1}`;
        }
    }

    // ── 3. Gemini fallback ─────────────────────────────────────────────────
    try {
        const { classifyWithCache } = require('./geminiLabeler');
        const ai = await classifyWithCache(code1, code2, lang, hash1, hash2);
        return {
            labels:      [ai.label],
            source:      'gemini',
            confidence:  ai.confidence ?? 0.7,
            explanation: ai.explanation,
        };
    } catch (e) {
        console.error('[Labeler] Gemini fallback failed:', e.message);
        return { labels: ['Unknown Change'], source: 'rule', confidence: 0 };
    }
}

module.exports = { applyRules, label, rules };
