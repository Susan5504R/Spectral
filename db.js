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

const initDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('[DB] Connected successfully.');
        await sequelize.sync({ alter: true });
        console.log('[DB] Sync complete.');
    } catch (err) {
        console.error('[DB] Connection/Sync error:', err.message);
    }
};

initDB();

module.exports = { sequelize, Submission, ASTFingerprint, PlagiarismCheck };