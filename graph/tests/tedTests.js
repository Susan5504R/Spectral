'use strict';

/**
 * graph/tests/tedTests.js — Zhang-Shasha Correctness Tests
 *
 * Tests the TED algorithm with HAND-CRAFTED tree pairs — no parser,
 * no DB, no Docker required.  All expected distances are verified by hand.
 *
 * These are the critical regression tests for Phase 2.
 * A bug here would corrupt all downstream labeling and graph edges.
 *
 * Usage:
 *   node graph/tests/tedTests.js
 *
 * All tests should complete in < 100 ms.
 */

const { makeNode, buildPostorder, zhang_shasha, extractOps } = require('../treeDiff');

// ─── Test Runner ──────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
const errors = [];

function assert(condition, msg) {
    if (condition) {
        console.log(`  ✅ PASS: ${msg}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${msg}`);
        failed++;
        errors.push(msg);
    }
}

function section(title) {
    console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}`);
}

/** Compute TED between two internal trees (built with makeNode). */
function ted(t1, t2) {
    return zhang_shasha(buildPostorder(t1), buildPostorder(t2)).distance;
}

// ─── Hand-Crafted Trees ───────────────────────────────────────────────────────
//
// All trees are built with makeNode(type, children).
// Distances are computed by hand using the cost model:
//   delete = 1, insert = 1, rename = 1, match = 0

// ── A: single-node trees ─────────────────────────────────────────────────────
//   a         b
const A = makeNode('a');
const B = makeNode('b');

// ── B: two-node trees ────────────────────────────────────────────────────────
//   if              while
//   └─ condition    └─ condition
const IF_TREE    = makeNode('if_statement',    [makeNode('condition')]);
const WHILE_TREE = makeNode('while_statement', [makeNode('condition')]);

// ── C: identical small tree ──────────────────────────────────────────────────
//   for            for
//   ├─ init        ├─ init
//   ├─ cond        ├─ cond
//   └─ update      └─ update
function makeFor() {
    return makeNode('for_statement', [
        makeNode('init'),
        makeNode('condition'),
        makeNode('update'),
    ]);
}

// ── D: insert one child ──────────────────────────────────────────────────────
//   root          root
//   └─ a          ├─ a
//                 └─ b   ← inserted
const ROOT_ONE  = makeNode('root', [makeNode('a')]);
const ROOT_TWO  = makeNode('root', [makeNode('a'), makeNode('b')]);

// ── E: delete nested loop ────────────────────────────────────────────────────
//   root                 root
//   └─ for               └─ (empty)
//      └─ for  ← 2 nodes to delete
const NESTED_FOR = makeNode('root', [
    makeNode('for_statement', [
        makeNode('for_statement', [makeNode('body')]),
    ])
]);
const FLAT_ROOT  = makeNode('root', []);

// ── F: complex rename chain ──────────────────────────────────────────────────
//   Translation: swap if→while, keep child
const IF_BODY     = makeNode('if_statement',    [makeNode('body')]);
const WHILE_BODY  = makeNode('while_statement', [makeNode('body')]);

// ── G: size guard trigger ────────────────────────────────────────────────────
// Build a chain tree with 600 nodes to verify the size guard.
function makeChain(n) {
    if (n === 0) return makeNode('leaf');
    return makeNode('node', [makeChain(n - 1)]);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

section('Identity: same tree → distance 0');
assert(ted(A, A)          === 0, 'single-node tree to itself = 0');
assert(ted(makeFor(), makeFor()) === 0, '3-child for-tree identical = 0');
assert(ted(NESTED_FOR, NESTED_FOR) === 0, 'nested for identical = 0');

section('Single-node rename');
assert(ted(A, B)          === 1, 'rename "a" → "b" = 1');
assert(ted(IF_TREE, WHILE_TREE) === 1,
    'rename if_statement → while_statement (same child) = 1');
assert(ted(IF_BODY, WHILE_BODY) === 1,
    'rename if → while with one child = 1');

section('Single insert / delete');
assert(ted(makeNode('root'), makeNode('root', [makeNode('x')])) === 1,
    'insert one child into empty root = 1');
assert(ted(makeNode('root', [makeNode('x')]), makeNode('root')) === 1,
    'delete one child from root = 1');
assert(ted(ROOT_ONE, ROOT_TWO) === 1,
    'insert one sibling (a → a,b) = 1');
assert(ted(ROOT_TWO, ROOT_ONE) === 1,
    'delete one sibling (a,b → a) = 1');

section('Multi-edit operations');
// Delete nested-for (3 nodes: for, inner-for, body) + keep root = delete 3
const expectedNestedDelete = 3;
assert(ted(NESTED_FOR, FLAT_ROOT) === expectedNestedDelete,
    `delete nested 3-node for subtree = ${expectedNestedDelete}`);

// Star tree: root → [a, b, c]  vs  root → [a, b, c, d]  = 1 insert
const star3 = makeNode('R', [makeNode('a'), makeNode('b'), makeNode('c')]);
const star4 = makeNode('R', [makeNode('a'), makeNode('b'), makeNode('c'), makeNode('d')]);
assert(ted(star3, star4) === 1, 'adding one sibling to 3-child root = 1');

section('Symmetry: TED(T1,T2) == TED(T2,T1)');
assert(ted(A, B)          === ted(B, A),          'single rename is symmetric');
assert(ted(ROOT_ONE, ROOT_TWO) === ted(ROOT_TWO, ROOT_ONE),   'insert/delete symmetric');
assert(ted(NESTED_FOR, FLAT_ROOT) === ted(FLAT_ROOT, NESTED_FOR), 'multi-delete symmetric');

section('Triangle inequality: TED(T1,T3) ≤ TED(T1,T2) + TED(T2,T3)');
const d12 = ted(IF_BODY, WHILE_BODY);   // 1
const d23 = ted(WHILE_BODY, ROOT_ONE);
const d13 = ted(IF_BODY, ROOT_ONE);
assert(d13 <= d12 + d23,
    `triangle inequality: d(if_body,root_one)=${d13} ≤ ${d12}+${d23}`);

section('Size guard: tree > 500 nodes falls back to Jaccard');
// We test the size logic by checking node count on a hand-built chain.
const bigTree   = makeChain(600);
const smallTree = makeNode('leaf');
const bigNodes  = buildPostorder(bigTree);
const n         = bigNodes.length - 1;
assert(n > 500, `chain tree has ${n} nodes (> 500 threshold)`);
// The size guard is invoked in diff() — here we just verify node count.

section('extractOps: multiset diff correctness');
{
    // T1: root with [for, for]   T2: root with [for, unordered_map_call]
    // expected: 1 delete(for), 1 insert(call_expression with callee)
    const t1nodes = buildPostorder(
        makeNode('root', [makeNode('for_statement'), makeNode('for_statement')])
    );
    const t2nodes = buildPostorder(
        makeNode('root', [
            makeNode('for_statement'),
            makeNode('call_expression', [], { callee: 'unordered_map' }),
        ])
    );
    const ops = extractOps(t1nodes, t2nodes);
    const deletes = ops.filter(o => o.op === 'delete');
    const inserts = ops.filter(o => o.op === 'insert');

    assert(deletes.length === 1 && deletes[0].node.type === 'for_statement',
        'extractOps: delete for_statement detected');
    assert(inserts.length === 1 && inserts[0].node.type === 'call_expression',
        'extractOps: insert call_expression detected');
    assert(inserts[0].node.callee === 'unordered_map',
        'extractOps: callee "unordered_map" preserved on insert');
}

section('extractOps: identical trees → no ops');
{
    const nodes = buildPostorder(makeFor());
    const ops   = extractOps(nodes, nodes);
    assert(ops.length === 0, 'identical trees → 0 ops');
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════════════');
console.log(`  Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  🎉  Phase 2 TED Tests COMPLETE                                  ║
║                                                                  ║
║  Zhang-Shasha implementation is correct:                         ║
║    ✓ Identity, rename, insert, delete distances                  ║
║    ✓ Multi-edit operations                                       ║
║    ✓ Symmetry and triangle inequality                            ║
║    ✓ extractOps multiset diff (with callee enrichment)           ║
║                                                                  ║
║  Next step: Phase 3 — Transformation Labeling Engine             ║
╚══════════════════════════════════════════════════════════════════╝
`);
} else {
    console.log('\n  ⚠️  Failed tests:');
    errors.forEach(e => console.log(`     • ${e}`));
}

process.exit(failed > 0 ? 1 : 0);
