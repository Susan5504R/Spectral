const { spawn } = require("child_process");
const path = require("path");

const DOCKER_IMAGE = "spectral-runner";
const MAX_OUTPUT_SIZE = 1024 * 1024;

const executePython = (filepath, inputPath) => {
    const filename = path.basename(filepath);
    const inputFilename = inputPath ? path.basename(inputPath) : null;
    const hostPath = process.env.HOST_PWD || path.resolve(__dirname, "..");

    return new Promise((resolve, reject) => {
        const volumes = ["-v", `${hostPath}/codes:/sandbox/codes:ro`];
        if (inputPath) volumes.push("-v", `${hostPath}/inputs:/sandbox/inputs:ro`);

        let innerCmd = `python3 /sandbox/codes/${filename}`;
        if (inputPath) innerCmd += ` < /sandbox/inputs/${inputFilename}`;
        
        // Append memory tracking
        innerCmd = `${innerCmd}; RET=$?; echo "METRICS_MEM $(cat /sys/fs/cgroup/memory.peak 2>/dev/null || echo 0)" >&2; exit $RET`;

        const args = [
            "run", "--rm", "--network=none",
            "--memory=128m", "--cpus=0.5",
            ...volumes, DOCKER_IMAGE, "sh", "-c", innerCmd
        ];

        let outputData = "", errorData = "", outputSize = 0, killed = false;
        const startTime = process.hrtime.bigint();

        const child = spawn("docker", args);

        const timeoutId = setTimeout(() => {
            killed = true;
            child.kill("SIGKILL");
            const err = new Error("TLE (Time Limit Exceeded)");
            err.type = "Time Limit Exceeded";
            reject(err);
        }, 10000);

        const handleData = (data, isErr) => {
            if (killed) return;
            outputSize += data.length;

            if (outputSize > MAX_OUTPUT_SIZE) {
                killed = true;
                child.kill("SIGKILL");
                clearTimeout(timeoutId);
                const err = new Error("Output Limit Exceeded");
                err.type = "Runtime Error";
                return reject(err);
            }

            if (isErr) errorData += data.toString();
            else outputData += data.toString();
        };

        child.stdout.on("data", d => handleData(d, false));
        child.stderr.on("data", d => handleData(d, true));

        child.on("close", (code) => {
            const endTime = process.hrtime.bigint();
            clearTimeout(timeoutId);
            if (killed) return;

            // Extract metrics from errorData
            let memory = 0;
            const metricsMatch = errorData.match(/METRICS_MEM (\d+)/);
            if (metricsMatch) {
                memory = parseInt(metricsMatch[1]) / 1024 / 1024; // MB
                errorData = errorData.replace(/METRICS_MEM \d+\n?/, "").trim();
            }
            const time = Number(endTime - startTime) / 1e6; // ms

            if (code !== 0) {
                if (errorData.toLowerCase().includes("syntaxerror") || errorData.toLowerCase().includes("indentationerror")) {
                    const err = new Error(errorData);
                    err.type = "Compilation Error";
                    return reject(err);
                }
                const err = new Error(errorData || `Exited with code ${code}`);
                err.type = "Runtime Error";
                return reject(err);
            }

            resolve({ output: outputData, time, memory });
        });

        child.on("error", (e) => {
            clearTimeout(timeoutId);
            const err = new Error(e.message);
            err.type = "System Error";
            reject(err);
        });
    });
};

module.exports = { executePython };