'use strict';

/**
 * graph/schema.js — One-time Graph Schema Setup
 *
 * Creates vertex/edge labels and indexes for the spectral_graph.
 * Safe to re-run — all operations are idempotent (errors on duplicates
 * are caught and logged, not re-thrown).
 *
 * Usage:
 *   node graph/schema.js
 *
 * Run this ONCE after the DB container is healthy and AGE is enabled.
 * The Docker init script (init/01_age.sql) handles the CREATE EXTENSION
 * and create_graph; this script adds labels and indexes on top.
 *
 * ── Graph Schema ─────────────────────────────────────────────────────────────
 *
 * Vertex: CodeState
 *   hash          (string)  SHA-256 of normalized token array (16-char hex)
 *                           ← INDEXED — primary lookup key
 *   submissionId  (string)  UUID of the source submission
 *   problemId     (string)  Problem identifier ← INDEXED
 *   language      (string)  'cpp' | 'c' | 'python' | 'java'
 *   complexity    (string)  Estimated Big-O, e.g. 'O(N^2)'
 *   tokenCount    (int)     Number of tokens in the normalized representation
 *   accepted      (bool)    true = this state led to a final Accepted verdict
 *   schemaVersion (int)     Normalization version (for safe hash migrations)
 *
 * Edge: TRANSFORMED
 *   userId          (string)  UUID of the submitting user ← INDEXED
 *   timestamp       (int)     Unix epoch ms
 *   label           (string)  e.g. 'Added HashMap, Removed Nested Loop'
 *   distance        (int)     Zhang-Shasha tree edit distance
 *   jaccardDelta    (float)   Δ Jaccard similarity vs previous submission
 *   complexityDelta (int)     Exponent delta: O(N²)→O(N) = -1
 *   confidence      (float)   1.0 = rule engine, < 1.0 = Gemini
 *   labelSource     (string)  'rule' | 'gemini'
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { pool, rawQuery } = require('./client');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Run a SQL statement that is expected to fail with a
 * "already exists" or "duplicate" error when re-run.
 * Those errors are swallowed; anything else is re-thrown.
 */
async function idempotentSQL(sql, successMsg, skipMsg) {
    try {
        await rawQuery(sql);
        console.log(`  ✅ ${successMsg}`);
    } catch (e) {
        const msg = e.message.toLowerCase();
        if (msg.includes('already exists') || msg.includes('duplicate') || msg.includes('42710')) {
            console.log(`  ⏭  ${skipMsg}`);
        } else {
            throw e;
        }
    }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

async function setup() {
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║  Spectral — Graph Schema Setup                ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    // ── Step 1: Vertex label — CodeState ─────────────────────────────────────
    console.log('Step 1: Creating vertex label "CodeState"...');
    await idempotentSQL(
        `SELECT ag_catalog.create_vlabel('spectral_graph', 'CodeState')`,
        'Vertex label CodeState created',
        'Vertex label CodeState already exists — skipping'
    );

    // ── Step 2: Edge label — TRANSFORMED ─────────────────────────────────────
    console.log('\nStep 2: Creating edge label "TRANSFORMED"...');
    await idempotentSQL(
        `SELECT ag_catalog.create_elabel('spectral_graph', 'TRANSFORMED')`,
        'Edge label TRANSFORMED created',
        'Edge label TRANSFORMED already exists — skipping'
    );

    // ── Step 3: Indexes ───────────────────────────────────────────────────────
    // AGE stores node/edge properties as 'agtype' (a JSONB superset) in the
    // `properties` column of each label's PostgreSQL table.
    //
    // GIN indexes on the properties column let Postgres efficiently evaluate
    // property predicates that AGE pushes down from Cypher WHERE clauses.
    //
    // Label table location: <graph_name>."<LabelName>"
    // i.e.  spectral_graph."CodeState"  and  spectral_graph."TRANSFORMED"
    console.log('\nStep 3: Creating indexes...');

    const indexes = [
        // ── CodeState vertex indexes ─────────────────────────────────────────
        {
            name:  'idx_codestate_props_gin',
            sql:   `CREATE INDEX IF NOT EXISTS idx_codestate_props_gin
                    ON spectral_graph."CodeState" USING GIN (properties)`,
            label: 'GIN index on CodeState.properties (covers all property lookups)'
        },
        // ── TRANSFORMED edge indexes ─────────────────────────────────────────
        {
            name:  'idx_transformed_props_gin',
            sql:   `CREATE INDEX IF NOT EXISTS idx_transformed_props_gin
                    ON spectral_graph."TRANSFORMED" USING GIN (properties)`,
            label: 'GIN index on TRANSFORMED.properties (covers userId, label, etc.)'
        },
    ];

    for (const idx of indexes) {
        try {
            await rawQuery(idx.sql);
            console.log(`  ✅ ${idx.label}`);
        } catch (e) {
            // IF EXISTS makes these idempotent, but log any unexpected errors
            console.error(`  ⚠️  Index ${idx.name} warning: ${e.message}`);
        }
    }

    // ── Step 4: Summary ───────────────────────────────────────────────────────
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  Graph Schema Ready                                              ║
╠══════════════════════════════════════════════════════════════════╣
║  Vertex: CodeState                                               ║
║    hash, submissionId, problemId, language, complexity,          ║
║    tokenCount, accepted, schemaVersion                           ║
║                                                                  ║
║  Edge:   TRANSFORMED                                             ║
║    userId, timestamp, label, distance, jaccardDelta,             ║
║    complexityDelta, confidence, labelSource                      ║
║                                                                  ║
║  Indexes: GIN on CodeState.properties                            ║
║           GIN on TRANSFORMED.properties                          ║
╠══════════════════════════════════════════════════════════════════╣
║  Next: node graph/tests/phase1_verify.js                         ║
╚══════════════════════════════════════════════════════════════════╝
`);

    await pool.end();
}

setup().catch(e => {
    console.error('\n[Schema] FATAL:', e.message);
    console.error('[Schema] Make sure the DB container is healthy and AGE is enabled.');
    console.error('[Schema] Try: docker exec spectral-db psql -U postgres -c "SELECT * FROM ag_catalog.ag_graph;"');
    pool.end().catch(() => {});
    process.exit(1);
});
