const { Worker, Queue } = require("bullmq");
const fs = require("fs");
const { Submission, ExecutionMetrics, TestCase, UserProblem } = require("./db");
const { storeFingerprint } = require("./anticheat/store");

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

const evolutionQueue = new Queue("evolution-graph", {
    connection: { host: REDIS_HOST, port: REDIS_PORT }
});

function normalize(str) {
    return String(str).trim().replace(/[ \t]+/g, " ").replace(/\r\n/g, "\n");
}

function classifyError(err, msg) {
    const lower = msg.toLowerCase();
    if (lower.includes("tle") || lower.includes("time limit")) return "Time Limit Exceeded";
    if (
        lower.includes("error:") || lower.includes("compilation") ||
        lower.includes("syntaxerror") || lower.includes("javac") ||
        lower.includes("gcc") || lower.includes("g++")
    ) return "Compilation Error";
    return err.type || "Runtime Error";
}

async function runExecutor(language, filepath, inputPath) {
    switch (language) {
        case "cpp":    return executeCpp(filepath, inputPath);
        case "c":      return executeC(filepath, inputPath);
        case "python": return executePython(filepath, inputPath);
        case "java":   return executeJava(filepath, inputPath);
        default:       throw new Error("Language not supported");
    }
}

const worker = new Worker("python-codes", async (job) => {
    const { code, input, language, submissionId, problemId, expectedOutput, userId } = job.data;

    let totalTime = 0, peakMemory = 0;
    let status = "Pending";
    let finalOutput = "";
    let errorMsg = null, capturedError = null;
    let filepath;
    let failedTestCase = null;

    console.log(`\n[JOB ${job.id}] Processing ${language?.toUpperCase()} for problem ${problemId}...`);

    const extensionMap = { cpp: "cpp", c: "c", python: "py", java: "java" };

    try {
        const ext = extensionMap[language] || "txt";
        filepath = await generateFile(ext, code);

        const testCases = problemId
            ? await TestCase.findAll({ where: { problemId } })
            : [];

        if (testCases.length > 0) {
            // Multi-test-case mode: judge against all DB test cases
            status = "Accepted";
            for (const tc of testCases) {
                let inputPath;
                try {
                    inputPath = await generateInputFile(tc.input);
                    const result = await runExecutor(language, filepath, inputPath);
                    totalTime += result.time;
                    peakMemory = Math.max(peakMemory, result.memory);
                    finalOutput = result.output;

                    if (normalize(result.output) !== normalize(tc.expectedOutput)) {
                        status = "Wrong Answer";
                        failedTestCase = {
                            input: tc.input,
                            expected: tc.expectedOutput,
                            actual: result.output,
                            isHidden: tc.isHidden
                        };
                        break;
                    }
                } catch (err) {
                    errorMsg = err.message || "Unknown error";
                    status = classifyError(err, errorMsg);
                    capturedError = err;
                    failedTestCase = {
                        input: tc.input,
                        expected: tc.expectedOutput,
                        actual: errorMsg,
                        isHidden: tc.isHidden
                    };
                    break;
                } finally {
                    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                }
            }
        } else {
            // Single-run mode: use job-embedded input / expectedOutput
            let inputPath;
            try {
                inputPath = input ? await generateInputFile(input) : null;
                const result = await runExecutor(language, filepath, inputPath);
                totalTime = result.time;
                peakMemory = result.memory;
                finalOutput = result.output;

                status = "Accepted";
                if (expectedOutput !== undefined && normalize(finalOutput) !== normalize(expectedOutput)) {
                    status = "Wrong Answer";
                    failedTestCase = {
                        input: input || "No input provided",
                        expected: expectedOutput,
                        actual: finalOutput,
                        isHidden: false // Single-run mode input is always public
                    };
                }
            } catch (err) {
                errorMsg = err.message || "Unknown error";
                status = classifyError(err, errorMsg);
                capturedError = err;
            } finally {
                if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            }
        }
    } catch (err) {
        errorMsg = err.message || "Unknown error";
        status = classifyError(err, errorMsg);
        capturedError = err;
    }

    console.log(`[JOB ${job.id}] Time: ${totalTime.toFixed(2)} ms | Memory: ${peakMemory.toFixed(2)} MB | STATUS: ${status}`);
    
    if (status !== "Accepted" && status !== "Pending" && failedTestCase) {
        console.log("\n--- FAILURE DETAILS ---");
        console.log(`Type:     ${failedTestCase.isHidden ? 'HIDDEN' : 'PUBLIC'}`);
        console.log(`Input:    ${failedTestCase.input}`);
        console.log(`Expected: ${failedTestCase.expected}`);
        console.log(`Actual:   ${failedTestCase.actual}`);
        console.log("-----------------------\n");
    }

    if (errorMsg && (status === "Compilation Error" || status === "Runtime Error")) {
        console.log(`[JOB ${job.id}] ERROR:\n${errorMsg}`);
    }

    try {
        if (submissionId) {
            await Submission.update(
                { status, output: finalOutput, error: errorMsg, details: failedTestCase },
                { where: { id: submissionId } }
            );

            await ExecutionMetrics.upsert({
                submissionId,
                execution_time_ms: totalTime,
                memory_used_mb: peakMemory
            });
            if (userId && problemId) {
    if (status === "Accepted") {
        await UserProblem.upsert({
            UserId: userId,
            ProblemId: problemId,
            status: "Solved"
        });
    } else {
        await UserProblem.findOrCreate({
            where: {
                UserId: userId,
                ProblemId: problemId
            },
            defaults: {
                status: "Attempted"
            }
        });
    }
}

            if (status !== "Compilation Error" && status !== "System Error") {
                storeFingerprint(submissionId, code, language, problemId, userId)
                    .then(() => anticheatQueue.add('check', { submissionId, problemId, language, userId }))
                    .catch(e => console.error(`[JOB ${job.id}] Fingerprint error:`, e.message));
                    
                evolutionQueue.add('process', { submissionId, problemId, language })
                    .catch(e => console.error(`[JOB ${job.id}] Evolution queue error:`, e.message));
            }
        }
    } catch (dbErr) {
        console.error(`[JOB ${job.id}] DB Finalize Error:`, dbErr.message);
    } finally {
        if (filepath && fs.existsSync(filepath)) fs.unlinkSync(filepath);
    }

    if (capturedError) throw capturedError;
    return finalOutput;

}, {
    connection: { host: REDIS_HOST, port: REDIS_PORT },
    concurrency: 1
});

worker.on("ready", () => console.log("Multi-Language Worker is live! Waiting for jobs..."));
worker.on("active", (job) => console.log(`[JOB ${job.id}] Active`));
worker.on("completed", (job) => console.log(`[JOB ${job.id}] Completed`));
worker.on("failed", (job, err) => console.error(`[JOB ${job?.id}] Failed:`, err.message));
worker.on("error", (err) => console.error("Worker error:", err));
