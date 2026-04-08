const { Queue } = require("bullmq");
const { v4: uuidv4 } = require("uuid");
const { Submission } = require("./db");

//Connect to the Redis server we started in Docker
const submissionQueue = new Queue("python-codes", {
    connection: {
        host: "127.0.0.1",
        port: 6379,
    },
});
//This function simulates a user submitting code to an API
async function addSubmissionToQueue(userCode, userInput) {
    console.log("Adding job to queue...");

    const submissionId = uuidv4();

    // Create a row in the submissions table
    await Submission.create({
        id: submissionId,
        code: userCode,
        language: "cpp",
        input: userInput,
        status: "Pending"
    });

    //We add a job to the queue with a name and the data
    const job = await submissionQueue.add("execute-cpp", {
        submissionId: submissionId,
        code: userCode,
        input: userInput,
    });

    console.log(`Job added! Queue ID is: ${job.id}, Submission ID: ${submissionId}`);
}

//Example simulating a request
const exampleCode = `#include <iostream>\nint main() { int a; std::cin >> a; std::cout << a * 2; return 0; }`;
addSubmissionToQueue(exampleCode, "50");
