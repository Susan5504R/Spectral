'use strict';

/**
 * graph/utils.js — Shared utilities for the AST Evolution Graph
 *
 * hashCode()             - SHA-256 of a normalized token array → 16-char hex
 * complexityToExponent() - 'O(N^2)' → 2, used for complexityDelta on edges
 */

const crypto = require('crypto');

// ─── Code State Hashing ───────────────────────────────────────────────────────

/**
 * Compute a stable 16-char hash from a normalized token array.
 *
 * Key property: identical code submissions (after normalization) produce the
 * SAME hash → MERGE deduplication in the graph works automatically.
 * Normalization is done by anticheat/astParser.js (identifiers → 'ID', etc.)
 *
 * The 16-char prefix of SHA-256 gives ~64 bits of collision resistance —
 * more than sufficient for typical OJ submission volumes.
 *
 * @param  {string[]} tokens - Normalized token array from getTokensAndHistogram()
 * @returns {string}           16-character hex string
 *
 * @example
 *   const { tokens } = await getTokensAndHistogram(code, 'cpp');
 *   const hash = hashCode(tokens);
 *   // '3f8a1d72c9b04e55'
 */
function hashCode(tokens) {
    return crypto
        .createHash('sha256')
        .update(tokens.join('|'))
        .digest('hex')
        .slice(0, 16);
}

// ─── Complexity Estimation Helpers ────────────────────────────────────────────

/**
 * Convert a Big-O complexity string to a numeric exponent.
 * Used to compute complexityDelta on TRANSFORMED edges.
 *
 * 'O(1)'    → 0
 * 'O(N)'    → 1
 * 'O(N^2)'  → 2
 * 'O(N^3)'  → 3
 * 'O(N^k)'  → k
 *
 * @param  {string} complexityStr - e.g. 'O(N^2)', 'O(N)', 'O(1)'
 * @returns {number}               numeric exponent
 */
function complexityToExponent(complexityStr) {
    if (!complexityStr) return 0;
    if (complexityStr === 'O(1)') return 0;
    if (complexityStr === 'O(N)') return 1;
    const match = complexityStr.match(/O\(N\^(\d+)\)/);
    if (match) return parseInt(match[1], 10);
    return 0; // unknown: treat as constant
}

module.exports = { hashCode, complexityToExponent };
