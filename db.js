const { Sequelize, DataTypes } = require("sequelize");

const dbHost = process.env.DB_HOST || "127.0.0.1";
const defaultDbPort = dbHost === "127.0.0.1" || dbHost === "localhost" ? 5433 : 5432;

const sequelize = new Sequelize('postgres', 'postgres', 'mysecretpassword', {
    host: dbHost,
    dialect: 'postgres',
    port: Number(process.env.DB_PORT || defaultDbPort),
    logging: false
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
ExecutionMetrics.belongsTo(Submission, { foreignKey: "submissionId" });
Submission.hasOne(ExecutionMetrics, { foreignKey: "submissionId" });

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

sequelize.sync({ alter: true }).catch(err => {
    console.error('[DB] Sync error:', err.message);
});

module.exports = { 
    sequelize, 
    Submission, 
    ASTFingerprint, 
    PlagiarismCheck,
    ExecutionMetrics   // 🔥 ADD THIS
};