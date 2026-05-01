import { useState } from "react";
import api from "../api/axiosInstance";

export default function AddProblem() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [topics, setTopics] = useState("");

  const [testCases, setTestCases] = useState([
    { input: "", expectedOutput: "", isHidden: false }
  ]);

  const [message, setMessage] = useState("");

  // 🔥 Handle change
  const handleTestCaseChange = (index, field, value) => {
    const updated = [...testCases];
    updated[index][field] = value;
    setTestCases(updated);
  };

  // ➕ Add testcase
  const addTestCase = () => {
    setTestCases([
      ...testCases,
      { input: "", expectedOutput: "", isHidden: false }
    ]);
  };

  // ❌ Remove testcase
  const removeTestCase = (index) => {
    const updated = testCases.filter((_, i) => i !== index);
    setTestCases(updated);
  };

  // 🚀 Submit
  const handleAddProblem = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");

      const { data } = await api.post(
        "/admin/problem",
        {
          title,
          description,
          difficulty,
          topics: topics.split(",").map((t) => t.trim()),
          testCases: testCases.map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden
          }))
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setMessage(`Problem created: ${data.problemId}`);
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to create problem");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <form
        onSubmit={handleAddProblem}
        className="bg-slate-800 p-8 rounded-xl w-full max-w-xl flex flex-col gap-4"
      >
        <h2 className="text-2xl font-bold text-center">
          Admin: Add Problem
        </h2>

        {/* Title */}
        <input
          className="p-2 bg-slate-900 border border-slate-600 rounded"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        {/* Description */}
        <textarea
          className="p-2 bg-slate-900 border border-slate-600 rounded"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        {/* Difficulty */}
        <select
          className="p-2 bg-slate-900 border border-slate-600 rounded"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option>Easy</option>
          <option>Medium</option>
          <option>Hard</option>
        </select>

        {/* Topics */}
        <input
          className="p-2 bg-slate-900 border border-slate-600 rounded"
          placeholder="Topics (comma separated)"
          value={topics}
          onChange={(e) => setTopics(e.target.value)}
        />

        {/* 🔥 MULTIPLE TESTCASES */}
        <div className="flex flex-col gap-3">
          <h3 className="font-semibold">Test Cases</h3>

          {testCases.map((tc, index) => (
            <div
              key={index}
              className="border border-slate-600 rounded p-3 flex flex-col gap-2"
            >
              <textarea
                className="p-2 bg-slate-900 border border-slate-600 rounded"
                placeholder={`Testcase ${index + 1} Input`}
                value={tc.input}
                onChange={(e) =>
                  handleTestCaseChange(index, "input", e.target.value)
                }
                required
              />

              <textarea
                className="p-2 bg-slate-900 border border-slate-600 rounded"
                placeholder={`Testcase ${index + 1} Expected Output`}
                value={tc.expectedOutput}
                onChange={(e) =>
                  handleTestCaseChange(index, "expectedOutput", e.target.value)
                }
                required
              />

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={tc.isHidden}
                  onChange={(e) =>
                    handleTestCaseChange(
                      index,
                      "isHidden",
                      e.target.checked
                    )
                  }
                />
                Hidden testcase
              </label>

              {testCases.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTestCase(index)}
                  className="text-red-400 text-sm"
                >
                  Remove testcase
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addTestCase}
            className="bg-yellow-500 text-black py-2 rounded"
          >
            + Add Testcase
          </button>
        </div>

        {/* Submit */}
        <button className="bg-blue-600 py-2 rounded font-semibold">
          Create Problem
        </button>

        {message && (
          <p className="text-center text-sm mt-2">{message}</p>
        )}
      </form>
    </div>
  );
}