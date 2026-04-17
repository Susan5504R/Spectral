const { Worker } = require("bullmq");
const fs = require("fs");
const path = require("path");

// 1. IMPORT YOUR DATABASE MODEL
const { Submission } = require("./db"); 

// Import all executors
const { executeCpp } = require("./executors/executeCpp");
const { executeC } = require("./executors/executeC");
const { executePython } = require("./executors/executePython");
const { executeJava } = require("./executors/executeJava");

const { generateFile } = require("./generateFile");
const { generateInputFile } = require("./generateInputFile");

const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";

const worker = new Worker("python-codes", async (job) => {
    // 2. Extract submissionId so we know which DB row to update
    const { code, input, language, submissionId } = job.data; 
    
    console.log(`\n[JOB ${job.id}] Processing ${language.toUpperCase()}...`);

    let filepath, inputPath;
    const extensionMap = { cpp: "cpp", c: "c", python: "py", java: "java" };

    try {
        const ext = extensionMap[language] || "txt";
        filepath = await generateFile(ext, code);
        inputPath = input ? await generateInputFile(input) : null;

        let output;
        switch (language) {
            case "cpp": output = await executeCpp(filepath, inputPath); break;
            case "c":   output = await executeC(filepath, inputPath); break;
            case "python": output = await executePython(filepath, inputPath); break;
            case "java":   output = await executeJava(filepath, inputPath); break;
            default: throw new Error("Language not supported");
        }

        const finalOutput = output.trim();
        console.log(`[JOB ${job.id}] OUTPUT:\n${finalOutput}`);

        // 3. SUCCESS: Update the Database
        if (submissionId) {
            await Submission.update(
                { output: finalOutput, status: "Accepted" },
                { where: { id: submissionId } }
            );
        }

        return finalOutput;

    } catch (err) {
        console.error(` [JOB ${job.id}] ERROR:`, err.message || err);
        
        // 4. FAILURE: Update the Database with the error
        if (submissionId) {
            const errorType = err.type || "Runtime Error";
            await Submission.update(
                { error: err.message || "Execution failed", status: errorType },
                { where: { id: submissionId } }
            );
        }
        throw err;
    } finally {
        if (filepath && fs.existsSync(filepath)) fs.unlinkSync(filepath);
        if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    }
}, {
    connection: { host: REDIS_HOST, port: 6379 },
    concurrency: 1 
});

console.log(" Multi-Language Worker is live! Waiting for jobs...");