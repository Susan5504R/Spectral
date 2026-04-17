const { spawn } = require("child_process");
const path = require("path");

const DOCKER_IMAGE = "spectral-runner"; 
const MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB limit

const executeC = (filepath, inputPath) => {
    const jobId = path.basename(filepath).split(".")[0];
    const filename = path.basename(filepath);
    const inputFilename = inputPath ? path.basename(inputPath) : null;
    const hostPath = process.env.HOST_PWD || path.resolve(__dirname, "..");

    return new Promise((resolve, reject) => {
        const volumes = ["-v", `${hostPath}/codes:/sandbox/codes:ro` ];
        if (inputPath) {
            volumes.push("-v", `${hostPath}/inputs:/sandbox/inputs:ro`);
        }

        // Compile with gcc to /tmp (writable) and then execute
        let innerCmd = `gcc /sandbox/codes/${filename} -o /tmp/${jobId}.out && /tmp/${jobId}.out`;
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

        // 1. TLE Protection (10 seconds)
        const timeoutId = setTimeout(() => {
            killed = true;
            childProcess.kill("SIGKILL");
            reject({ type: "Runtime Error", message: "TLE (Time Limit Exceeded)" });
        }, 10000);

        // 2. Data stream handling
        const handleData = (data, isErrorStream) => {
            if (killed) return;
            outputSize += data.length;
            
            // Output Limit Exceeded (OLE) Protection
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

        // 3. Process Exit handling - THIS RESOLVES THE PROMISE
        childProcess.on("close", (code) => {
            clearTimeout(timeoutId);
            if (killed) return;

            if (code !== 0) {
                // Check for C compilation errors specifically
                if (errorData.includes("error:")) {
                    return reject({ type: "Compilation Error", message: errorData });
                }
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

module.exports = { executeC };