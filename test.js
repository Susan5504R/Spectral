const { executeCpp } = require("./executeCpp");
const fs = require("fs");
const path = require("path");

// 1. Create a dummy C++ file
const code = `
#include <iostream>
using namespace std;

int main() {
    cout << "Hello from C++ Execution Engine!" << endl;
    return 0;
}
`;

// Ensure codes directory exists
const codesDir = path.join(__dirname, "codes");
if (!fs.existsSync(codesDir)) {
    fs.mkdirSync(codesDir, { recursive: true });
}

const filepath = path.join(codesDir, "test_job.cpp");
fs.writeFileSync(filepath, code);

console.log(`Code written to ${filepath}`);

// 2. Run the execution engine
executeCpp(filepath)
    .then((output) => {
        console.log("\n--- OUTPUT ---");
        console.log(output);
        console.log("--- END ---");
    })
    .catch((err) => {
        console.error("\n--- ERROR ---");
        console.error(err);
        console.error("--- END ---");
    });
