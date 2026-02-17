const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const outputPath = path.join(__dirname, "outputs");

if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
}

const executeCpp = (filepath) => {
    // Logic:
    // 1. Get the file ID and Name
    // 2. Compile: g++ code.cpp -o code.out
    // 3. Run: ./code.out

    const jobId = path.basename(filepath).split(".")[0];

    // Windows compatibility: .exe extension is needed for execution usually.
    const isWindows = process.platform === "win32";
    const executablePath = isWindows
        ? path.join(outputPath, `${jobId}.exe`)
        : path.join(outputPath, `${jobId}.out`);

    return new Promise((resolve, reject) => {
        // Compile command
        const compileCmd = `g++ "${filepath}" -o "${executablePath}"`;

        // Execute command
        // Use quotes to handle paths with spaces
        const executeCmd = `"${executablePath}"`;

        console.log(`Compiling: ${compileCmd}`);

        exec(compileCmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`Compilation Error: ${error}`);
                reject({ type: 'Compilation Error', message: stderr || error.message });
                return;
            }

            console.log(`Compiled successfully. Executing: ${executeCmd}`);

            exec(executeCmd, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Runtime Error: ${error}`);
                    reject({ type: 'Runtime Error', message: stderr || error.message });
                    return;
                }
                resolve(stdout);
            });
        });
    });
};

module.exports = {
    executeCpp,
};
