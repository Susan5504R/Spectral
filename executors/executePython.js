const { spawn } = require("child_process");
const path = require("path");

const DOCKER_IMAGE = "spectral-runner"; 
const MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB

const executePython = (filepath, inputPath) => {
    const filename = path.basename(filepath);
    const inputFilename = inputPath ? path.basename(inputPath) : null;
    const hostPath = process.env.HOST_PWD || path.resolve(__dirname, "..");

    return new Promise((resolve, reject) => {
        const volumes = ["-v", `${hostPath}/codes:/sandbox/codes:ro` ];
        if (inputPath) {
            volumes.push("-v", `${hostPath}/inputs:/sandbox/inputs:ro`);
        }

        let innerCmd = `python3 /sandbox/codes/${filename}`;
        if (inputPath) {
            innerCmd += ` < /sandbox/inputs/${inputFilename}`;
        }

        const args = [
            "run", "--rm", "--network=none", 
            "--memory=128m", "--cpus=0.5", 
            ...volumes, DOCKER_IMAGE, "sh", "-c", innerCmd
        ];

        let outputData = "";
        let errorData = "";
        let outputSize = 0;
        let killed = false;

        const childProcess = spawn("docker", args);

        // 1. TIMEOUT LOGIC (Prevents hanging)
        const timeoutId = setTimeout(() => {
            killed = true;
            childProcess.kill("SIGKILL");
            reject({ type: "Runtime Error", message: "TLE (Time Limit Exceeded)" });
        }, 10000);

        // 2. DATA HANDLING LOGIC
        const handleData = (data, isErrorStream) => {
            if (killed) return;
            outputSize += data.length;
            if (outputSize > MAX_OUTPUT_SIZE) {
                killed = true;
                childProcess.kill("SIGKILL");
                clearTimeout(timeoutId);
                return reject({ type: "Runtime Error", message: "Output Limit Exceeded" });
            }

            if (isErrorStream) errorData += data.toString();
            else outputData += data.toString();
        };

        childProcess.stdout.on("data", (data) => handleData(data, false));
        childProcess.stderr.on("data", (data) => handleData(data, true));

        // 3. CLOSE LOGIC (This is what makes the worker move to the next job!)
        childProcess.on("close", (code) => {
            clearTimeout(timeoutId);
            if (killed) return;

            if (code !== 0) {
                return reject({ type: "Runtime Error", message: errorData || `Exited with code ${code}` });
            }
            resolve(outputData);
        });

        childProcess.on("error", (err) => {
            clearTimeout(timeoutId);
            reject({ type: "System Error", message: err.message });
        });
    });
};

module.exports = { executePython };