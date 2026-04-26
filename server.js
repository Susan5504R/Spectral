const express = require("express");
const { Queue } = require("bullmq");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
    User,
    Submission,
    Problem,
    TestCase,
    PlagiarismCheck,
    Topic,
    UserProblem,
    FavouriteProblem,
    ExecutionMetrics
} = require("./db");
// const { User, Submission, Problem, TestCase, PlagiarismCheck } = require("./db");
const { authenticateToken, SECRET } = require("./auth");
const graphClient = require('./graph/client');
const { getOrGenerateHint } = require('./graph/hintEngine');

const app = express();
app.use(express.json());

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);

const submissionQueue = new Queue("python-codes", {
    connection: { host: REDIS_HOST, port: REDIS_PORT },
});

const anticheatQueue = new Queue("anticheat", {
    connection: { host: REDIS_HOST, port: REDIS_PORT },
});
app.get("/problems", authenticateToken, async (req, res) => {
    try {
        const { search, difficulty, topic } = req.query;
        const { Op } = require("sequelize");

        const where = {};

        if (search) {
            where.title = { [Op.iLike]: `%${search}%` };
        }

        if (difficulty) {
            where.difficulty = difficulty;
        }

        const problems = await Problem.findAll({
            where,
            include: [
                {
                    model: Topic,
                    where: topic ? { name: topic } : undefined,
                    required: !!topic
                }
            ],
            order: [["createdAt", "DESC"]]
        });

        const solvedRows = await UserProblem.findAll({
            where: {
                UserId: req.user.id,
                status: "Solved"
            }
        });

        const favouriteRows = await FavouriteProblem.findAll({
            where: {
                UserId: req.user.id
            }
        });

        const solvedSet = new Set(solvedRows.map(row => row.ProblemId));
        const favouriteSet = new Set(favouriteRows.map(row => row.ProblemId));

        const result = problems.map(problem => ({
            id: problem.id,
            title: problem.title,
            description: problem.description,
            difficulty: problem.difficulty,
            topics: problem.Topics?.map(t => t.name) || [],
            solved: solvedSet.has(problem.id),
            favourite: favouriteSet.has(problem.id)
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/problems/:id", authenticateToken, async (req, res) => {
    try {
        const problem = await Problem.findByPk(req.params.id, {
            include: [Topic]
        });

        if (!problem) {
            return res.status(404).json({ error: "Problem not found" });
        }

        const solved = await UserProblem.findOne({
            where: {
                UserId: req.user.id,
                ProblemId: req.params.id,
                status: "Solved"
            }
        });

        const favourite = await FavouriteProblem.findOne({
            where: {
                UserId: req.user.id,
                ProblemId: req.params.id
            }
        });

        res.json({
            id: problem.id,
            title: problem.title,
            description: problem.description,
            difficulty: problem.difficulty,
            topics: problem.Topics?.map(t => t.name) || [],
            solved: !!solved,
            favourite: !!favourite
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post("/run", authenticateToken, async (req, res) => {
    try {
        const { code, language, input } = req.body;
        const submissionId = uuidv4();

        await Submission.create({
            id: submissionId,
            code,
            language: language || "cpp",
            input,
            userId: req.user.id,
            status: "Pending"
        });

        const job = await submissionQueue.add("execute-code", {
            submissionId,
            code,
            language: language || "cpp",
            input,
            userId: req.user.id
        });

        res.status(202).json({
            submissionId,
            jobId: job.id
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to run code" });
    }
});
app.post("/problems/:id/favourite", authenticateToken, async (req, res) => {
    try {
        await FavouriteProblem.findOrCreate({
            where: {
                UserId: req.user.id,
                ProblemId: req.params.id
            }
        });

        res.json({ message: "Added to favourites" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete("/problems/:id/favourite", authenticateToken, async (req, res) => {
    try {
        await FavouriteProblem.destroy({
            where: {
                UserId: req.user.id,
                ProblemId: req.params.id
            }
        });

        res.json({ message: "Removed from favourites" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/me/favourites", authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [
                {
                    model: Problem,
                    as: "FavouriteProblems",
                    include: [Topic]
                }
            ]
        });

        res.json(user.FavouriteProblems || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/me/profile", authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ["id", "username", "createdAt"]
        });

        const solvedRows = await UserProblem.findAll({
            where: {
                UserId: req.user.id,
                status: "Solved"
            }
        });

        const problemIds = solvedRows.map(row => row.ProblemId);

        const solvedProblems = await Problem.findAll({
            where: {
                id: problemIds
            },
            include: [Topic]
        });

        const totalSolved = solvedProblems.length;

        const breakdown = {
            Easy: 0,
            Medium: 0,
            Hard: 0
        };

        const topicBreakdown = {};

        for (const problem of solvedProblems) {
            if (problem?.difficulty) {
                breakdown[problem.difficulty]++;
            }

            for (const topic of problem?.Topics || []) {
                topicBreakdown[topic.name] = (topicBreakdown[topic.name] || 0) + 1;
            }
        }

        res.json({
            user,
            stats: {
                totalSolved,
                breakdown,
                topicBreakdown
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put("/me/profile", authenticateToken, async (req, res) => {
    try {
        const { username, bio, avatarUrl } = req.body;

        await User.update(
            { username, bio, avatarUrl },
            { where: { id: req.user.id } }
        );

        res.json({ message: "Profile updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get("/status/:id", authenticateToken, async (req, res) => {
    try {
        const submission = await Submission.findByPk(req.params.id);
        if (!submission) return res.status(404).json({ error: "Submission not found" });
        
        // Ownership check
        if (submission.userId !== req.user.id) {
            return res.status(403).json({ error: "Access denied. You can only view your own submissions." });
        }
        res.json({
            id: submission.id,
            status: submission.status,
            output: submission.output,
            error: submission.error
        });
    } catch (err) {
        res.status(500).json({ error: "Error fetching status" });
    }
});

// app.post("/register", async (req, res) => {
//     try {
//         const { username, password } = req.body;
//         const hashedPassword = await bcrypt.hash(password, 10);
//         const user = await User.create({ username, password: hashedPassword });
//         res.status(201).json({ message: "User created", userId: user.id });
//     } catch (err) {
//         res.status(400).json({ error: "Username already exists" });
//     }
// });
app.post("/register", async (req, res) => {
    try {
        const { username, password } = req.body;

        console.log("Register body:", req.body);

        const existingUser = await User.findOne({ where: { username } });

        if (existingUser) {
            return res.status(400).json({ error: "Username already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            username,
            password: hashedPassword
        });

        res.status(201).json({
            message: "User created",
            userId: user.id
        });

    } catch (err) {
        console.error("REGISTER ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '1h' });
        res.json({ token });
    } else {
        res.status(401).json({ error: "Invalid credentials" });
    }
});

app.post("/submit", authenticateToken, async (req, res) => {
    try {
        const { code, language, problemId } = req.body;
        const submissionId = uuidv4();

        await Submission.create({
            id: submissionId,
            code,
            language: language || "cpp",
            problemId,
            userId: req.user.id,
            status: "Pending"
        });

        const job = await submissionQueue.add("execute-code", {
            submissionId,
            code,
            language: language || "cpp",
            problemId,
            userId: req.user.id
        });

        return res.status(202).json({ submissionId, jobId: job.id });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to submit code" });
    }
});

app.post("/admin/problem", async (req, res) => {
    try {
        const {
            title,
            description,
            difficulty,
            topics = [],
            testCases = []
        } = req.body;

        const problem = await Problem.create({
            title,
            description,
            difficulty
        });

        const topicRows = [];

        for (const topicName of topics) {
            const [topic] = await Topic.findOrCreate({
                where: { name: topicName }
            });

            topicRows.push(topic);
        }

        await problem.setTopics(topicRows);

        const cases = testCases.map(tc => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden ?? true,
            problemId: problem.id
        }));

        await TestCase.bulkCreate(cases);

        res.status(201).json({
            message: "Problem created",
            problemId: problem.id
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/plagiarism/:submissionId", authenticateToken, async (req, res) => {
    try {
        const { Op } = require("sequelize");
        const submissionId = req.params.submissionId;

        const sub = await Submission.findByPk(submissionId);
        if (!sub) return res.status(404).json({ error: "Submission not found" });

        // Ownership check
        if (sub.userId !== req.user.id) {
            return res.status(403).json({ error: "Access denied." });
        }
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
    const adminKey = req.headers["x-admin-key"];
    if (adminKey !== (process.env.ADMIN_KEY || "secret")) return res.status(403).json({ error: "Forbidden" });

    const { sub1Id, sub2Id } = req.body;
    if (!sub1Id || !sub2Id) return res.status(400).json({ error: "sub1Id and sub2Id required" });

    try {
        await anticheatQueue.add("check", { submissionId: sub1Id, problemId: "manual", language: "cpp" });
        res.json({ message: "Check queued manually" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── Phase 5: Graph & Hint Endpoints ──────────────────────────────────────────

app.get("/hint/:submissionId", async (req, res) => {
    try {
        const hintData = await getOrGenerateHint(req.params.submissionId);
        res.json(hintData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get("/graph/problem/:problemId/patterns", async (req, res) => {
    try {
        const cypher = `
            MATCH (a:CodeState {problemId: '${req.params.problemId}'})-[e:TRANSFORMED]->()
            UNWIND e.labels AS label
            RETURN label, count(*) AS freq
            ORDER BY freq DESC LIMIT 10
        `;
        const rows = await graphClient.cypher(cypher);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/graph/user/:userId/evolution", async (req, res) => {
    try {
        const subs = await Submission.findAll({
            where: { userId: req.params.userId },
            order: [['createdAt', 'ASC']],
            attributes: ['id', 'status', 'problemId', 'createdAt']
        });
        res.json({ timeline: subs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/graph/stats", async (req, res) => {
    try {
        const nodesQuery = await graphClient.cypher('MATCH (n:CodeState) RETURN count(n) AS nodeCount');
        const edgesQuery = await graphClient.cypher('MATCH ()-[e:TRANSFORMED]->() RETURN count(e) AS edgeCount');
        
        res.json({
            nodeCount: nodesQuery.length ? nodesQuery[0].nodeCount : 0,
            edgeCount: edgesQuery.length ? edgesQuery[0].edgeCount : 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`API Server ready at http://localhost:${PORT}`);
});
