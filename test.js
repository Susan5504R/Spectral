const { executeCpp } = require("./executeCpp");
const { generateFile } = require("./generateFile");
const { generateInputFile } = require("./generateInputFile");
const fs = require("fs");

// 1. C++ Program That Reads Input (Malicious Infinite Output)
const code = `
#include <iostream>
using namespace std;

int main() {
    while(true) {
        cout << "A";
    }
    return 0;
}
`;

// 2. Input Data
const inputData = "10 20";

const runTest = async () => {
    let filepath = "";
    let inputPath = "";

    try {
        console.log("Generating dynamic files...");
        filepath = await generateFile("cpp", code);
        inputPath = await generateInputFile(inputData);

        console.log(`Code written to ${filepath}`);
        console.log(`Input written to ${inputPath}`);

        console.log("Executing in Docker Sandbox...");
        const output = await executeCpp(filepath, inputPath);

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
    } catch (err) {
        console.error("\n ERROR");
        console.error(`${err.type}: ${err.message}`);
        console.error(" END");
    } finally {
        console.log("\nCleaning up files...");
        if (filepath && fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            console.log(`Deleted ${filepath}`);
        }
        if (inputPath && fs.existsSync(inputPath)) {
            fs.unlinkSync(inputPath);
            console.log(`Deleted ${inputPath}`);
        }
    }
};

runTest();
