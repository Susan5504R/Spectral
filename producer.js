const { Queue } = require("bullmq");

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

    //We add a job to the queue with a name and the data
    const job = await submissionQueue.add("execute-cpp", {
        code: userCode,
        input: userInput,
    });

    console.log(`Job added! ID is: ${job.id}`);
}

//Example simulating a request
const exampleCode = `#include <iostream>\nint main() { int a; std::cin >> a; std::cout << a * 2; return 0; }`;
addSubmissionToQueue(exampleCode, "50");
