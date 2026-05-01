'use strict';

/**
 * graph/tests/phase1_verify.js — Phase 1 End-to-End Verification
 *
 * Tests the entire Phase 1 stack in order:
 *   1. AGE health check  — spectral_graph exists in ag_catalog
 *   2. CREATE node       — creates a CodeState vertex
 *   3. MATCH node        — retrieves the vertex by hash
 *   4. Second node       — creates a second CodeState vertex
 *   5. CREATE edge       — connects the two with a TRANSFORMED edge
 *   6. Query edge        — verifies edge persists and is queryable
 *   7. MERGE idempotency — same hash → same node (deduplication)
 *   8. Cleanup           — removes all test data
 *
 * Usage:
 *   node graph/tests/phase1_verify.js
 *
 * Expected output: 8 PASS lines and the final "Phase 1 COMPLETE" banner.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { cypher, rawQuery, healthCheck, pool } = require('../client');

// ─── Test Runner ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
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
    console.log(`\nTest ${passed + failed + 1}: ${title}`);
}

// ─── Unique test run prefix (prevents collisions across parallel runs) ────────
const RUN_ID = `verify_${Date.now()}`;

// ─── Tests ────────────────────────────────────────────────────────────────────

async function run() {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  Phase 1 Verification — AST Evolution Graph       ║');
    console.log('╚══════════════════════════════════════════════════╝');

    // ── Test 1: AGE Health Check ──────────────────────────────────────────────
    section('AGE Health Check');
    try {
        await healthCheck();
        assert(true, 'spectral_graph exists in ag_catalog.ag_graph');
    } catch (e) {
        assert(false, `Health check failed: ${e.message}`);
        console.error('\nCannot continue without a healthy graph. Exiting.');
        await pool.end();
        process.exit(1);
    }

    // ── Test 2: Create a CodeState node ──────────────────────────────────────
    section('CREATE CodeState node');
    const hashA = `${RUN_ID}_a`;
    try {
        await cypher(`
            CREATE (n:CodeState {
                hash:          '${hashA}',
                submissionId:  'test-sub-001',
                problemId:     'p_test',
                language:      'cpp',
                complexity:    'O(N^2)',
                tokenCount:    42,
                accepted:      false,
                schemaVersion: 1
            })
            RETURN n
        `);
        assert(true, 'CREATE node executed without error');
    } catch (e) {
        assert(false, `CREATE node failed: ${e.message}`);
    }

    // ── Test 3: MATCH the created node ───────────────────────────────────────
    section('MATCH CodeState by hash');
    try {
        const rows = await cypher(`
            MATCH (n:CodeState {hash: '${hashA}'})
            RETURN n
        `);
        assert(rows.length === 1, `Exactly 1 node found (found ${rows.length})`);
        assert(rows[0].n !== undefined, 'Row has expected "n" column');
    } catch (e) {
        assert(false, `MATCH failed: ${e.message}`);
    }

    // ── Test 4: Create second CodeState node ─────────────────────────────────
    section('CREATE second CodeState node (accepted=true)');
    const hashB = `${RUN_ID}_b`;
    try {
        await cypher(`
            CREATE (n:CodeState {
                hash:          '${hashB}',
                submissionId:  'test-sub-002',
                problemId:     'p_test',
                language:      'cpp',
                complexity:    'O(N)',
                tokenCount:    38,
                accepted:      true,
                schemaVersion: 1
            })
            RETURN n
        `);
        assert(true, 'Second CodeState node created');
    } catch (e) {
        assert(false, `CREATE second node failed: ${e.message}`);
    }

    // ── Test 5: Create TRANSFORMED edge ──────────────────────────────────────
    section('CREATE TRANSFORMED edge between the two nodes');
    try {
        const rows = await cypher(`
            MATCH (a:CodeState {hash: '${hashA}'}), (b:CodeState {hash: '${hashB}'})
            CREATE (a)-[e:TRANSFORMED {
                userId:          'test-user-uuid',
                timestamp:       ${Date.now()},
                label:           'Added Binary Search',
                distance:        3,
                jaccardDelta:    0.12,
                complexityDelta: -1,
                confidence:      1.0,
                labelSource:     'rule'
            }]->(b)
            RETURN e
        `);
        assert(rows.length === 1, 'Edge created and returned');
    } catch (e) {
        assert(false, `CREATE edge failed: ${e.message}`);
    }

    // ── Test 6: Query the edge ────────────────────────────────────────────────
    section('MATCH edge between the two nodes');
    try {
        const rows = await cypher(`
            MATCH (a:CodeState {hash: '${hashA}'})-[e:TRANSFORMED]->(b:CodeState {hash: '${hashB}'})
            RETURN a, e, b
        `);
        assert(rows.length === 1,             `Found 1 edge path (found ${rows.length})`);
        assert(rows[0].a !== undefined,       'Column "a" present');
        assert(rows[0].e !== undefined,       'Column "e" present');
        assert(rows[0].b !== undefined,       'Column "b" present');
    } catch (e) {
        assert(false, `Edge MATCH failed: ${e.message}`);
    }

    // ── Test 7: MERGE idempotency ─────────────────────────────────────────────
    section('MERGE idempotency — same hash must not duplicate nodes');
    try {
        // MERGE the same hash 3 times
        await cypher(`MERGE (n:CodeState {hash: '${hashA}'}) RETURN n`);
        await cypher(`MERGE (n:CodeState {hash: '${hashA}'}) RETURN n`);
        await cypher(`MERGE (n:CodeState {hash: '${hashA}'}) RETURN n`);

        const rows = await cypher(`
            MATCH (n:CodeState {hash: '${hashA}'})
            RETURN n
        `);
        assert(
            rows.length === 1,
            `Only 1 node after 3× MERGE on same hash (found ${rows.length})`
        );
    } catch (e) {
        assert(false, `MERGE idempotency test failed: ${e.message}`);
    }

    // ── Test 8: Cleanup ──────────────────────────────────────────────────────
    section('Cleanup test data (DETACH DELETE)');
    try {
        // Delete by specific hashes (safest — no STARTS WITH ambiguity)
        await cypher(`
            MATCH (n:CodeState {hash: '${hashA}'})
            DETACH DELETE n
        `);
        await cypher(`
            MATCH (n:CodeState {hash: '${hashB}'})
            DETACH DELETE n
        `);

        const remaining = await cypher(`
            MATCH (n:CodeState {problemId: 'p_test'})
            RETURN n
        `);
        assert(
            remaining.length === 0,
            `All test nodes cleaned up (${remaining.length} remaining)`
        );
    } catch (e) {
        assert(false, `Cleanup failed: ${e.message}`);
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════════════');
    console.log(`  Results: ${passed} passed, ${failed} failed`);

    if (failed === 0) {
        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  🎉  Phase 1 COMPLETE                                            ║
║                                                                  ║
║  Apache AGE is running inside your Postgres container.           ║
║  You can CREATE nodes, CREATE edges, and MATCH them back.        ║
║  MERGE deduplication works correctly.                            ║
║                                                                  ║
║  Next step: Phase 2 — Zhang-Shasha AST Diffing Engine            ║
╚══════════════════════════════════════════════════════════════════╝
`);
    } else {
        console.log('\n  ⚠️  Failed tests:');
        errors.forEach(e => console.log(`     • ${e}`));
        console.log('\n  Check the error messages above for details.\n');
    }

    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => {
    console.error('\n[Verify] Script crashed:', e.message);
    console.error(e.stack);
    pool.end().catch(() => {});
    process.exit(1);
});
