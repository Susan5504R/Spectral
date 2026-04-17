const { Queue } = require("bullmq");
const { v4: uuidv4 } = require("uuid");
const { Submission } = require("./db");

const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const submissionQueue = new Queue("python-codes", {
    connection: { host: REDIS_HOST, port: 6379 },
});

// 1. Add 'language' as a parameter here
async function addSubmissionToQueue(language, userCode, userInput) {
    console.log(`Adding ${language} job to queue...`);
    const submissionId = uuidv4();

    // 2. Save the specific language to the Database
    await Submission.create({
        id: submissionId,
        code: userCode,
        language: language, // Dynamic language
        input: userInput,
        status: "Pending"
    });

    // 3. Send the 'language' to the Worker via the Job Data
    const job = await submissionQueue.add("execute-code", {
        submissionId: submissionId,
        code: userCode,
        input: userInput,
        language: language, // CRITICAL: This tells the worker which executor to use
    });

    console.log(`Job added! Submission ID: ${submissionId} | Language: ${language}`);
}

// --- TESTING DIFFERENT LANGUAGES ---

// Test C++
const cppCode = `#include <iostream>\nint main() { int a; std::cin >> a; std::cout << a * 2; return 0; }`;
addSubmissionToQueue("cpp", cppCode, "50");

// Test Python
const pyCode = `x = int(input())\nprint(x * 10)`;
addSubmissionToQueue("python", pyCode, "5");