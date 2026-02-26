const { Worker } = require("bullmq");
const { executeCpp } = require("./executeCpp"); 
const { generateFile } = require("./generateFile"); 
const { generateInputFile } = require("./generateInputFile"); 
const fs = require("fs");

//Created the Worker. It listens to the "python-codes" queue.
const worker = new Worker(
    "python-codes",
    async (job) => {
        console.log(`Processing job ${job.id}...`);

        // job.data contains what the producer sent (code and input)
        const { code, input } = job.data;
        let filepath, inputPath;

        try {
            // Use our existing helper functions to create files
            filepath = await generateFile("cpp", code);
            inputPath = await generateInputFile(input);

            //Run the Docker execution logic you already perfected 
            console.log("Running Docker Sandbox...");
            const output = await executeCpp(filepath, inputPath);

            console.log(`SUCCESS for Job ${job.id}:`, output.trim());
            return output.trim(); //This result can be saved to a database later

        } catch (err) {
            console.error(`FAILED for Job ${job.id}:`, err.message);
            throw err; // BullMQ will mark this job as "failed"
        } finally {
            // Cleanup files just like in the test.js
            if (filepath && fs.existsSync(filepath)) fs.unlinkSync(filepath);
            if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        }
    },
    {
        connection: { host: "127.0.0.1", port: 6379 },
        // This limits the worker to only running 2 jobs at the same time
        // This prevents our CPU from exploding
        concurrency: 2,
    }
);

console.log("Worker is running and waiting for jobs...");
