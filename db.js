const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize('postgres', 'postgres', 'mysecretpassword', {
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'postgres',
    port: process.env.DB_PORT || 5432,
    logging: false // 👈 ADD THIS LINE TO MUTE SQL LOGS
});
const Submission = sequelize.define("Submission", {
    id: { type: DataTypes.UUID, primaryKey: true },
    code: { type: DataTypes.TEXT, allowNull: false },
    language: { type: DataTypes.TEXT, allowNull: false },
    input: { type: DataTypes.TEXT },
    output: { type: DataTypes.TEXT },
    status: { type: DataTypes.STRING, defaultValue: "Pending" },
    error: { type: DataTypes.TEXT }
});

sequelize.sync();

module.exports = { sequelize, Submission };