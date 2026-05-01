const express = require("express");
const { Queue } = require("bullmq");
const { v4: uuidv4 } = require("uuid");
const { Submission } = require("./db");

const app = express();
app.use(express.json());
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Key");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
});

const activityRouter = require("./routes/activity");
app.use("/activity", activityRouter);
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
// ─── Benchmark endpoint ───────────────────────────────────────────────────────
// Runs submitted code against multiple input sizes, records runtime + memory.
// Returns data shaped for PerformanceAnalyzer.
app.post("/benchmark", async (req, res) => {
    const { code, language, inputGenerator, inputSizes } = req.body;
    // inputSizes: array of numbers e.g. [100, 500, 1000, 5000, 10000]
    // inputGenerator: "number" | "array" — how to generate input for each size

    if (!code || !language) {
        return res.status(400).json({ error: "code and language required" });
    }

    const sizes = inputSizes || [100, 500, 1000, 2000, 5000, 10000];
    const results = [];

    for (const size of sizes) {
        // Generate input based on type
        let input = String(size); // default: just pass the number as input
        if (inputGenerator === "array") {
            // Generate a random array of `size` integers
            input = size + "\n" + Array.from({ length: size }, () =>
                Math.floor(Math.random() * 10000)).join(" ");
        }

        try {
            const submissionId = require("uuid").v4();
            await require("./db").Submission.create({
                id: submissionId, code, language,
                input, status: "Pending", problemId: "benchmark"
            });

            const filepath = await require("./generateFile").generateFile(
                { cpp:"cpp", c:"c", python:"py", java:"java" }[language] || "txt", code
            );
            const inputPath = await require("./generateInputFile").generateInputFile(input);

            const startTime = process.hrtime.bigint();
            let output, memBefore, memAfter;

            try {
                memBefore = process.memoryUsage().heapUsed;
                switch (language) {
                    case "cpp":    output = await require("./executors/executeCpp").executeCpp(filepath, inputPath); break;
                    case "c":      output = await require("./executors/executeC").executeC(filepath, inputPath); break;
                    case "python": output = await require("./executors/executePython").executePython(filepath, inputPath); break;
                    case "java":   output = await require("./executors/executeJava").executeJava(filepath, inputPath); break;
                }
                memAfter = process.memoryUsage().heapUsed;
            } catch (execErr) {
                results.push({ inputSize: size, error: execErr.message || "execution failed" });
                continue;
            }

            const endTime = process.hrtime.bigint();
            const runtimeMs = Number(endTime - startTime) / 1_000_000;
            const memoryMB = Math.abs(memAfter - memBefore) / (1024 * 1024);

            const fs = require("fs");
            if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

            results.push({
                inputSize: size,
                runtime: parseFloat(runtimeMs.toFixed(3)),
                memory: parseFloat(memoryMB.toFixed(3)),
            });

        } catch (err) {
            results.push({ inputSize: size, error: err.message });
        }
    }

    res.json({
        language,
        dataPoints: results.filter(r => !r.error),
        errors: results.filter(r => r.error),
    });
});
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
});