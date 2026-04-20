const http = require("http");

function submitCode(code, language, problemId = "test_problem_123") {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ code, language, problemId, input: "" });
        const req = http.request(
            { hostname: "127.0.0.1", port: 5000, path: "/submit", method: "POST", headers: { "Content-Type": "application/json" } },
            (res) => {
                let body = "";
                res.on("data", (chunk) => (body += chunk));
                res.on("end", () => resolve(JSON.parse(body)));
            }
        );
        req.on("error", reject);
        req.write(data);
        req.end();
    });
}

function checkPlagiarism(submissionId) {
    return new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:5000/plagiarism/${submissionId}`, (res) => {
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => resolve(JSON.parse(body)));
        }).on("error", reject);
    });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runTest() {
    console.log("🚀 Starting Anti-Cheat Test...");

    const originalCode = `
#include <iostream>
using namespace std;
int main() {
    int a = 10;
    int b = 20;
    cout << a + b;
    return 0;
}`;

    const plagiarizedCode = `
#include <iostream>
using namespace std;
int main() {
    int x1 = 10; // Renamed variables
    int y2 = 20; // Changed formatting
    cout << x1 + y2;
    return 0;
}`;

    console.log("1️⃣ Submitting Original Code...");
    const sub1 = await submitCode(originalCode, "cpp");
    console.log("✅ Original accepted! Output:", sub1);

    console.log("\n2️⃣ Submitting Plagiarized Code...");
    const sub2 = await submitCode(plagiarizedCode, "cpp");
    console.log("✅ Plagiarized accepted! Output:", sub2);

    console.log("\n⏳ Waiting 30 seconds for execution + fingerprint + anticheat pipeline...");
    await sleep(30000);

    console.log("\n3️⃣ Fetching Plagiarism Report for the new submission...");
    const report = await checkPlagiarism(sub2.submissionId);
    console.dir(report, { depth: null, colors: true });

    if (report.checks && report.checks.length > 0) {
        console.log("\n🔥 MATCH FOUND! Structural Jaccard Score:", report.checks[0].jaccardScore);
        console.log("AI Verdict:", report.checks[0].verdict);
    } else {
        console.log("\n⚠️ No matches found. Ensure the anticheat worker is running!");
    }
}

runTest();
