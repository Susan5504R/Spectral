import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const EMPTY_CASE = { input: "", expectedOutput: "", isHidden: true };

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-warm-muted mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-surface-darker dark:bg-sunset-50 border border-surface-border dark:border-sunset-200 rounded-xl px-4 py-2.5 text-sm text-warm-text dark:text-surface-darker focus:border-sunset-500 focus:ring-1 focus:ring-sunset-500 outline-none transition-all";

export default function AdminProblem() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    constraints: "",
    difficulty: "Easy",
    topics: "",
    editorialDescription: "",
    editorialCpp: "",
    editorialPython: "",
    editorialJava: ""
  });

  const [testCases, setTestCases] = useState([{ ...EMPTY_CASE }]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const set = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const updateCase = (i, key, value) =>
    setTestCases((prev) => prev.map((tc, idx) => (idx === i ? { ...tc, [key]: value } : tc)));

  const addCase = () => setTestCases((prev) => [...prev, { ...EMPTY_CASE }]);
  const removeCase = (i) => setTestCases((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    const topics = form.topics
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const editorialSolutions = {};
    if (form.editorialCpp.trim()) editorialSolutions.cpp = form.editorialCpp.trim();
    if (form.editorialPython.trim()) editorialSolutions.python = form.editorialPython.trim();
    if (form.editorialJava.trim()) editorialSolutions.java = form.editorialJava.trim();

    const payload = {
      title: form.title,
      description: form.description,
      constraints: form.constraints || undefined,
      difficulty: form.difficulty,
      topics,
      editorialDescription: form.editorialDescription || undefined,
      editorialSolutions: Object.keys(editorialSolutions).length ? editorialSolutions : undefined,
      testCases
    };

    try {
      const res = await fetch(`${API}/admin/problem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ ok: true, message: `Problem created (ID: ${data.problemId})` });
        setTimeout(() => navigate("/problems"), 1500);
      } else {
        setFeedback({ ok: false, message: data.error || "Creation failed" });
      }
    } catch {
      setFeedback({ ok: false, message: "Failed to connect to server" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-darker dark:bg-sunset-50 text-warm-text dark:text-surface-darker flex flex-col">
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 py-8 w-full flex-1">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-warm-muted hover:text-warm-text transition neo-btn px-3 py-1.5 rounded-lg bg-surface-raised border border-surface-border"
        >
          <ArrowLeft size={18} /> Back
        </button>

        <h1 className="text-2xl font-bold mb-8">Create Problem</h1>

        {feedback && (
          <div
            className={`mb-6 p-4 rounded-xl border text-sm font-medium ${
              feedback.ok
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
            }`}
          >
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Core details */}
          <div className="neo-panel p-6 space-y-5">
            <h2 className="font-semibold text-warm-text">Problem Details</h2>

            <Field label="Title">
              <input type="text" value={form.title} onChange={set("title")} required className={inputCls} placeholder="Two Sum" />
            </Field>

            <Field label="Description">
              <textarea rows={5} value={form.description} onChange={set("description")} required className={`${inputCls} resize-none`} placeholder="Given an array of integers nums and an integer target..." />
            </Field>

            <Field label="Constraints">
              <textarea rows={3} value={form.constraints} onChange={set("constraints")} className={`${inputCls} resize-none`} placeholder={"2 ≤ nums.length ≤ 10⁴\n-10⁹ ≤ nums[i] ≤ 10⁹"} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Difficulty">
                <select value={form.difficulty} onChange={set("difficulty")} className={inputCls}>
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </Field>

              <Field label="Topics (comma-separated)">
                <input type="text" value={form.topics} onChange={set("topics")} className={inputCls} placeholder="Arrays, Hash Table" />
              </Field>
            </div>
          </div>

          {/* Test cases */}
          <div className="neo-panel p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-warm-text">Test Cases</h2>
              <button type="button" onClick={addCase} className="flex items-center gap-1.5 text-xs bg-warm-gold/10 text-warm-gold hover:bg-warm-gold/20 px-3 py-1.5 rounded-lg border border-warm-gold/30 transition font-bold">
                <Plus size={13} /> Add Case
              </button>
            </div>

            {testCases.map((tc, i) => (
              <div key={i} className="border border-surface-border dark:border-sunset-200 rounded-xl p-4 space-y-3 relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-warm-muted uppercase">Case {i + 1}</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-warm-muted cursor-pointer">
                      <input type="checkbox" checked={tc.isHidden} onChange={(e) => updateCase(i, "isHidden", e.target.checked)} className="accent-sunset-500" />
                      Hidden
                    </label>
                    {testCases.length > 1 && (
                      <button type="button" onClick={() => removeCase(i)} className="text-rose-500 hover:text-rose-400 transition">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Input">
                    <textarea rows={3} value={tc.input} onChange={(e) => updateCase(i, "input", e.target.value)} required className={`${inputCls} resize-none font-mono text-xs`} placeholder={"[2,7,11,15]\n9"} />
                  </Field>
                  <Field label="Expected Output">
                    <textarea rows={3} value={tc.expectedOutput} onChange={(e) => updateCase(i, "expectedOutput", e.target.value)} required className={`${inputCls} resize-none font-mono text-xs`} placeholder="[0,1]" />
                  </Field>
                </div>
              </div>
            ))}
          </div>

          {/* Editorial */}
          <div className="neo-panel p-6 space-y-5">
            <h2 className="font-semibold text-warm-text">Editorial (optional)</h2>

            <Field label="Approach">
              <textarea rows={4} value={form.editorialDescription} onChange={set("editorialDescription")} className={`${inputCls} resize-none`} placeholder="Use a hash map to store each number and its index..." />
            </Field>

            {[
              { key: "editorialCpp", label: "C++ Solution" },
              { key: "editorialPython", label: "Python Solution" },
              { key: "editorialJava", label: "Java Solution" }
            ].map(({ key, label }) => (
              <Field key={key} label={label}>
                <textarea rows={5} value={form[key]} onChange={set(key)} className={`${inputCls} resize-none font-mono text-xs`} />
              </Field>
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
