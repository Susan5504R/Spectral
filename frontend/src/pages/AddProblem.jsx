import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { ArrowLeft, Plus, Trash2, Save, Cpu, Lock, Mail } from "lucide-react";
import api from "../api/axiosInstance";

export default function AddProblem() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [topics, setTopics] = useState("");

  const [testCases, setTestCases] = useState([
    { input: "", expectedOutput: "", isHidden: false }
  ]);

  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleTestCaseChange = (index, field, value) => {
    const updated = [...testCases];
    updated[index][field] = value;
    setTestCases(updated);
  };

  const addTestCase = () => {
    setTestCases([...testCases, { input: "", expectedOutput: "", isHidden: false }]);
  };

  const removeTestCase = (index) => {
    const updated = testCases.filter((_, i) => i !== index);
    setTestCases(updated);
  };

  const handleAddProblem = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

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
      setMessageOk(true);
      setTimeout(() => navigate("/problems"), 1500);
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to create problem");
      setMessageOk(false);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full bg-surface-darker dark:bg-sunset-50 border border-surface-border dark:border-sunset-200 rounded-xl px-4 py-2.5 text-sm text-warm-text dark:text-surface-darker focus:outline-none focus:border-sunset-500 transition-colors";

  return (
    <div className="min-h-screen bg-surface-darker dark:bg-sunset-50 text-warm-text dark:text-surface-darker flex flex-col">
      <Navbar />

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-warm-muted hover:text-warm-text transition neo-btn px-3 py-1.5 rounded-lg bg-surface-raised border border-surface-border"
        >
          <ArrowLeft size={18} /> Back
        </button>

        <h1 className="text-2xl font-black tracking-tight mb-8 flex items-center space-x-2">
          <Cpu className="w-6 h-6 text-sunset-400" />
          <span>Admin: Add Problem</span>
        </h1>

        {message && (
          <div className={`mb-6 p-4 rounded-xl border text-sm font-medium ${
            messageOk
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleAddProblem} className="space-y-6">
          <div className="neo-panel p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-warm-muted mb-1">Title</label>
              <input className={inputCls} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div>
              <label className="block text-xs font-bold text-warm-muted mb-1">Description</label>
              <textarea className={`${inputCls} resize-none`} rows={4} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-warm-muted mb-1">Difficulty</label>
                <select className={inputCls} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-warm-muted mb-1">Topics (comma separated)</label>
                <input className={inputCls} placeholder="Arrays, DP, Strings" value={topics} onChange={(e) => setTopics(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Test Cases */}
          <div className="neo-panel p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-warm-text">Test Cases</h3>
              <button type="button" onClick={addTestCase} className="flex items-center gap-1.5 text-xs bg-warm-gold/10 text-warm-gold hover:bg-warm-gold/20 px-3 py-1.5 rounded-lg border border-warm-gold/30 transition font-bold">
                <Plus size={13} /> Add Case
              </button>
            </div>

            {testCases.map((tc, index) => (
              <div key={index} className="border border-surface-border dark:border-sunset-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-warm-muted uppercase">Case {index + 1}</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-warm-muted cursor-pointer">
                      <input type="checkbox" checked={tc.isHidden} onChange={(e) => handleTestCaseChange(index, "isHidden", e.target.checked)} className="accent-sunset-500" />
                      Hidden
                    </label>
                    {testCases.length > 1 && (
                      <button type="button" onClick={() => removeTestCase(index)} className="text-rose-500 hover:text-rose-400 transition">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <textarea className={`${inputCls} resize-none font-mono text-xs`} rows={2} placeholder={`Testcase ${index + 1} Input`} value={tc.input} onChange={(e) => handleTestCaseChange(index, "input", e.target.value)} required />
                <textarea className={`${inputCls} resize-none font-mono text-xs`} rows={2} placeholder={`Testcase ${index + 1} Expected Output`} value={tc.expectedOutput} onChange={(e) => handleTestCaseChange(index, "expectedOutput", e.target.value)} required />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sunset-500 to-sunset-400 hover:from-sunset-400 hover:to-sunset-300 py-3 rounded-xl font-bold text-white shadow-lg shadow-sunset-500/20 transition-all disabled:opacity-50 hover:scale-[1.02]"
          >
            <Save size={18} />
            {submitting ? "Creating..." : "Create Problem"}
          </button>
        </form>
      </main>
    </div>
  );
}
