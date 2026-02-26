const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const outputPath = path.join(__dirname, "outputs");

if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
}

/**
 * Compiles and executes a C++ file with optional input redirection.
 * @param {string} filepath - Absolute path to the .cpp source file.
 * @param {string} [inputPath] - Absolute path to a .txt file whose contents
 *                                will be piped into the program's stdin via
 *                                file redirection (<).
 * @returns {Promise<string>} The raw stdout produced by the program.
 */
const executeCpp = (filepath, inputPath) => {
    const jobId = path.basename(filepath).split(".")[0];

    const isWindows = process.platform === "win32";
    const executablePath = isWindows
        ? path.join(outputPath, `${jobId}.exe`)
        : path.join(outputPath, `${jobId}.out`);

    return new Promise((resolve, reject) => {
        //Compile
        const compileCmd = `g++ "${filepath}" -o "${executablePath}"`;

        console.log(`Compiling: ${compileCmd}`);

        exec(compileCmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`Compilation Error: ${error}`);
                return reject({ type: "Compilation Error", message: stderr || error.message });
            }

            //Execute with optional input redirection
            let executeCmd = `"${executablePath}"`;
            if (inputPath) {
                executeCmd += ` < "${inputPath}"`;
            }

            console.log(`Compiled successfully. Executing: ${executeCmd}`);

            exec(executeCmd, { timeout: 5000 }, (runError, runStdout, runStderr) => {
                if (runError) {
                    if (runError.killed) {
                        return reject({
                            type: "Runtime Error",
                            message: "TLE (Time Limit Exceeded)",
                        });
                    }
                    return reject({
                        type: "Runtime Error",
                        message: runStderr || runError.message,
                    });
                }

                resolve(runStdout);
            });
        });
    });
};

module.exports = {
    executeCpp,
};
