'use strict';

/**
 * graph/geminiLabeler.js — Gemini AI Fallback Transformation Classifier
 *
 * Called by the rule engine (graph/labeler.js) when no rule matches.
 * Results are cached in Redis (key: label:{hash1}:{hash2}, TTL 24h) to
 * prevent repeated Gemini calls for the same code pair.
 *
 * ── Failure modes handled ─────────────────────────────────────────────────────
 *   • Redis unavailable: classify without caching (warm operation still works)
 *   • Gemini rate-limited / down: caller receives { label:'Unknown Change', confidence:0 }
 *   • Malformed JSON from Gemini: regex extraction fallback, then graceful default
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Redis = require('ioredis');

// ─── Lazy Singletons ─────────────────────────────────────────────────────────

let _model = null;
let _redis = null;

function getModel() {
    if (!_model) {
        const key = process.env.GEMINI_API_KEY;
        if (!key) throw new Error('[GeminiLabeler] GEMINI_API_KEY is not set');
        const genai = new GoogleGenerativeAI(key);
        _model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }
    return _model;
}

function getRedis() {
    if (!_redis) {
        _redis = new Redis({
            host:               process.env.REDIS_HOST || '127.0.0.1',
            port:               parseInt(process.env.REDIS_PORT || '6379', 10),
            lazyConnect:        true,
            enableOfflineQueue: false,
            connectTimeout:     3000,
        });
        _redis.on('error', e =>
            console.warn('[GeminiLabeler] Redis unavailable:', e.message, '— caching bypassed')
        );
    }
    return _redis;
}

// ─── Cache Helpers ─────────────────────────────────────────────────────────

const CACHE_TTL_S = 24 * 60 * 60; // 24 hours

async function getCached(key) {
    try {
        const v = await getRedis().get(key);
        return v ? JSON.parse(v) : null;
    } catch {
        return null; // Redis miss / unavailable
    }
}

async function setCached(key, value) {
    try {
        await getRedis().set(key, JSON.stringify(value), 'EX', CACHE_TTL_S);
    } catch { /* non-fatal cache write failure */ }
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(code1, code2, lang) {
    // Clamp to 2 000 chars each to stay within token budget
    const c1 = code1.slice(0, 2000);
    const c2 = code2.slice(0, 2000);

    return `\
You are analyzing two ${lang} submissions for the same competitive programming problem.
A user rewrote their solution. Identify what algorithmic/structural transformation happened.

BEFORE:
\`\`\`${lang}
${c1}
\`\`\`

AFTER:
\`\`\`${lang}
${c2}
\`\`\`

Respond ONLY with a single valid JSON object (no markdown fences, no text outside the JSON):
{
  "label": "<concise transformation name, max 5 words>",
  "confidence": <float between 0.0 and 1.0>,
  "explanation": "<one sentence describing what changed algorithmically>"
}

Good label examples:
  "Added HashMap", "Removed Nested Loop", "Recursion to DP",
  "Added Binary Search", "Two Pointer Approach", "Added Greedy Strategy",
  "Added Prefix Sum", "Added Memoization", "Switched to BFS", "Minor Bug Fix"`.trim();
}

// ─── Core Classifier ─────────────────────────────────────────────────────────

/**
 * Call Gemini Flash to classify the transformation.
 *
 * @param  {string} code1 - previous submission code
 * @param  {string} code2 - current submission code
 * @param  {string} lang  - 'cpp' | 'c' | 'python' | 'java'
 * @returns {Promise<{ label: string, confidence: number, explanation: string }>}
 */
async function classifyTransformation(code1, code2, lang) {
    const prompt = buildPrompt(code1, code2, lang);

    let raw;
    try {
        const res = await getModel().generateContent(prompt);
        raw = res.response.text().replace(/```json|```/g, '').trim();
    } catch (e) {
        throw new Error(`[GeminiLabeler] Gemini API error: ${e.message}`);
    }

    // Happy path: direct JSON parse
    try {
        return JSON.parse(raw);
    } catch { /* fall through to regex recovery */ }

    // Recovery: extract first {...} block from prose response
    const match = raw.match(/\{[\s\S]+?\}/);
    if (match) {
        try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }

    // Last resort: return a low-confidence default
    return {
        label:       'Unknown Change',
        confidence:  0.3,
        explanation: raw.slice(0, 200),
    };
}

// ─── Cached Wrapper (primary entry point) ─────────────────────────────────────

/**
 * Classify with Redis cache.
 * Cache key: `label:{hash1}:{hash2}`   TTL: 24 h
 *
 * Call this from labeler.js instead of classifyTransformation() directly.
 *
 * @param  {string} code1  - previous code
 * @param  {string} code2  - current code
 * @param  {string} lang   - language
 * @param  {string} hash1  - hashCode(tokens1) — used as cache key dimension
 * @param  {string} hash2  - hashCode(tokens2)
 * @returns {Promise<{ label, confidence, explanation, fromCache? }>}
 */
async function classifyWithCache(code1, code2, lang, hash1, hash2) {
    const cacheKey = `label:${hash1}:${hash2}`;

    const cached = await getCached(cacheKey);
    if (cached) {
        console.log(`[GeminiLabeler] Cache hit  ${cacheKey}`);
        return { ...cached, fromCache: true };
    }

    console.log(`[GeminiLabeler] Calling Gemini — ${lang} pair ${hash1}→${hash2}`);
    const result = await classifyTransformation(code1, code2, lang);
    await setCached(cacheKey, result);
    return result;
}

module.exports = { classifyTransformation, classifyWithCache };
