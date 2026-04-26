'use strict';

/**
 * evolution_worker.js — Background Worker for the AST Evolution Graph
 *
 * Subscribes to the "evolution-graph" BullMQ queue.
 * For every valid submission (usually Success, but we can graph all compilable states):
 *   1. Fetches current submission (S) and the user's previous valid submission (P).
 *   2. Extracts/hashes tokens via astParser and ensures CodeState vertices exist.
 *   3. If P exists and structurally differs from S:
 *        a. diff(P, S)   → TED distance + operations
 *        b. label(ops)   → Algorithmic label(s) via rules or Gemini
 *        c. comp(P→S)    → Big-O complexity delta
 *        d. MERGE edge   → (P)-[TRANSFORMED]->(S) in Apache AGE
 *        e. SQL          → Cache in TransformationLabels
 */

const { Worker }          = require('bullmq');
const { Op }              = require('sequelize');
const { Submission, TransformationLabel } = require('./db');

const { getTokensAndHistogram, parseToTree } = require('./anticheat/astParser');
const { diff }                               = require('./graph/treeDiff');
const { label }                              = require('./graph/labeler');
const { estimateComplexity, complexityDelta } = require('./graph/complexity');
const { hashCode }                           = require('./graph/utils');
const { fromTreeSitter }                     = require('./graph/treeDiff');
const graphClient                            = require('./graph/client');

// ─── Constants & Setup ────────────────────────────────────────────────────────

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

// Only attempt graph tracking for these states (avoids garbage syntax-error trees)
const VALID_STATES = ['success', 'Wrong Answer', 'Time Limit Exceeded', 'Runtime Error'];

// ─── Graph Upsert Helpers ─────────────────────────────────────────────────────

/**
 * Ensure a CodeState vertex exists in AGE.
 * Vertices are deduplicated by hash (computed from normalized AST tokens).
 * @param {string} hash
 * @param {string} code
 * @param {string} lang
 * @param {string} complexity (e.g. 'O(N^2)')
 * @param {string} problemId
 * @param {boolean} isAccepted
 */
async function ensureVertex(hash, code, lang, complexity, problemId, isAccepted = false) {
    const acceptedSetter = isAccepted ? `, n.accepted = true` : ``;
    const cypher = `
        MERGE (n:CodeState { id: '${hash}_${problemId}' })
        SET n.code = ${JSON.stringify(code)}, n.language = '${lang}', n.complexity = '${complexity}', n.problemId = '${problemId}'${acceptedSetter}
    `;
    await graphClient.cypher(cypher);
}

/**
 * Upsert a TRANSFORMED edge in AGE. Multiple labels are recorded as an array.
 */
async function upsertEdge(fromHash, toHash, distance, jaccard, labels, source, compDelta, problemId) {
    // Fallback source if somehow missing from labeling engine
    const _source = source || 'rule';
    const _labels = (labels && labels.length > 0) ? labels : ['Minor Tweak'];
    const _weight = distance === null ? 1 : Math.max(1, distance);

    const cypher = `
        MATCH (a:CodeState { id: '${fromHash}_${problemId}' })
        MATCH (b:CodeState { id: '${toHash}_${problemId}' })
        MERGE (a)-[r:TRANSFORMED]->(b)
        SET r.distance = ${distance ?? -1},
            r.jaccard = ${jaccard ?? 1.0},
            r.labels = ${JSON.stringify(_labels)},
            r.source = '${_source}',
            r.complexityDelta = ${compDelta ?? 0},
            r.weight = ${_weight}
    `;
    
    await graphClient.cypher(cypher);
}

// ─── Core Workflow ────────────────────────────────────────────────────────────

async function processEvolutionParams(submissionId) {
    // 1. Fetch current submission
    const current = await Submission.findByPk(submissionId);
    if (!current || !current.code) return null;
    if (!VALID_STATES.includes(current.status)) return null;

    // 2. Fetch the immediately preceding valid submission by this user for this problem
    const prev = await Submission.findOne({
        where: {
            userId:    current.userId,
            problemId: current.problemId,
            language:  current.language,
            id:        { [Op.ne]: current.id },
            createdAt: { [Op.lt]: current.createdAt },
            status:    { [Op.in]: VALID_STATES }
        },
        order: [['createdAt', 'DESC']]
    });

    const lang = current.language;

    // 3. Process CURRENT
    let currentHash, currentComp;
    try {
        const { tokens } = await getTokensAndHistogram(current.code, lang);
        currentHash = hashCode(tokens);
        
        // Compute Big-O complexity map
        const tsTree = await parseToTree(current.code, lang);
        const internal = fromTreeSitter(tsTree.rootNode);
        currentComp = estimateComplexity(internal);
        
        const isAccepted = (current.status === 'success');
        await ensureVertex(currentHash, current.code, lang, currentComp, current.problemId, isAccepted);
    } catch (e) {
        console.warn(`[Evolution] Failed to process vertex for Sub ${submissionId}: ${e.message}`);
        return null;
    }

    // If no previous submission, we just act as a root vertex entry. Done.
    if (!prev || !prev.code) return currentHash;

    // 4. Process PREVIOUS
    let prevHash, prevComp;
    try {
        const { tokens: pTokens } = await getTokensAndHistogram(prev.code, lang);
        prevHash = hashCode(pTokens);

        // If hashes are identical, they are structurally the same. No edge needed.
        if (prevHash === currentHash) return currentHash;

        const pTsTree = await parseToTree(prev.code, lang);
        const pInternal = fromTreeSitter(pTsTree.rootNode);
        prevComp = estimateComplexity(pInternal);

        const isAccepted = (prev.status === 'success');
        await ensureVertex(prevHash, prev.code, lang, prevComp, prev.problemId, isAccepted);
    } catch (e) {
        console.warn(`[Evolution] Failed to process PREV vertex for Sub ${submissionId}: ${e.message}`);
        return currentHash;
    }

    // 5. Diff & Label -> EDGE CREATION
    try {
        console.log(`[Evolution] Diffing ${prevHash} -> ${currentHash} (${lang})`);
        
        // a. Structural TED
        const { distance, ops, jaccard } = await diff(prev.code, current.code, lang);
        
        // b. Label transformation (Rules -> Gemini fallback)
        const { labels, source, confidence } = await label(ops, prev.code, current.code, lang, prevHash, currentHash);
        
        // c. Complexity Delta (e.g. O(N^2) -> O(N) = -1)
        const delta = complexityDelta(prevComp, currentComp);

        // d. Upsert to AGE Graph
        await upsertEdge(prevHash, currentHash, distance, jaccard, labels, source, delta, current.problemId);

        // e. Cache in relational DB for fast lookup (hint system, dashboard)
        // Store the primary/most descriptive label if multiple returned. 
        // Array joining lets us keep all rule metadata if needed, but usually 1 is primary.
        const mergedLabel = labels.join(', ');
        
        await TransformationLabel.upsert({
            fromHash:   prevHash,
            toHash:     currentHash,
            label:      mergedLabel,
            confidence: confidence,
            labeledBy:  source
        });

        console.log(`[Evolution] Success ${prevHash}->${currentHash} : [${mergedLabel}]`);
    } catch (e) {
        console.error(`[Evolution] Edge creation failed for Sub ${submissionId}: ${e.message}`);
    }

    return currentHash;
}

// ─── Worker Initialization ────────────────────────────────────────────────────

console.log('[Evolution Worker] Booting up...');
graphClient.healthCheck()
    .then(() => console.log('[Evolution Worker] AGE Client connected.'))
    .catch(e => {
        console.error('[Evolution Worker] Failed to init graph connection:', e.message);
        process.exit(1);
    });

const worker = new Worker('evolution-graph', async (job) => {
    const { submissionId } = job.data;
    if (!submissionId) throw new Error('Missing submissionId');
    
    return await processEvolutionParams(submissionId);
}, {
    connection: { host: REDIS_HOST, port: REDIS_PORT },
    concurrency: 2 // Diffing/Trees is CPU intensive; keep concurrency low
});

worker.on('ready', () => console.log('[Evolution Worker] Listening for jobs on "evolution-graph" queue.'));
worker.on('failed', (job, err) => console.error(`[Job ${job?.id}] Failed:`, err.message));
worker.on('error', (err) => console.error('[Evolution Worker] Error:', err));

module.exports = { processEvolutionParams };

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n[Evolution Worker] Shutting down...');
    await worker.close();
    await graphClient.pool.end();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('\n[Evolution Worker] Terminating...');
    await worker.close();
    await graphClient.pool.end();
    process.exit(0);
});
