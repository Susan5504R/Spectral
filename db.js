const { Sequelize, DataTypes } = require("sequelize");

const dbHost = process.env.DB_HOST || "127.0.0.1";
const defaultDbPort = dbHost === "127.0.0.1" || dbHost === "localhost" ? 5433 : 5432;

const sequelize = new Sequelize('postgres', 'postgres', 'mysecretpassword', {
    host: dbHost,
    dialect: 'postgres',
    port: Number(process.env.DB_PORT || defaultDbPort),
    logging: false
});

const User = sequelize.define("User", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    username: { type: DataTypes.STRING, unique: true, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
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
    problemId: { type: DataTypes.STRING, allowNull: true },
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
    problemId:    { type: DataTypes.STRING },
    language:     { type: DataTypes.STRING },
    tokens:       { type: DataTypes.TEXT },
    histogram:    { type: DataTypes.JSONB }
});

const PlagiarismCheck = sequelize.define('PlagiarismCheck', {
    id:            { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    sub1Id:        { type: DataTypes.UUID },
    sub2Id:        { type: DataTypes.UUID },
    problemId:     { type: DataTypes.STRING },
    language:      { type: DataTypes.STRING },
    cosineScore:   { type: DataTypes.FLOAT },
    jaccardScore:  { type: DataTypes.FLOAT },
    aiScore:       { type: DataTypes.FLOAT, allowNull: true },
    aiExplanation: { type: DataTypes.TEXT, allowNull: true },
    verdict:       { type: DataTypes.STRING, defaultValue: 'pending' }
});

// Relationships
User.hasMany(Submission, { foreignKey: "userId" });
Submission.belongsTo(User, { foreignKey: "userId" });

Problem.hasMany(TestCase, { foreignKey: "problemId" });
TestCase.belongsTo(Problem, { foreignKey: "problemId" });

ExecutionMetrics.belongsTo(Submission, { foreignKey: "submissionId" });
Submission.hasOne(ExecutionMetrics, { foreignKey: "submissionId" });

sequelize.sync({ alter: true }).catch(err => {
    if (err.original && err.original.code === '42701') {
        console.log('[DB] Tables already up to date.');
    } else {
        console.error('[DB] Sync error:', err.message);
    }
});

module.exports = {
    sequelize,
    User,
    Problem,
    TestCase,
    Submission,
    ASTFingerprint,
    PlagiarismCheck,
    ExecutionMetrics
};
