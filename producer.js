const { Queue } = require("bullmq");
const { v4: uuidv4 } = require("uuid");
const { Submission } = require("./db");

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const submissionQueue = new Queue("python-codes", {
    connection: { host: REDIS_HOST, port: REDIS_PORT },
});

// 1. Add 'language' as a parameter here
async function addSubmissionToQueue(language, userCode, userInput, expectedOutput) {
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
        language: language,
        expectedOutput: expectedOutput
    });

    console.log(`Job added! Submission ID: ${submissionId} | Language: ${language}`);
}

async function runTests() {
    // Test C++
    const cppCode = `#include <iostream>\nint main() { int a; std::cin >> a; std::cout << a * 2; return 0; }`;
    await addSubmissionToQueue("cpp", cppCode, "10", "20");

    // Small delay to prevent race conditions during testing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test Python
    const pyCode = `x = int(input())\nprint(x * 10)`;
    await addSubmissionToQueue("python", pyCode, "10", "100");
    
    console.log("All test jobs added.");
    process.exit(0);
}

if (require.main === module) {
    runTests();
}