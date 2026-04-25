'use strict';

/**
 * graph/complexity.js — AST-Based Complexity Estimation
 *
 * Sub-Phase 3.3: Estimate Big-O complexity from the internal tree structure.
 *
 * This is intentionally a HEURISTIC — not a theorem prover.
 * The goal is a useful approximation for the complexityDelta edge property.
 *
 * Strategy:
 *   • Count maximum loop nesting depth → O(N^k)
 *   • Detect likely recursion by finding function definitions where
 *     the same callee appears 2+ times (e.g. fib(n-1) + fib(n-2))
 *   • If recursive, override with O(2^N) (worst-case assumption)
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const LOOP_TYPES = new Set([
    'for_statement',
    'while_statement',
    'do_statement',
    'for_in_statement',       // Python / JS
    'for_of_statement',       // JS
    'foreach_statement',      // some grammars
    'enhanced_for_statement', // Java
]);

const FUNCTION_DEF_TYPES = new Set([
    'function_definition',    // C/C++/Python
    'function_declaration',   // TypeScript-style
    'method_definition',      // JS class methods
    'method_declaration',     // Java
    'def_statement',          // some Python grammars
]);

// ─── Loop Nesting Estimator ───────────────────────────────────────────────────

/**
 * Walk the internal tree and track the maximum depth of nested loops.
 * Returns the maximum loop nesting level encountered.
 *
 * @param  {object} treeRoot - internal tree root (from fromTreeSitter / makeNode)
 * @returns {number}           max nesting depth (0 = no loops)
 */
function maxLoopNesting(treeRoot) {
    let maxDepth = 0;
    let cur      = 0;

    function walk(n) {
        const isLoop = LOOP_TYPES.has(n.type);
        if (isLoop) cur++;
        if (cur > maxDepth) maxDepth = cur;
        for (const c of n.children) walk(c);
        if (isLoop) cur--;
    }

    walk(treeRoot);
    return maxDepth;
}

// ─── Recursion Detection ──────────────────────────────────────────────────────

/**
 * Heuristic: a function definition is considered recursive if any callee
 * appears 2+ times in its body (e.g. fib(n-1) + fib(n-2)).
 *
 * This avoids name-matching (which requires un-anonymized identifiers) and
 * instead relies on call duplication — a strong signal for mutual recursion
 * and divide-and-conquer patterns.
 *
 * @param  {object} treeRoot - internal tree root
 * @returns {boolean}          true if any function looks recursive
 */
function detectsRecursion(treeRoot) {
    let found = false;

    function checkFunction(funcNode) {
        if (found) return; // short-circuit
        const calleeCounts = new Map();

        function walkBody(n) {
            if (n.type === 'call_expression' && n.callee) {
                calleeCounts.set(n.callee, (calleeCounts.get(n.callee) || 0) + 1);
            }
            // Don't recurse into nested function definitions
            if (n !== funcNode && FUNCTION_DEF_TYPES.has(n.type)) return;
            for (const c of n.children) walkBody(c);
        }

        walkBody(funcNode);

        for (const cnt of calleeCounts.values()) {
            if (cnt >= 2) { found = true; return; }
        }
    }

    function walk(n) {
        if (FUNCTION_DEF_TYPES.has(n.type)) checkFunction(n);
        for (const c of n.children) walk(c);
    }

    walk(treeRoot);
    return found;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Estimate the Big-O complexity of a program from its AST.
 *
 * @param  {object} treeRoot - internal tree root (from fromTreeSitter / makeNode)
 * @returns {string}           e.g. 'O(1)', 'O(N)', 'O(N^2)', 'O(2^N)'
 *
 * @example
 *   const root = fromTreeSitter(tree.rootNode);
 *   estimateComplexity(root); // → 'O(N^2)' for a bubble sort
 */
function estimateComplexity(treeRoot) {
    // Recursion check first — overrides loop count if triggered
    if (detectsRecursion(treeRoot)) return 'O(2^N)';

    const depth = maxLoopNesting(treeRoot);
    if (depth === 0) return 'O(1)';
    if (depth === 1) return 'O(N)';
    return `O(N^${depth})`;
}

/**
 * Convert a complexity string to its numeric exponent.
 * O(1)→0, O(N)→1, O(N^2)→2, O(2^N)→99 (sentinel for exponential)
 *
 * @param  {string} s - complexity string
 * @returns {number}
 */
function complexityExponent(s) {
    if (!s || s === 'O(1)')  return 0;
    if (s === 'O(N)')        return 1;
    if (s === 'O(2^N)')      return 99; // sentinel
    const m = s.match(/O\(N\^(\d+)\)/);
    if (m) return parseInt(m[1], 10);
    return 0;
}

/**
 * Compute the delta between two complexity strings.
 * complexityDelta = exponent(new) − exponent(old)
 * Negative means improvement (O(N²) → O(N) = −1).
 *
 * @param  {string} oldComplexity - e.g. 'O(N^2)'
 * @param  {string} newComplexity - e.g. 'O(N)'
 * @returns {number}                delta (negative = improved)
 */
function complexityDelta(oldComplexity, newComplexity) {
    return complexityExponent(newComplexity) - complexityExponent(oldComplexity);
}

module.exports = { estimateComplexity, detectsRecursion, complexityDelta, complexityExponent };
