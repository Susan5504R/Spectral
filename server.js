require("dotenv").config();

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "LOADED" : "NOT LOADED");
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { Op } = require("sequelize");
const { Queue } = require("bullmq");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
    initDb,
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
console.log("🔥 NEW SERVER WITH FORGOT PASSWORD ROUTE LOADED");
const { authenticateToken, SECRET } = require("./auth");
const graphClient = require('./graph/client');
const { getOrGenerateHint } = require('./graph/hintEngine');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.get("/test", (req, res) => {
    res.json({ message: "server is correct" });
});
app.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;

        console.log("Forgot password email:", email); // debug

        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ error: "No user found with this email" });
        }

        const token = crypto.randomBytes(32).toString("hex");

        user.resetToken = token;
        user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const resetLink = `http://localhost:5173/reset-password/${token}`;

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Reset Password",
            html: `<p>Click to reset password:</p><a href="${resetLink}">${resetLink}</a>`
        });

        res.json({ message: "Reset email sent" });

    } catch (err) {
        console.error("FORGOT PASSWORD ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});
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
            include: [
                Topic,
                {
                    model: TestCase,
                    where: { isHidden: false },
                    required: false
                }
            ]
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
            constraints: problem.constraints,
            difficulty: problem.difficulty,
            topics: problem.Topics?.map(t => t.name) || [],
            testCases: problem.TestCases?.map(tc => ({
                input: tc.input,
                output: tc.expectedOutput
            })) || [],
            solved: !!solved,
            favourite: !!favourite
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/problems/:id/editorial", authenticateToken, async (req, res) => {
    try {
        const problem = await Problem.findByPk(req.params.id, {
            attributes: ["id", "editorialDescription", "editorialSolutions"]
        });
        if (!problem) return res.status(404).json({ error: "Problem not found" });
        res.json(problem);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/problems/:id/submissions", authenticateToken, async (req, res) => {
    try {
        const submissions = await Submission.findAll({
            where: {
                problemId: req.params.id,
                userId: req.user.id
            },
            include: [{ model: ExecutionMetrics, attributes: ["execution_time_ms", "memory_usage_mb"] }],
            order: [["createdAt", "DESC"]]
        });
        res.json(submissions);
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
            code: submission.code,
            language: submission.language,
            output: submission.output,
            error: submission.error,
            details: submission.details
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
        const { username, email, password } = req.body;

        const existingUser = await User.findOne({
            where: {
                [Op.or]: [{ username }, { email }]
            }
        });

        if (existingUser) {
            return res.status(400).json({ error: "Username or Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            username,
            email,
            password: hashedPassword
        });

        res.status(201).json({
            message: "User created",
            userId: user.id
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.post("/reset-password/:token", async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        const user = await User.findOne({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    [Op.gt]: new Date()
                }
            }
        });

        if (!user) return res.status(400).json({ error: "Invalid or expired token" });

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetToken = null;
        user.resetTokenExpiry = null;

        await user.save();

        res.json({ message: "Password reset successful" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// app.post("/register", async (req, res) => {
//     try {
//         const { username, password } = req.body;

//         console.log("Register body:", req.body);

//         const existingUser = await User.findOne({ where: { username } });

//         if (existingUser) {
//             return res.status(400).json({ error: "Username already exists" });
//         }

//         const hashedPassword = await bcrypt.hash(password, 10);

//         const user = await User.create({
//             username,
//             password: hashedPassword
//         });

//         res.status(201).json({
//             message: "User created",
//             userId: user.id
//         });

//     } catch (err) {
//         console.error("REGISTER ERROR:", err);
//         res.status(500).json({ error: err.message });
//     }
// });

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.isAdmin }, SECRET, { expiresIn: '1h' });
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

app.post("/admin/problem", authenticateToken, (req, res, next) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: "Admin access required" });
    next();
}, async (req, res) => {
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

app.get("/graph/visualize/:problemId", async (req, res) => {
    try {
        const problemId = req.params.problemId;
        
        // AGE agtype helper - strip extra quotes from returned strings
        const strip = (v) => {
            if (v === null || v === undefined) return null;
            if (typeof v === 'string') return v.replace(/^"|"$/g, '');
            return v;
        };
        
        // Safe JSON parse with fallback
        const safeParseArray = (v) => {
            try {
                const s = strip(v);
                if (!s) return [];
                const parsed = JSON.parse(s);
                return Array.isArray(parsed) ? parsed : [parsed];
            } catch { return []; }
        };
        
        // 1. Fetch nodes with approach and data structure metadata
        const nodesQuery = `
            MATCH (n:CodeState) 
            WHERE n.problemId = '${problemId}'
            RETURN id(n) AS id, n.hash AS hash, n.accepted AS accepted, n.language AS language, 
                   n.complexity AS complexity, n.snippet AS snippet, n.approach AS approach,
                   n.approaches AS approaches, n.dataStructures AS dataStructures
        `;
        const nodesRaw = await graphClient.cypher(nodesQuery);
        
        // 2. Fetch full submission code from SQL for each hash
        const { Submission } = require('./db');
        const allSubs = await Submission.findAll({
            where: { problemId },
            attributes: ['id', 'code', 'status', 'language', 'createdAt'],
            order: [['createdAt', 'ASC']]
        });
        
        const nodes = nodesRaw.map((row, idx) => ({
            id: String(row.id),
            data: { 
                label: strip(row.approach) || `State ${idx + 1}`,
                hash: strip(row.hash),
                isSolution: row.accepted === true || strip(row.accepted) === 'true',
                language: strip(row.language),
                complexity: strip(row.complexity),
                snippet: strip(row.snippet),
                approach: strip(row.approach) || 'Unknown',
                approaches: safeParseArray(row.approaches),
                dataStructures: safeParseArray(row.dataStructures),
                stateNumber: idx + 1
            },
            position: { x: 0, y: 0 }
        }));

        // 3. Fetch edges with full transformation details
        const edgesQuery = `
            MATCH (a:CodeState)-[e:TRANSFORMED]->(b:CodeState)
            WHERE a.problemId = '${problemId}' AND b.problemId = '${problemId}'
            RETURN id(e) AS id, id(a) AS source, id(b) AS target, e.labels AS labels, 
                   e.distance AS distance, e.complexityDelta AS complexityDelta, e.source AS labelSource,
                   e.jaccard AS jaccard, e.weight AS weight
        `;
        const edgesRaw = await graphClient.cypher(edgesQuery);
        
        const edges = edgesRaw.map(row => {
            const labels = safeParseArray(row.labels);
            const labelText = labels.length > 0 ? labels.join(', ') : 'Structural Change';

            return {
                id: String(row.id),
                source: String(row.source),
                target: String(row.target),
                label: labelText,
                data: {
                    labels,
                    distance: strip(row.distance),
                    complexityDelta: strip(row.complexityDelta),
                    labelSource: strip(row.labelSource),
                    jaccard: strip(row.jaccard),
                    weight: strip(row.weight)
                },
                type: 'smoothstep'
            };
        });

        // 4. Include submission timeline for code viewing
        const timeline = allSubs.map(s => ({
            id: s.id,
            status: s.status,
            language: s.language,
            code: s.code,
            createdAt: s.createdAt
        }));

        res.json({ nodes, edges, timeline });
    } catch (err) {
        console.error("Graph Visualize Error:", err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await initDb({ logPrefix: "API" });
        app.listen(PORT, () => {
            console.log(`API Server ready at http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error("[API] Failed to start:", err.message);
        process.exit(1);
    }
}

startServer();
