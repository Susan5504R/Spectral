'use strict';

/**
 * graph/hintEngine.js — AI Hint Generation via AST Evolution Graph
 *
 * Exposes core mechanics for Sub-Phase 5:
 *   1. findBestPath(): Cypher search for the most-traveled path from
 *      the current code state to an accepted node.
 *   2. generateHint(): Uses Gemini to translate the structural 
 *      transformation path into a tailored natural-language hint.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const graphClient = require('./client');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');

/**
 * Searches the Apache AGE graph for the most popular path 
 * (by DISTINCT user traversals) from `fromHash` to any CodeState 
 * where `accepted=true`.
 *
 * Limits traversal depth to 5 steps to ensure performance.
 *
 * @param {string} fromHash - The SHA256 code state hash currently occupied by the user.
 * @returns {Array<string>|null} The ordered array of transformation labels if found.
 */
async function findBestPath(fromHash, problemId) {
    // We match any path downstream of length 1..5 landing on an accepted state.
    // We extract the array of labels along the sequence.
    // We order by the 'weight' which we've loosely mapped to `distance` or popularity.
    try {
        const cypher = `
            MATCH p = (start:CodeState {id: '${fromHash}_${problemId}'})-[edges:TRANSFORMED*1..5]->(target:CodeState {accepted: true})
            RETURN edges
            LIMIT 1
        `;
        const res = await graphClient.cypher(cypher);
        if (!res || res.length === 0) return null;
        
        // edges will be an array of objects
        const edgeList = res[0].edges;
        if (!edgeList) return null;
        
        console.log('[DEBUG] AGE edgeList:', edgeList);

        // In AGE JS driver, edge properties might come back as a serialized agtype string if it's a path list
        let parsedEdges = edgeList;
        if (typeof edgeList === 'string') {
            try {
                const cleaned = edgeList.replace(/::edge/g, '').replace(/::vertex/g, '');
                parsedEdges = JSON.parse(cleaned);
            } catch (e) {
                console.error('[HintEngine] Failed to parse agtype string:', e.message);
                return null;
            }
        }

        const parsedLabels = [];
        for (const edge of parsedEdges) {
            const props = edge.props || edge.properties || edge;
            if (props && props.labels && props.labels.length > 0) {
                parsedLabels.push(props.labels[0]);
            }
        }

        return parsedLabels;
    } catch (err) {
        console.error('[HintEngine] Path query failed:', err.message);
        return null;
    }
}

/**
 * Invokes Gemini 1.5 Flash to generate a Socratic hint using the structural 
 * evolution path uncovered from the graph.
 *
 * @param {string} userCode - Raw code of the student.
 * @param {Array<string>} pathLabels - E.g. ['Removed Nested Loop', 'Added Sorting Step']
 * @param {string} lang - Code lang (cpp, python).
 * @returns {string} The text hint.
 */
async function generateHint(userCode, pathLabels, lang) {
    if (!pathLabels || pathLabels.length === 0) {
        return "I can't chart a guaranteed path to the solution from your current code yet. Try a different approach or consider whether your logic covers all edge cases.";
    }

    const steps = pathLabels.join(' → ');
    const firstStep = pathLabels[0];

    const prompt = `
You are an expert, Socratic competitive programming mentor. A user is struggling with a problem.
Based on structural data from other users who successfully solved this problem, the optimal evolution path from their code is:
${steps}

The user's current code is:
\`\`\`${lang}
${userCode}
\`\`\`

Give a Socratic hint (do NOT provide full code solutions). Explain the very **first** transformation they should make ("${firstStep}") in terms of their specific code. 
For instance, if the first step is "Removed Nested Loop", reference their actual loop variables (e.g., 'i' and 'j'). If it's "Added HashMap", hint at which loop lookup could use O(1) state.
Limit your response to 2-3 sentences max. Do NOT reveal the full solution path.
`;

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (e) {
        console.error('[HintEngine] Gemini generation failed:', e.message);
        return "You're on the right track! Start by focusing on: " + firstStep + " ...";
    }
}

const { Submission, HintQuery } = require('../db');
const { getTokensAndHistogram } = require('../anticheat/astParser');
const { hashCode } = require('./utils');

/**
 * High-level orchestration for hints.
 */
async function getOrGenerateHint(submissionId) {
    const sub = await Submission.findByPk(submissionId);
    if (!sub) throw new Error('Submission not found.');

    const { tokens } = await getTokensAndHistogram(sub.code, sub.language || 'cpp');
    const hash = hashCode(tokens);

    // 1. Check if we already provided a hint for this CodeState for this user
    let existingHint = await HintQuery.findOne({
        where: { userId: sub.userId, problemId: sub.problemId, fromHash: hash }
    });
    
    // Sometimes it's identical structurally, so cache hit!
    if (existingHint && existingHint.geminiHint) {
        return {
            hint: existingHint.geminiHint,
            pathLabels: existingHint.resultPath,
            cached: true
        };
    }

    // 2. We need a path
    const pathLabels = await findBestPath(hash, sub.problemId);
    
    // 3. We generate a hint
    const hintText = await generateHint(sub.code, pathLabels, sub.language);

    // 4. Save to DB for subsequent caching
    await HintQuery.create({
        userId: sub.userId,
        problemId: sub.problemId,
        fromHash: hash,
        resultPath: pathLabels,
        geminiHint: hintText
    });

    return {
        hint: hintText,
        pathLabels,
        cached: false
    };
}

module.exports = {
    findBestPath,
    generateHint,
    getOrGenerateHint
};
