const { Sequelize, DataTypes } = require("sequelize");

const dbHost = process.env.DB_HOST || "db";
const dbPort = process.env.DB_PORT || 5432;
const dbName = process.env.POSTGRES_DB || "postgres";
const dbUser = process.env.POSTGRES_USER || "postgres";
const dbPass = process.env.POSTGRES_PASSWORD;

const sequelize = new Sequelize(dbName, dbUser, dbPass, {
  host: dbHost,
  dialect: 'postgres',
  port: Number(dbPort),
  logging: false,
});
const Submission = sequelize.define("Submission", {
    id:        { type: DataTypes.UUID, primaryKey: true },
    code:      { type: DataTypes.TEXT, allowNull: false },
    language:  { type: DataTypes.TEXT, allowNull: false },
    problemId: { type: DataTypes.STRING, allowNull: true },
    input:     { type: DataTypes.TEXT },
    output:    { type: DataTypes.TEXT },
    status:    { type: DataTypes.STRING, defaultValue: "Pending" },
    error:     { type: DataTypes.TEXT }
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

// ─── NEW: Activity Model ──────────────────────────────────────────────────────
// Tracks every meaningful user action (submission, test run, etc.)
// The composite index on (userId, createdAt) is the performance key for the
// calendar aggregation query — without it, a full table scan runs on every load.
const Activity = sequelize.define('Activity', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
    },
    // Who did it — use your auth system's user identifier here
    userId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // What kind of action: "submission", "test_run", "solved", etc.
    type: {
        type: DataTypes.STRING,
        defaultValue: "submission"
    },
    // Optional FK back to the Submission that caused this activity
    submissionId: {
        type: DataTypes.UUID,
        allowNull: true
    },
}, {
    // The composite index — this is what makes the calendar query fast
    // It lets Postgres do an index scan instead of a full table scan
    indexes: [
        {
            name: "activity_userid_createdat_idx",
            fields: ["userId", "createdAt"]
        }
    ]
});
// ─────────────────────────────────────────────────────────────────────────────

sequelize.sync({ alter: true }).catch(err => {
    if (err.original && err.original.code === '42701') {
        console.log('[DB] Tables already up to date.');
    } else {
        console.error('[DB] Sync error:', err.message);
    }
});

module.exports = { sequelize, Submission, ASTFingerprint, PlagiarismCheck, Activity };