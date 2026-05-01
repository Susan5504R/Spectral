require('dotenv').config();
const { Sequelize, DataTypes } = require("sequelize");

// Check if the variable exists first to avoid the TypeError
if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL is not defined in your .env file!");
    process.exit(1);
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
});

const User = sequelize.define("User", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    username: { type: DataTypes.STRING, unique: true, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    bio: { type: DataTypes.TEXT, allowNull: true },
    avatarUrl: { type: DataTypes.STRING, allowNull: true }
});

const Problem = sequelize.define("Problem", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    difficulty: { type: DataTypes.ENUM('Easy', 'Medium', 'Hard') },
});

const TestCase = sequelize.define("TestCase", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    input: { type: DataTypes.TEXT, allowNull: false },
    expectedOutput: { type: DataTypes.TEXT, allowNull: false },
    isHidden: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const Submission = sequelize.define("Submission", {
    id: { type: DataTypes.UUID, primaryKey: true },
    code: { type: DataTypes.TEXT, allowNull: false },
    language: { type: DataTypes.TEXT, allowNull: false },
    problemId: { type: DataTypes.UUID, allowNull: true },
    input: { type: DataTypes.TEXT },
    output: { type: DataTypes.TEXT },
    status: { type: DataTypes.STRING, defaultValue: "Pending" },
    error: { type: DataTypes.TEXT }
});

const ExecutionMetrics = sequelize.define("ExecutionMetrics", {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    submissionId: { type: DataTypes.UUID, allowNull: false },
    execution_time_ms: { type: DataTypes.FLOAT },
    memory_used_mb: { type: DataTypes.FLOAT }
});

const ASTFingerprint = sequelize.define('ASTFingerprint', {
    submissionId: { type: DataTypes.UUID, unique: true },
    userId:       { type: DataTypes.UUID, allowNull: true },
    problemId:    { type: DataTypes.UUID },
    language:     { type: DataTypes.STRING },
    tokens:       { type: DataTypes.TEXT },
    histogram:    { type: DataTypes.JSONB }
});

const PlagiarismCheck = sequelize.define('PlagiarismCheck', {
    id:            { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    sub1Id:        { type: DataTypes.UUID },
    sub2Id:        { type: DataTypes.UUID },
    problemId:     { type: DataTypes.UUID },
    language:      { type: DataTypes.STRING },
    cosineScore:   { type: DataTypes.FLOAT },
    jaccardScore:  { type: DataTypes.FLOAT },
    aiScore:       { type: DataTypes.FLOAT, allowNull: true },
    aiExplanation: { type: DataTypes.TEXT, allowNull: true },
    verdict:       { type: DataTypes.STRING, defaultValue: 'pending' }
});

const initDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('[DB] Connected successfully.');
        await sequelize.sync({ alter: true });

    } catch (err) {
        console.error('[DB] Connection/Sync error:', err.message);
    }
}

const TransformationLabel = sequelize.define('TransformationLabel', {
    id:         { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    fromHash:   { type: DataTypes.STRING(16), allowNull: false },
    toHash:     { type: DataTypes.STRING(16), allowNull: false },
    label:      { type: DataTypes.STRING,     allowNull: false },
    confidence: { type: DataTypes.FLOAT,      defaultValue: 1.0 },
    labeledBy:  { type: DataTypes.ENUM('rule', 'gemini'), defaultValue: 'rule' },
});

/**
 * Records each hint request: which user asked, from which code state,
 * what graph path was found, and what Gemini returned.
 * Used for analytics and to avoid re-calling Gemini for the same state.
 */
const HintQuery = sequelize.define('HintQuery', {
    id:          { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userId:      { type: DataTypes.STRING, allowNull: false },
    problemId:   { type: DataTypes.UUID, allowNull: false },
    fromHash:    { type: DataTypes.STRING(16), allowNull: false },
    resultPath:  { type: DataTypes.JSONB, allowNull: true },  // array of transformation labels
    geminiHint:  { type: DataTypes.TEXT,  allowNull: true },
});

const Topic = sequelize.define("Topic", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, unique: true, allowNull: false }
});

const UserProblem = sequelize.define("UserProblem", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    status: {
        type: DataTypes.ENUM("Attempted", "Solved"),
        defaultValue: "Attempted"
    }
});

const FavouriteProblem = sequelize.define("FavouriteProblem", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }
});

// Relationships
User.hasMany(Submission, { foreignKey: "userId" });
Submission.belongsTo(User, { foreignKey: "userId" });

Problem.hasMany(TestCase, { foreignKey: "problemId" });
TestCase.belongsTo(Problem, { foreignKey: "problemId" });

ExecutionMetrics.belongsTo(Submission, { foreignKey: "submissionId" });
Submission.hasOne(ExecutionMetrics, { foreignKey: "submissionId" });

Problem.belongsToMany(Topic, { through: "ProblemTopics" });
Topic.belongsToMany(Problem, { through: "ProblemTopics" });

User.belongsToMany(Problem, { through: UserProblem, as: "SolvedProblems" });
Problem.belongsToMany(User, { through: UserProblem, as: "SolvedByUsers" });

User.belongsToMany(Problem, { through: FavouriteProblem, as: "FavouriteProblems" });
Problem.belongsToMany(User, { through: FavouriteProblem, as: "FavouritedByUsers" });

initDB();

module.exports = {
    sequelize,
    User,
    Problem,
    TestCase,
    Submission,
    ASTFingerprint,
    PlagiarismCheck,
    ExecutionMetrics,
    TransformationLabel,
    HintQuery,
    Topic,
UserProblem,
FavouriteProblem,
};
