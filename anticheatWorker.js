const { Worker } = require("bullmq");
const { ASTFingerprint, PlagiarismCheck, Submission } = require("./db");
const { cosineSim, jaccard, getFingerprints } = require("./anticheat/winnow");

const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";

const anticheatWorker = new Worker("anticheat", async (job) => {
    const { submissionId, problemId, language, userId } = job.data;
    console.log(`[ANTICHEAT] Checking submission ${submissionId} (User: ${userId})`);

    const newFingerprintRecord = await ASTFingerprint.findOne({ where: { submissionId } });
    if (!newFingerprintRecord) {
        console.warn(`[ANTICHEAT] No fingerprint for ${submissionId}, skipping.`);
        return;
    }

    const newTokens = JSON.parse(newFingerprintRecord.tokens);
    const newHist = newFingerprintRecord.histogram;
    const newFpSet = getFingerprints(newTokens);

    const { Op } = require("sequelize");
    const priorFingerprints = await ASTFingerprint.findAll({
        where: { 
            language, 
            problemId,
            userId: { [Op.ne]: userId } // Ignore self-submissions
        } 
    });

    for (const prior of priorFingerprints) {
        // 1. Cosine Pre-filter
        const priorHist = prior.histogram;
        const cScore = cosineSim(newHist, priorHist);

        if (cScore < 0.5) {
            continue; 
        }

        // 2. Winnowing Jaccard
        const priorTokens = JSON.parse(prior.tokens);
        const priorFpSet = getFingerprints(priorTokens);
        
        const jScore = jaccard(newFpSet, priorFpSet);

        if (jScore >= 0.6) {
            let verdict = "pending_ai";
            if (jScore >= 0.8) verdict = "flagged";

            // Enforce stable ordering to prevent duplicate reciprocal entries
            const s1Id = submissionId < prior.submissionId ? submissionId : prior.submissionId;
            const s2Id = submissionId < prior.submissionId ? prior.submissionId : submissionId;

            const [check, created] = await PlagiarismCheck.findOrCreate({
                where: { sub1Id: s1Id, sub2Id: s2Id },
                defaults: {
                    problemId: problemId || null,
                    language: language,
                    cosineScore: cScore,
                    jaccardScore: jScore,
                    verdict: verdict
                }
            });

            if (!created) {
                console.log(`[ANTICHEAT] Check already exists for pair: ${s1Id} <-> ${s2Id}`);
                continue;
            }

            console.log(`[ANTICHEAT] Flagged pair: ${submissionId} <-> ${prior.submissionId} (Score: ${jScore.toFixed(2)})`);

            if (verdict === "pending_ai") {
                const s1 = await Submission.findByPk(submissionId);
                const s2 = await Submission.findByPk(prior.submissionId);
                if (s1 && s2) {
                    const { analyze } = require("./anticheat/geminiAnalyzer");
                    const aiResult = await analyze(s1.code, s2.code, language, jScore);
                    
                    await PlagiarismCheck.update(
                        {
                            aiScore: Math.max(0, Math.min(aiResult.confidence || 0, 1)),
                            aiExplanation: aiResult.reasoning,
                            verdict: aiResult.verdict === 'error' ? 'pending_ai' : aiResult.verdict
                        },
                        { where: { id: check.id } }
                    );
                    console.log(`[ANTICHEAT] AI Analysis completed. Verdict: ${aiResult.verdict}`);
                }
            }
        }
    }
}, {
    connection: { host: REDIS_HOST, port: 6379 },
});

console.log("Anti-cheat Worker is live! Waiting for jobs...");
