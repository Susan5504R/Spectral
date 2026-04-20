import { useParams } from "react-router-dom";
import { useState } from "react";
import Editor from "@monaco-editor/react";

const problemData = {
  id: 1,
  title: "Two Sum",
  difficulty: "Easy",
  description:
    "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
  constraints: ["2 ≤ nums.length ≤ 10^4", "-10^9 ≤ nums[i] ≤ 10^9"],
  testcases: [
    { input: "[2,7,11,15], target=9", output: "[0,1]" },
    { input: "[3,2,4], target=6", output: "[1,2]" },
  ],
};

export default function Problem() {
  const { id } = useParams();

  const [code, setCode] = useState("// Write your solution here");
  const [language, setLanguage] = useState("javascript");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runCode = () => {
    setLoading(true);

    setTimeout(() => {
      setResult({
        type: "run",
        passed: 2,
        total: 2,
        time: "0.12s",
        details: [
          { status: "Passed" },
          { status: "Passed" },
        ],
      });
      setLoading(false);
    }, 1000);
  };

  const submitCode = () => {
    setLoading(true);

    setTimeout(() => {
      setResult({
        type: "submit",
        passed: 8,
        total: 10,
        time: "0.35s",
        details: Array(10)
          .fill(0)
          .map((_, i) => ({
            status: i < 8 ? "Passed" : "Failed",
          })),
      });
      setLoading(false);
    }, 1500);
  };

  const resetCode = () => {
    setCode("// Write your solution here");
    setResult(null);
  };

  return (
    <div className="h-screen bg-slate-900 text-white flex">

      {/* LEFT: Problem Description */}
      <div className="w-1/2 border-r border-slate-700 p-6 overflow-auto">
        <h1 className="text-xl font-semibold mb-2">
          {problemData.title}
        </h1>

        <p className="text-slate-400 mb-4">
          {problemData.description}
        </p>

        <h2 className="font-semibold mt-4 mb-2">Constraints:</h2>
        <ul className="text-sm text-slate-400 list-disc pl-5">
          {problemData.constraints.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>

        <h2 className="font-semibold mt-4 mb-2">Test Cases:</h2>
        {problemData.testcases.map((tc, i) => (
          <div key={i} className="bg-slate-800 p-3 rounded mb-2 text-sm">
            <div>Input: {tc.input}</div>
            <div>Output: {tc.output}</div>
          </div>
        ))}
      </div>

      {/* RIGHT: Editor */}
      <div className="w-1/2 flex flex-col">

        {/* Controls */}
        <div className="flex justify-between items-center p-3 border-b border-slate-700">
          
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-slate-800 px-2 py-1 rounded"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
          </select>

          <div className="flex gap-2">
            <button onClick={runCode} className="bg-blue-600 px-3 py-1 rounded">
              Run
            </button>

            <button onClick={submitCode} className="bg-green-600 px-3 py-1 rounded">
              Submit
            </button>

            <button onClick={resetCode} className="bg-red-600 px-3 py-1 rounded">
              Reset
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1">
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={(value) => setCode(value || "")}
            theme="vs-dark"
          />
        </div>

        {/* Results */}
        <div className="h-48 border-t border-slate-700 p-3 overflow-auto bg-black">
          
          {loading && <p className="text-blue-400">Running...</p>}

          {result && (
            <div>
              <p className="mb-2">
                Passed {result.passed}/{result.total} test cases
              </p>
              <p className="text-sm text-slate-400 mb-2">
                Execution Time: {result.time}
              </p>

              <div className="grid grid-cols-5 gap-2">
                {result.details.map((d, i) => (
                  <div
                    key={i}
                    className={`text-xs px-2 py-1 rounded ${
                      d.status === "Passed"
                        ? "bg-green-600"
                        : "bg-red-600"
                    }`}
                  >
                    {d.status}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}