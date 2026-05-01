'use strict';

/**
 * graph/client.js — Apache AGE Cypher Client
 *
 * Provides two public functions:
 *   cypher(query, params?)  — execute a Cypher query via AGE's SQL interface
 *   rawQuery(sql, params?)  — execute raw SQL with AGE session setup applied
 *
 * Key design decisions:
 *   - Column aliases for the cypher() SQL function are AUTO-DERIVED from
 *     the RETURN clause, so callers never have to specify them manually.
 *   - AGE requires LOAD 'age' + SET search_path on every new connection.
 *     setupConnection() handles this and is called internally by both helpers.
 *   - Uses the same pg.Pool port logic as db.js:
 *       localhost/127.0.0.1 → port 5433 (Docker-published)
 *       any other host (e.g. 'db') → port 5432 (Docker internal)
 */

const { Pool } = require('pg');

// ─── Connection Pool ─────────────────────────────────────────────────────────

const dbHost = process.env.DB_HOST || '127.0.0.1';
const defaultPort = (dbHost === '127.0.0.1' || dbHost === 'localhost') ? 5433 : 5432;

const pool = new Pool({
    host:     dbHost,
    user:     process.env.POSTGRES_USER     || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'mysecretpassword',
    database: process.env.POSTGRES_DB       || 'postgres',
    port:     Number(process.env.DB_PORT    || defaultPort),
    max:      10,   // max pool size
    idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
    console.error('[GraphClient] Idle pool client error:', err.message);
});

// ─── Per-Connection AGE Setup ────────────────────────────────────────────────

/**
 * Every Postgres connection that runs AGE queries must:
 *   1. LOAD 'age'  — loads the .so into the session (no-op if already loaded)
 *   2. SET search_path — makes ag_catalog functions available unqualified
 *
 * This is called on every acquired client before executing any query.
 */
async function setupConnection(client) {
    await client.query("LOAD 'age';");
    await client.query("SET search_path = ag_catalog, \"$user\", public;");
}

// ─── Column Spec Auto-Derivation ─────────────────────────────────────────────

/**
 * Split a string by a delimiter character, ignoring delimiters inside
 * parentheses, brackets, or braces. Used to split RETURN clause items.
 */
function splitTopLevel(str, delim = ',') {
    const items = [];
    let depth = 0;
    let current = '';
    for (const ch of str) {
        if ('([{'.includes(ch)) depth++;
        else if (')]}'.includes(ch)) depth--;
        else if (ch === delim && depth === 0) {
            const trimmed = current.trim();
            if (trimmed) items.push(trimmed);
            current = '';
            continue;
        }
        current += ch;
    }
    const trimmed = current.trim();
    if (trimmed) items.push(trimmed);
    return items;
}

/**
 * Derive the AGE column-alias spec string from a Cypher query.
 *
 * AGE's SQL function signature is:
 *   cypher('graph', $$ QUERY $$) AS (col1 agtype, col2 agtype, ...)
 *
 * The number of column aliases MUST match the number of items in the
 * Cypher RETURN clause.  This function parses the RETURN clause and
 * builds the correct spec automatically.
 *
 * For DML without RETURN (CREATE / MERGE / DELETE), AGE still requires
 * a column spec syntactically, but returns 0 rows — so "result agtype"
 * is used as a harmless dummy.
 */
function buildColumnSpec(query) {
    // Match RETURN clause up to ORDER BY / LIMIT / SKIP / UNION / end of string
    const returnMatch = query.match(
        /\bRETURN\b\s+([\s\S]+?)(?=\s*\b(?:ORDER\s+BY|LIMIT|SKIP|UNION)\b|\s*$)/i
    );

    if (!returnMatch) {
        // No RETURN clause — DML statement; dummy spec required by AGE syntax
        return 'result agtype';
    }

    const returnClause = returnMatch[1].trim();
    const items = splitTopLevel(returnClause);

    const cols = items.map((item, i) => {
        // Explicit alias:  expr AS alias
        const asMatch = item.match(/\bAS\s+(\w+)\s*$/i);
        if (asMatch) return `"${asMatch[1]}" agtype`;

        // No alias — use the rightmost identifier in the expression
        // e.g. "e.userId" → "userId", "count(*)" → "col0", "path" → "path"
        const identMatch = item.trim().match(/(\w+)\s*$/);;
        if (identMatch) return `"${identMatch[1]}" agtype`;

        return `col${i} agtype`;
    });

    return cols.join(', ');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Execute a Cypher query against spectral_graph.
 *
 * The column alias spec for the SQL wrapper is auto-derived from the
 * query's RETURN clause, so callers write plain Cypher.
 *
 * @param  {string}   query  - Cypher query (no $$ delimiters needed)
 * @param  {Array}    params - Positional SQL params (rarely needed for Cypher)
 * @returns {Promise<object[]>} Array of row objects keyed by return alias
 *
 * @example
 *   const rows = await cypher(`MATCH (n:CodeState {hash: 'abc'}) RETURN n`);
 *   // rows[0].n  is the agtype-serialized vertex
 */
async function cypher(query, params = []) {
    const client = await pool.connect();
    try {
        await setupConnection(client);
        const colSpec = buildColumnSpec(query);
        const sql = `SELECT * FROM cypher('spectral_graph', $$ ${query} $$) AS (${colSpec});`;
        const res = await client.query(sql, params);
        return res.rows;
    } finally {
        client.release();
    }
}

/**
 * Execute a raw SQL statement with the AGE session context applied.
 * Used for DDL (CREATE INDEX, create_vlabel, etc.) and non-Cypher queries.
 *
 * @param  {string}   sql    - Raw SQL
 * @param  {Array}    params - Positional params
 * @returns {Promise<object[]>}
 */
async function rawQuery(sql, params = []) {
    const client = await pool.connect();
    try {
        await setupConnection(client);
        const res = await client.query(sql, params);
        return res.rows;
    } finally {
        client.release();
    }
}

/**
 * Verify AGE is running and spectral_graph exists.
 * Throws on failure so callers can fail-fast at startup.
 *
 * @returns {Promise<true>}
 */
async function healthCheck() {
    const rows = await rawQuery(
        "SELECT name FROM ag_catalog.ag_graph WHERE name = 'spectral_graph';"
    );
    if (rows.length === 0) {
        throw new Error(
            "spectral_graph not found in ag_catalog.ag_graph. " +
            "Did the DB init script run? Try: docker-compose down -v && docker-compose up --build"
        );
    }
    return true;
}

module.exports = { pool, cypher, rawQuery, setupConnection, healthCheck };
