const { executeCpp } = require("./executeCpp");
const fs = require("fs");
const path = require("path");

//1. C++ Program That Reads Input
const code = `
#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << (a * b);
    return 0;
}
`;

//2. Write the source file
const codesDir = path.join(__dirname, "codes");
if (!fs.existsSync(codesDir)) {
    fs.mkdirSync(codesDir, { recursive: true });
}

const filepath = path.join(codesDir, "test_job.cpp");
fs.writeFileSync(filepath, code);
console.log(`Code written to ${filepath}`);

//3. Write the input file 
const inputData = "10 20";
const inputPath = path.join(__dirname, "input.txt");
fs.writeFileSync(inputPath, inputData);
console.log(`Input written to ${inputPath}`);

//4. Execute and judge
executeCpp(filepath, inputPath)
    .then((output) => {
        const result = output.trim();
        const expected = "200";

        console.log("\nOUTPUT");
        console.log(`Raw  : "${output}"`);
        console.log(`Trim : "${result}"`);
        console.log("END");

        // Simple verdict
        if (result === expected) {
            console.log("\nVerdict: ACCEPTED");
        } else {
            console.log(`\nVerdict: WRONG ANSWER (expected "${expected}", got "${result}")`);
        }
    })
    .catch((err) => {
        console.error("\n ERROR");
        console.error(`${err.type}: ${err.message}`);
        console.error(" END");
    });
