const express = require("express");
const cors = require("cors");

const { Queue } = require("bullmq");
const { v4: uuidv4 } = require("uuid");
const { Submission } = require("./db");

const app = express();
app.use(express.json());

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Connect using environment variables for Docker networking
const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const submissionQueue = new Queue("python-codes", {
    connection: { host: REDIS_HOST, port: 6379 },
});

app.post("/submit", async (req, res) => {
    const { code, input, language, problemId } = req.body;

    if (!code) {
        return res.status(400).json({ error: "Code is required" });
    }

    try {
        const submissionId = uuidv4();

        await Submission.create({
            id: submissionId,
            code: code,
            language: language || "cpp",
            input: input || "",
            problemId: problemId || "default",
            status: "Pending"
        });

        await submissionQueue.add("execute-cpp", {
            submissionId,
            code,
            input,
            language: language || "cpp",
            problemId: problemId || "default",
        });

        res.status(202).json({
            message: "Submission queued successfully",
            submissionId: submissionId
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to queue submission" });
    }
});

app.get("/status/:id", async (req, res) => {
    const submission = await Submission.findByPk(req.params.id);
    if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
    }
    res.json(submission);
});

// Plagiarism endpoints
const { PlagiarismCheck } = require("./db");

app.get("/plagiarism/:submissionId", async (req, res) => {
    try {
        const { Op } = require("sequelize");
        const submissionId = req.params.submissionId;
        const checks = await PlagiarismCheck.findAll({
            where: {
                [Op.or]: [
                    { sub1Id: submissionId },
                    { sub2Id: submissionId }
                ]
            },
            order: [['jaccardScore', 'DESC']]
        });
        const formattedChecks = checks.map(c => ({
            against: c.sub1Id === submissionId ? c.sub2Id : c.sub1Id,
            cosineScore: c.cosineScore,
            jaccardScore: c.jaccardScore,
            aiScore: c.aiScore,
            verdict: c.verdict,
            explanation: c.aiExplanation,
            evidence: []
        }));
        res.json({
            submissionId,
            checks: formattedChecks,
            _metadata: {
                colors: { clean: "#00c853", suspicious: "#ffab00", flagged: "#d50000", pending_ai: "#ffab00" }
            }
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/plagiarism/problem/:problemId", async (req, res) => {
    try {
        const checks = await PlagiarismCheck.findAll({
            where: { problemId: req.params.problemId },
            order: [['jaccardScore', 'DESC']]
        });
        res.json({ problemId: req.params.problemId, checks });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/plagiarism/check/:checkId", async (req, res) => {
    try {
        const check = await PlagiarismCheck.findByPk(req.params.checkId);
        if (!check) return res.status(404).json({ error: "Check not found" });
        res.json(check);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/plagiarism/check", async (req, res) => {
    // Admin manual check trigger
    const adminKey = req.headers["x-admin-key"];
    if (adminKey !== (process.env.ADMIN_KEY || "secret")) return res.status(403).json({ error: "Forbidden" });

    const { sub1Id, sub2Id } = req.body;
    if (!sub1Id || !sub2Id) return res.status(400).json({ error: "sub1Id and sub2Id required" });

    try {
        const { Queue } = require("bullmq");
        const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
        const anticheatQueue = new Queue("anticheat", { connection: { host: REDIS_HOST, port: 6379 } });
        
        await anticheatQueue.add("check", { submissionId: sub1Id, problemId: "manual", language: "cpp" });
        res.json({ message: "Check queued manually" });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
});