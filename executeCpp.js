const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const DOCKER_IMAGE = "spectral-runner";
const MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB

/**
 * Compiles and executes a C++ file inside a sandboxed Docker container.
 *
 * Security measures:
 *   --rm          : container is destroyed after execution, preventing leftover binaries
 *   --network none: no network access from inside the container
 *   --memory 128m : hard memory cap
 *   --cpus 0.5    : CPU throttle
 *   output cap    : aborts stream if stdout/stderr > 1MB
 *
 * @param {string} filepath  - Absolute path to the .cpp source file.
 * @param {string} [inputPath] - Absolute path to a .txt file whose contents
 *                                will be piped into the program's stdin.
 * @returns {Promise<string>} The raw stdout produced by the program.
 */
const executeCpp = (filepath, inputPath) => {
    const jobId = path.basename(filepath).split(".")[0];
    const filename = path.basename(filepath);
    const codesDir = path.dirname(filepath);

    return new Promise((resolve, reject) => {
        // ----- Build the docker run command -----
        // Notice we do NOT mount the host outputs folder anymore.
        // The binary gets compiled strictly inside the transient docker sandbox.
        const volumes = [
            "-v", `${codesDir}:/sandbox/codes:ro`,
        ];

        // Inner shell command: compile then execute
        let innerCmd =
            `g++ /sandbox/codes/${filename} -o /sandbox/${jobId}.out` +
            ` && /sandbox/${jobId}.out`;

        // If an input file is provided, mount it and redirect into stdin
        if (inputPath) {
            const inputFilename = path.basename(inputPath);
            const inputDir = path.dirname(inputPath);
            volumes.push("-v", `${inputDir}:/sandbox/input:ro`);
            innerCmd += ` < /sandbox/input/${inputFilename}`;
        }

        const args = [
            "run", "--rm",
            "--network=none", // Safer format for spawn
            "--memory=128m",
            "--cpus=0.5",
            ...volumes,
            DOCKER_IMAGE,
            "sh", "-c", innerCmd
        ];

        let outputData = "";
        let errorData = "";
        let outputSize = 0;
        let killed = false;

        const process = spawn("docker", args);

        // Timer for Time Limit Exceeded (TLE)
        const timeoutId = setTimeout(() => {
            killed = true;
            process.kill("SIGKILL");
            reject({ type: "Runtime Error", message: "TLE (Time Limit Exceeded)" });
        }, 15000);

        const handleData = (data, isErrorStream) => {
            if (killed) return;

            outputSize += data.length;
            if (outputSize > MAX_OUTPUT_SIZE) {
                killed = true;
                process.kill("SIGKILL");
                clearTimeout(timeoutId);
                return reject({ type: "Runtime Error", message: "Output Limit Exceeded (1MB cap)" });
            }

            if (isErrorStream) {
                errorData += data.toString();
            } else {
                outputData += data.toString();
            }
        };

        process.stdout.on("data", (data) => handleData(data, false));
        process.stderr.on("data", (data) => handleData(data, true));

        process.on("close", (code) => {
            clearTimeout(timeoutId);
            if (killed) return; // Promise already rejected by timeout or size limit

            if (code !== 0) {
                // Compilation errors usually go to stderr and contain "error:"
                if (errorData.includes("error:")) {
                    return reject({ type: "Compilation Error", message: errorData });
                }
                return reject({ type: "Runtime Error", message: errorData || `Process exited with code ${code}` });
            }

            resolve(outputData);
        });
    });
};

module.exports = {
    executeCpp,
};
