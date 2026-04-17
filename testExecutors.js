const { Queue } = require("bullmq");
const { v4: uuidv4 } = require("uuid"); // 👈 IMPORT THE UUID LIBRARY

const testQueue = new Queue("python-codes", { connection: { host: "127.0.0.1" } });

const testCases = [
    {
        language: "cpp",
        code: "#include <iostream>\nusing namespace std;\nint main() { int n; cin >> n; cout << n * 2; return 0; }",
        input: "50", 
        submissionId: uuidv4() // 👈 USE VALID UUID
    },
    {
        language: "c",
        code: "#include <stdio.h>\nint main() { int n; scanf(\"%d\", &n); printf(\"%d\", n * 2); return 0; }",
        input: "10",
        submissionId: uuidv4() // 👈 USE VALID UUID
    },
    {
        language: "python",
        code: "n = int(input())\nprint(n * 2, end='')",
        input: "5",
        submissionId: uuidv4() // 👈 USE VALID UUID
    },
    {
        language: "java",
        code: "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if(sc.hasNextInt()) {\n            int n = sc.nextInt();\n            System.out.print(n * 2);\n        }\n    }\n}",
        input: "20",
        submissionId: uuidv4() // 👈 USE VALID UUID
    }
];

async function runTests() {
    console.log("Sending Math Tests to Worker...");
    for (const test of testCases) {
        await testQueue.add("execute", test);
        console.log(`Job Added: ${test.language.toUpperCase()} with ID: ${test.submissionId}`);
    }
    process.exit(0);
}

runTests();