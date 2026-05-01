import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import {
  ArrowLeft, Play, Send, RotateCcw, Terminal, Code2, Info,
  Workflow, X, History, BookOpen, Lightbulb, Tag, CheckCircle2, XCircle, Clock
} from "lucide-react";
import ASTGraphViewer from "../components/ASTGraphViewer";

const BOILERPLATE = {
  cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write code here\n    return 0;\n}",
  python: "def solution():\n    # Write code here\n    pass\n\nif __name__ == '__main__':\n    solution()",
  java: "public class Main {\n    public static void main(String[] args) {\n        // Write code here\n    }\n}"
};

const MONACO_LANG = { cpp: "cpp", python: "python", java: "java" };

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function StatusBadge({ status }) {
  const styles =
    status === "Accepted"
      ? "bg-emerald-500/20 text-emerald-400"
      : status === "Pending" || status === "Queued"
      ? "bg-blue-500/20 text-blue-400"
      : "bg-rose-500/20 text-rose-400";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${styles}`}>
      {status}
    </span>
  );
}

export default function Problem() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("cpp");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  // Left panel tabs
  const [leftTab, setLeftTab] = useState("description");

  // Editorial
  const [editorial, setEditorial] = useState(null);
  const [editorialLoading, setEditorialLoading] = useState(false);
  const editorialFetched = useRef(false);

  // Submission history
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const submissionsFetched = useRef(false);

  // Hint
  const [hint, setHint] = useState(null);
  const [hintLoading, setHintLoading] = useState(false);

  const token = () => localStorage.getItem("token");

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const res = await fetch(`${API}/problems/${id}`, {
          headers: { Authorization: `Bearer ${token()}` }
        });
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }
        const data = await res.json();
        setProblem(data);
        setCode(BOILERPLATE["cpp"]);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };
    fetchProblem();
  }, [id]);

  const fetchEditorial = async () => {
    if (editorialFetched.current) return;
    editorialFetched.current = true;
    setEditorialLoading(true);
    try {
      const res = await fetch(`${API}/problems/${id}/editorial`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      setEditorial(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setEditorialLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    setSubmissionsLoading(true);
    try {
      const res = await fetch(`${API}/problems/${id}/submissions`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      setSubmissions(Array.isArray(data) ? data : []);
      submissionsFetched.current = true;
    } catch (err) {
      console.error(err);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleLeftTab = (tab) => {
    setLeftTab(tab);
    if (tab === "editorial" && !editorialFetched.current) fetchEditorial();
    if (tab === "history") fetchSubmissions();
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setCode(BOILERPLATE[newLang]);
  };

  const handleExecute = async (endpoint) => {
    setLoading(true);
    setResult(null);
    setHint(null);

    const body =
      endpoint === "/run"
        ? { code, language, input: problem.testCases?.[0]?.input ?? "" }
        : { code, language, problemId: id };

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(body)
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error || "Failed to execute" });
        setLoading(false);
        return;
      }

      setResult({ status: "Queued", submissionId: data.submissionId });
      pollStatus(data.submissionId);
    } catch (err) {
      setResult({ error: "Failed to connect to server" });
      setLoading(false);
    }
  };

  const pollStatus = (subId) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/status/${subId}`, {
          headers: { Authorization: `Bearer ${token()}` }
        });
        const data = await res.json();
        if (data.status !== "Pending") {
          setResult(data);
          setLoading(false);
          clearInterval(interval);
          if (leftTab === "history") fetchSubmissions();
        }
      } catch (err) {
        clearInterval(interval);
        setLoading(false);
      }
    }, 2000);
  };

  const fetchHint = async () => {
    if (!result?.id) return;
    setHintLoading(true);
    setHint(null);
    try {
      const res = await fetch(`${API}/hint/${result.id}`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      setHint(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setHintLoading(false);
    }
  };

  if (!problem)
    return (
      <div className="h-screen bg-[#0a0a0a] flex items-center justify-center text-blue-500 animate-pulse">
        Loading Environment...
      </div>
    );

  const isFailed =
    result?.status &&
    !["Accepted", "Queued", "Pending"].includes(result.status);

  return (
    <div className="h-screen bg-[#0a0a0a] text-slate-200 flex flex-col font-sans">
      {/* ─── Header ─── */}
      <header className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/5 rounded-lg transition text-slate-400 hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="h-4 w-px bg-white/10" />
          <h1 className="font-semibold text-sm tracking-tight">{problem.title}</h1>
          <span
            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
              problem.difficulty === "Easy"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : problem.difficulty === "Medium"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            }`}
          >
            {problem.difficulty}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-[#2a2a2a] p-1 rounded-lg border border-white/5">
            {["cpp", "python", "java"].map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`px-3 py-1 text-xs rounded-md capitalize transition ${
                  language === lang
                    ? "bg-[#3a3a3a] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {lang === "cpp" ? "C++" : lang}
              </button>
            ))}
          </div>
          <button
            onClick={() => handleExecute("/run")}
            disabled={loading}
            className="flex items-center gap-2 bg-[#2a2a2a] hover:bg-[#333] px-4 py-1.5 rounded-lg text-xs font-medium border border-white/5 transition disabled:opacity-50"
          >
            <Play size={14} className="fill-current" /> Run
          </button>
          <button
            onClick={() => setShowGraph(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 px-4 py-1.5 rounded-lg text-xs font-semibold text-white shadow-lg shadow-purple-900/20 transition"
          >
            <Workflow size={14} /> AST Graph
          </button>
          <button
            onClick={() => handleExecute("/submit")}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded-lg text-xs font-semibold text-white shadow-lg shadow-blue-900/20 transition disabled:opacity-50"
          >
            <Send size={14} /> Submit
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-2 gap-2">
        {/* ─── Left Panel ─── */}
        <section className="w-[38%] flex flex-col bg-[#141414] rounded-xl border border-white/5 overflow-hidden">
          {/* Tab bar */}
          <div className="flex shrink-0 border-b border-white/5 bg-white/[0.02]">
            {[
              { key: "description", icon: Info, label: "Description" },
              { key: "editorial", icon: BookOpen, label: "Editorial" },
              { key: "history", icon: History, label: "History" }
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => handleLeftTab(key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider transition border-b-2 ${
                  leftTab === key
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
            {/* ── Description ── */}
            {leftTab === "description" && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold mb-3">{problem.title}</h2>
                  <p className="text-slate-400 leading-relaxed text-sm whitespace-pre-line">
                    {problem.description}
                  </p>
                </div>

                {problem.constraints && (
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Constraints
                    </h3>
                    <pre className="text-slate-300 bg-white/[0.04] p-3 rounded-lg border border-white/5 text-xs leading-relaxed whitespace-pre-wrap">
                      {problem.constraints}
                    </pre>
                  </div>
                )}

                {problem.topics?.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                      <Tag size={10} /> Topics
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {problem.topics.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {problem.testCases?.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Examples
                    </h3>
                    <div className="space-y-3">
                      {problem.testCases.map((tc, i) => (
                        <div
                          key={i}
                          className="bg-white/[0.03] border border-white/5 rounded-lg p-3 space-y-2 text-xs font-mono"
                        >
                          <div>
                            <span className="text-slate-500 text-[10px] uppercase font-bold">
                              Input
                            </span>
                            <pre className="text-slate-300 mt-1 whitespace-pre-wrap">
                              {tc.input}
                            </pre>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] uppercase font-bold">
                              Output
                            </span>
                            <pre className="text-slate-300 mt-1 whitespace-pre-wrap">
                              {tc.output}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Editorial ── */}
            {leftTab === "editorial" && (
              <div>
                {editorialLoading ? (
                  <div className="text-slate-500 text-sm text-center py-12">
                    Loading editorial...
                  </div>
                ) : editorial ? (
                  <div className="space-y-5">
                    {editorial.editorialDescription && (
                      <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Approach
                        </h3>
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                          {editorial.editorialDescription}
                        </p>
                      </div>
                    )}
                    {editorial.editorialSolutions &&
                      Object.keys(editorial.editorialSolutions).length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Solutions
                          </h3>
                          {Object.entries(editorial.editorialSolutions).map(
                            ([lang, sol]) => (
                              <div key={lang}>
                                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">
                                  {lang === "cpp" ? "C++" : lang}
                                </div>
                                <pre className="text-slate-300 bg-white/[0.04] p-3 rounded-lg border border-white/5 text-xs overflow-x-auto whitespace-pre-wrap">
                                  {sol}
                                </pre>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    {!editorial.editorialDescription &&
                      (!editorial.editorialSolutions ||
                        Object.keys(editorial.editorialSolutions).length === 0) && (
                        <p className="text-slate-500 text-sm text-center py-12">
                          No editorial available yet.
                        </p>
                      )}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm text-center py-12">
                    No editorial available.
                  </p>
                )}
              </div>
            )}

            {/* ── History ── */}
            {leftTab === "history" && (
              <div>
                {submissionsLoading ? (
                  <div className="text-slate-500 text-sm text-center py-12">
                    Loading history...
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="text-slate-500 text-sm text-center py-12 border-2 border-dashed border-white/5 rounded-xl">
                    No submissions yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {submissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="bg-white/[0.03] border border-white/5 rounded-lg p-3 text-xs"
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <StatusBadge status={sub.status} />
                          <span className="text-slate-500 capitalize">
                            {sub.language === "cpp" ? "C++" : sub.language}
                          </span>
                        </div>
                        {sub.ExecutionMetric && (
                          <div className="flex gap-3 text-slate-500 mb-1">
                            <span className="flex items-center gap-1">
                              <Clock size={9} />
                              {sub.ExecutionMetric.execution_time_ms?.toFixed(1)} ms
                            </span>
                            <span>
                              {sub.ExecutionMetric.memory_used_mb?.toFixed(1)} MB
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">
                            {new Date(sub.createdAt).toLocaleString()}
                          </span>
                          {sub.status === "Accepted" && (
                            <button
                              onClick={() =>
                                navigate(`/plagiarism/${sub.id}`)
                              }
                              className="text-[10px] text-slate-500 hover:text-blue-400 transition"
                            >
                              View Report
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ─── Right Panel: Editor + Console ─── */}
        <section className="flex-1 flex flex-col gap-2 min-w-0">
          <div className="flex-1 bg-[#141414] rounded-xl border border-white/5 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/[0.02]">
              <Code2 size={16} className="text-purple-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Editor
              </span>
            </div>
            <Editor
              theme="vs-dark"
              language={MONACO_LANG[language] || "cpp"}
              value={code}
              onChange={(val) => setCode(val)}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                padding: { top: 20 },
                lineNumbersMinChars: 3,
                smoothScrolling: true,
                cursorSmoothCaretAnimation: "on"
              }}
            />
          </div>

          <div className="h-[35%] bg-[#141414] rounded-xl border border-white/5 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Console Output
                </span>
              </div>
              <button
                onClick={() => {
                  setResult(null);
                  setHint(null);
                }}
                className="p-1 hover:bg-white/5 rounded transition text-slate-500"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            <div className="flex-1 p-4 font-mono text-sm overflow-y-auto bg-[#0d0d0d]">
              {loading && (
                <div className="text-blue-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                  Waiting for sandbox...
                </div>
              )}

              {result && (
                <div className="space-y-3">
                  {/* Status + Hint trigger */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      {result.status === "Accepted" ? (
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      ) : isFailed ? (
                        <XCircle size={16} className="text-rose-400" />
                      ) : null}
                      <StatusBadge status={result.status} />
                    </div>
                    {isFailed && result.id && (
                      <button
                        onClick={fetchHint}
                        disabled={hintLoading}
                        className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-bold uppercase transition hover:bg-amber-500/20 disabled:opacity-50"
                      >
                        <Lightbulb size={10} />
                        {hintLoading ? "Loading..." : "Get Hint"}
                      </button>
                    )}
                  </div>

                  {/* Wrong-answer details */}
                  {result.details && (
                    <div className="border border-rose-500/20 bg-rose-500/5 rounded-lg p-3 space-y-2 text-xs">
                      {result.details.isHidden ? (
                        <p className="text-rose-400">
                          Failed on a hidden test case.
                        </p>
                      ) : (
                        <>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold">
                              Input
                            </span>
                            <pre className="text-slate-300 mt-1">
                              {result.details.input}
                            </pre>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold">
                              Expected
                            </span>
                            <pre className="text-emerald-400 mt-1">
                              {result.details.expected}
                            </pre>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold">
                              Got
                            </span>
                            <pre className="text-rose-400 mt-1">
                              {result.details.actual}
                            </pre>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Plain output (run mode) */}
                  {result.output && !result.details && (
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500 uppercase">
                        Output:
                      </span>
                      <pre className="text-slate-300 bg-white/[0.03] p-3 rounded-lg border border-white/5">
                        {result.output}
                      </pre>
                    </div>
                  )}

                  {/* Compiler / runtime error */}
                  {result.error && (
                    <pre className="text-rose-400 bg-rose-500/5 p-3 rounded-lg border border-rose-500/20 text-xs">
                      {result.error}
                    </pre>
                  )}

                  {/* Hint callout */}
                  {hint && (
                    <div className="border border-amber-500/20 bg-amber-500/5 rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-1 text-amber-400 text-[10px] font-bold uppercase mb-1">
                        <Lightbulb size={10} /> Hint
                      </div>
                      <p className="text-amber-200 text-xs leading-relaxed">
                        {hint.hint ||
                          hint.geminiHint ||
                          hint.message ||
                          JSON.stringify(hint)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ─── AST Graph Modal ─── */}
      {showGraph && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 w-full h-full max-w-7xl max-h-[90vh] rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950 shrink-0">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Workflow className="text-purple-500" /> Problem AST Evolution
              </h2>
              <button
                onClick={() => setShowGraph(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 w-full relative">
              <ASTGraphViewer problemId={id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
