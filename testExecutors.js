const { Queue } = require("bullmq");
const { v4: uuidv4 } = require("uuid");
const { Submission } = require("./db");

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);

const testQueue = new Queue("python-codes", { 
    connection: { host: REDIS_HOST, port: REDIS_PORT } 
});

const testCases = [
    {
        name: "C++ (Accepted)",
        language: "cpp",
        code: `#include <iostream>\nint main() { int n; std::cin >> n; std::cout << n * 2; return 0; }`,
        input: "50",
        expectedOutput: "100",
        submissionId: uuidv4()
    },
    {
        name: "C (Runtime Error - Div by Zero)",
        language: "c",
        code: `#include <stdio.h>\nint main() { int a=10, b=0; printf("%d", a/b); return 0; }`,
        input: "",
        expectedOutput: "0",
        submissionId: uuidv4()
    },
    {
        name: "Python (Compilation Error)",
        language: "python",
        code: `print("Hello World"`, // Missing parenthesis
        input: "",
        expectedOutput: "",
        submissionId: uuidv4()
    },
    {
        name: "Python (Wrong Answer)",
        language: "python",
        code: `print(int(input()) + 5)`, // Adds 5 instead of doubling
        input: "10",
        expectedOutput: "20",
        submissionId: uuidv4()
    },
    {
        name: "Java (Time Limit Exceeded)",
        language: "java",
        code: `public class Main { public static void main(String[] args) { while(true); } }`,
        input: "",
        expectedOutput: "done",
        submissionId: uuidv4()
    }
];

async function runTests() {
    console.log("Running Comprehensive Executor Tests...");

    for (const test of testCases) {
        await Submission.create({
            id: test.submissionId,
            code: test.code,
            language: test.language,
            input: test.input,
            status: "Pending"
        });

        await testQueue.add("execute", test);
        console.log(`Job Added! [${test.language.toUpperCase()}] ID: ${test.submissionId}`);
    }

    console.log("\nAll jobs added. Check worker logs for results.");
    process.exit(0);
}

runTests();