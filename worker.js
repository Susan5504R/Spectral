const { Worker, Queue } = require("bullmq");
const fs = require("fs");

// DB
const { Submission, ExecutionMetrics } = require("./db");
const { storeFingerprint } = require("./anticheat/store");

// Executors
const { executeCpp } = require("./executors/executeCpp");
const { executeC } = require("./executors/executeC");
const { executePython } = require("./executors/executePython");
const { executeJava } = require("./executors/executeJava");

const { generateFile } = require("./generateFile");
const { generateInputFile } = require("./generateInputFile");

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);

const anticheatQueue = new Queue("anticheat", {
    connection: { host: REDIS_HOST, port: REDIS_PORT }
});

// 🔥 Normalize output for fair comparison
function normalize(str) {
    return String(str).trim().replace(/\s+/g, " ");
}

const worker = new Worker("python-codes", async (job) => {
    const { code, input, language, submissionId, problemId, expectedOutput } = job.data;

    let executionTime = 0;
    let memoryUsed = 0;
    let status = "Pending";
    let finalOutput = "";
    let errorMsg = null, capturedError = null;
    let filepath, inputPath;

    console.log(`\n[JOB ${job.id}] Processing ${language.toUpperCase()} for problem ${problemId}...`);

    const extensionMap = { cpp: "cpp", c: "c", python: "py", java: "java" };

    try {
        const ext = extensionMap[language] || "txt";
        filepath = await generateFile(ext, code);
        inputPath = input ? await generateInputFile(input) : null;

        let result;
        switch (language) {
            case "cpp": result = await executeCpp(filepath, inputPath); break;
            case "c": result = await executeC(filepath, inputPath); break;
            case "python": result = await executePython(filepath, inputPath); break;
            case "java": result = await executeJava(filepath, inputPath); break;
            default: throw new Error("Language not supported");
        }

        executionTime = result.time;
        memoryUsed = result.memory;
        finalOutput = result.output;

        console.log(`[JOB ${job.id}] Time: ${executionTime.toFixed(2)} ms`);
        console.log(`[JOB ${job.id}] Memory: ${memoryUsed.toFixed(2)} MB`);
        console.log(`[JOB ${job.id}] OUTPUT:\n${finalOutput.trim()}`);

        // 🔥 Verdict
        status = "Accepted";
        if (expectedOutput !== undefined) {
            if (normalize(finalOutput) !== normalize(expectedOutput)) {
                status = "Wrong Answer";
            }
        }

    } catch (err) {
        errorMsg = err.message || "Unknown error";
        status = err.type || "Runtime Error";
        const msg = errorMsg.toLowerCase();

        if (msg.includes("tle") || msg.includes("time limit")) {
            status = "Time Limit Exceeded";
        } else if (
            msg.includes("error:") || msg.includes("compilation") ||
            msg.includes("syntaxerror") || msg.includes("javac") ||
            msg.includes("gcc") || msg.includes("g++")
        ) {
            status = "Compilation Error";
        }
        capturedError = err;
    }

    // 🔥 Final Status Update
    console.log(`[JOB ${job.id}] STATUS: ${status}`);
    if (errorMsg && (status === "Compilation Error" || status === "Runtime Error")) {
        console.log(`[JOB ${job.id}] ERROR DETAILS:\n${errorMsg}`);
    }
    
    try {
        if (submissionId) {
            await Submission.update(
                { status, output: finalOutput, error: errorMsg },
                { where: { id: submissionId } }
            );

            await ExecutionMetrics.upsert({
                submissionId,
                execution_time_ms: executionTime,
                memory_used_mb: memoryUsed
            });

            // Anti-cheat (only on successful compilation/execution)
            if (status !== "Compilation Error" && status !== "System Error") {
                storeFingerprint(submissionId, code, language, problemId)
                    .then(() => anticheatQueue.add('check', { submissionId, problemId, language }))
                    .catch(e => console.error(`[JOB ${job.id}] Fingerprint error:`, e.message));
            }
        }
    } catch (dbErr) {
        console.error(`[JOB ${job.id}] DB Finalize Error:`, dbErr.message);
    } finally {
        // Cleanup files
        if (filepath && fs.existsSync(filepath)) fs.unlinkSync(filepath);
        if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    }

    if (capturedError) {
        throw capturedError;
    }
    return finalOutput;

}, {
    connection: { host: REDIS_HOST, port: REDIS_PORT },
    concurrency: 1
});

console.log("Multi-Language Worker is live! Waiting for jobs...");