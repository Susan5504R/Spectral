const { Submission, ASTFingerprint, PlagiarismCheck } = require("./db");

async function diagnostic() {
    try {
        const subs = await Submission.findAll({ attributes: ['id', 'problemId', 'status'] });
        console.log("\n--- SUBMISSIONS ---");
        subs.forEach(s => console.log(`${s.id}: Problem=[${s.problemId}] Status=${s.status}`));

        const fps = await ASTFingerprint.findAll({ attributes: ['submissionId', 'problemId'] });
        console.log("\n--- FINGERPRINTS ---");
        fps.forEach(f => console.log(`Sub: ${f.submissionId} Problem=[${f.problemId}]`));

        const checks = await PlagiarismCheck.findAll();
        console.log("\n--- PLAGIARISM CHECKS ---");
        checks.forEach(c => console.log(`${c.sub1Id} <-> ${c.sub2Id} Score=${c.jaccardScore}`));
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

diagnostic();
