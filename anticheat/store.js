const { ASTFingerprint } = require('../db');
const { getTokensAndHistogram } = require('./astParser');

async function storeFingerprint(submissionId, code, lang, problemId, userId) {
    try {
        const { tokens, histogram } = await getTokensAndHistogram(code, lang);
        await ASTFingerprint.create({
            submissionId,
            userId,
            problemId: problemId || null,
            language: lang,
            tokens: JSON.stringify(tokens),
            histogram
        });
        console.log(`Fingerprint stored for submission: ${submissionId}`);
    } catch (e) {
        console.error(`Failed to store fingerprint for submission ${submissionId}:`, e.message);
    }
}

module.exports = { storeFingerprint };
