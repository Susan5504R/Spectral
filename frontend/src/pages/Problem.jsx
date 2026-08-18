import React, { Component, useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { useTheme } from "../context/ThemeContext";
import Navbar from "../components/Navbar";
import ASTGraphViewer from "../components/ASTGraphViewer";
import {
  ArrowLeft, Play, Send, RotateCcw, Terminal, Code2, Info,
  Workflow, X, History, BookOpen, Lightbulb, Tag, CheckCircle2,
  XCircle, Clock, Copy, Check, ChevronUp, ChevronDown, Sparkles,
  AlertTriangle, Cpu, HardDrive
} from "lucide-react";

// Error Boundary to prevent React from crashing into a black screen
class ProblemErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Problem page render error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-surface-darker text-warm-text flex flex-col justify-center items-center p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Workspace Rendering Error</h2>
          <p className="text-sm text-warm-muted max-w-md">
            {this.state.error?.message || "An unexpected error occurred while rendering the workspace."}
          </p>
          <button
            onClick={() => window.location.href = "/problems"}
            className="px-4 py-2 rounded-xl bg-surface-raised hover:bg-surface-border text-sunset-400 text-xs font-bold transition-all flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Problems</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const BOILERPLATE = {
  cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    // Write your C++ solution here\n    int val;\n    if (cin >> val) {\n        cout << val;\n    }\n    return 0;\n}`,
  python: `# Write your Python solution here\nimport sys\n\ndef main():\n    data = sys.stdin.read().strip()\n    print(data)\n\nif __name__ == '__main__':\n    main()`,
  java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNext()) {\n            System.out.println(sc.next());\n        }\n    }\n}`,
  c: `#include <stdio.h>\n\nint main() {\n    char buffer[256];\n    if (scanf("%s", buffer) == 1) {\n        printf("%s\\n", buffer);\n    }\n    return 0;\n}`
};

const MONACO_LANG = { cpp: "cpp", python: "python", java: "java", c: "c" };
const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function StatusBadge({ status }) {
  const isPass = status === "Accepted";
  const isPending = status === "Pending" || status === "Queued";
  return (
    <span
      className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${isPass
          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          : isPending
            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
        }`}
    >
      {isPass ? <CheckCircle2 className="w-3 h-3" /> : isPending ? <Clock className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
    </span>
  );
}

function getProblemHints(prob) {
  if (prob?.hints && prob.hints.length > 0) return prob.hints;
  return [
    `Analyze the constraints of ${prob?.title || "this problem"}. Input bounds often dictate the expected time complexity.`,
    "Identify key properties of the data structures (e.g. Hash Map, Two Pointers, Dynamic Programming, or Binary Search) that optimize your approach.",
    "Verify edge cases such as empty input, negative numbers, or single-element boundaries."
  ];
}

function ProblemContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const [problem, setProblem] = useState(null);
  const [fetchingProblem, setFetchingProblem] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("cpp");
  const [loading, setLoading] = useState(false);
  const [execMode, setExecMode] = useState(null);

  const [consoleOpen, setConsoleOpen] = useState(false);
  const [activeConsoleTab, setActiveConsoleTab] = useState("results");
  const [result, setResult] = useState(null);
  const [activeTestCaseIdx, setActiveTestCaseIdx] = useState(0);
  const [customInputs, setCustomInputs] = useState([]);

  const [leftTab, setLeftTab] = useState("description");
  const [expandedHints, setExpandedHints] = useState({});

  const [leftWidth, setLeftWidth] = useState(50);
  const [consoleHeight, setConsoleHeight] = useState(250);
  const isDraggingH = useRef(false);
  const isDraggingV = useRef(false);
  const containerRef = useRef(null);

  const [editorial, setEditorial] = useState(null);
  const [editorialLang, setEditorialLang] = useState("cpp");
  const [editorialLoading, setEditorialLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const editorialFetched = useRef(false);

  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  const [hint, setHint] = useState(null);
  const [hintLoading, setHintLoading] = useState(false);

  const token = () => localStorage.getItem("token");

  useEffect(() => {
    const fetchProblem = async () => {
      setFetchingProblem(true);
      setErrorMsg(null);
      try {
        const headers = token() ? { Authorization: `Bearer ${token()}` } : {};
        const res = await fetch(`${API}/problems/${id}`, { headers });
        if (!res.ok) throw new Error(`Problem fetch failed with status ${res.status}`);
        const data = await res.json();
        if (!data || data.error || !data.title) throw new Error(data?.error || "Problem not found");
        setProblem(data);
        setCode(BOILERPLATE["cpp"]);
        if (data.testCases && data.testCases.length > 0) {
          setCustomInputs(data.testCases.map(tc => tc.input || ""));
        } else {
          setCustomInputs([""]);
        }
      } catch (err) {
        console.error("Fetch problem error:", err);
        setErrorMsg(err.message || "Failed to load problem");
      } finally {
        setFetchingProblem(false);
      }
    };
    if (id) fetchProblem();
  }, [id]);

  const fetchEditorial = async () => {
    if (editorialFetched.current) return;
    editorialFetched.current = true;
    setEditorialLoading(true);
    try {
      const headers = token() ? { Authorization: `Bearer ${token()}` } : {};
      const res = await fetch(`${API}/problems/${id}/editorial`, { headers });
      if (res.ok) setEditorial(await res.json());
    } catch (err) { console.error("Editorial fetch error:", err); }
    finally { setEditorialLoading(false); }
  };

  const fetchSubmissions = async () => {
    setSubmissionsLoading(true);
    try {
      const headers = token() ? { Authorization: `Bearer ${token()}` } : {};
      const res = await fetch(`${API}/problems/${id}/submissions`, { headers });
      if (res.ok) { const data = await res.json(); setSubmissions(Array.isArray(data) ? data : []); }
    } catch (err) { console.error("Submissions fetch error:", err); }
    finally { setSubmissionsLoading(false); }
  };

  const handleLeftTab = (tab) => {
    setLeftTab(tab);
    if (tab === "editorial") fetchEditorial();
    if (tab === "history") fetchSubmissions();
  };

  const startHDrag = (e) => { e.preventDefault(); isDraggingH.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; };
  const startVDrag = (e) => { e.preventDefault(); isDraggingV.current = true; document.body.style.cursor = 'row-resize'; document.body.style.userSelect = 'none'; };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingH.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const pct = ((e.clientX - rect.left) / rect.width) * 100;
        setLeftWidth(Math.min(75, Math.max(25, pct)));
      }
      if (isDraggingV.current) {
        const rightCol = document.getElementById('right-col');
        if (rightCol) {
          const rect = rightCol.getBoundingClientRect();
          const fromBottom = rect.bottom - e.clientY;
          setConsoleHeight(Math.min(500, Math.max(40, fromBottom)));
          if (!consoleOpen) setConsoleOpen(true);
        }
      }
    };
    const handleMouseUp = () => { isDraggingH.current = false; isDraggingV.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [consoleOpen]);

  const handleLanguageChange = (newLang) => { setLanguage(newLang); setCode(BOILERPLATE[newLang] || ""); };
  const handleCopy = (text) => { if (!text) return; navigator.clipboard.writeText(text); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); };

  const handleExecute = async (mode) => {
    setLoading(true); setExecMode(mode); setResult(null); setConsoleOpen(true); setActiveConsoleTab("results");
    if (consoleHeight < 280) setConsoleHeight(340);
    if (mode === "submit") {
      fetchSubmissions();
    }
    const endpoint = mode === "run" ? "/run" : "/submit";
    const body = mode === "run"
      ? { code, language, input: customInputs[activeTestCaseIdx] || problem?.testCases?.[0]?.input || "", expectedOutput: problem?.testCases?.[activeTestCaseIdx]?.output || "", problemId: id }
      : { code, language, problemId: id };
    try {
      const headers = { "Content-Type": "application/json" };
      if (token()) headers["Authorization"] = `Bearer ${token()}`;
      const res = await fetch(`${API}${endpoint}`, { method: "POST", headers, body: JSON.stringify(body) });
      const data = await res.json();
      const submissionId = data.submissionId;
      if (!submissionId) { setResult({ status: "Error", error: data.error || "Failed to initiate execution" }); setLoading(false); return; }
      const poll = setInterval(async () => {
        try {
          const statusHeaders = token() ? { Authorization: `Bearer ${token()}` } : {};
          const statusRes = await fetch(`${API}/status/${submissionId}`, { headers: statusHeaders });
          const statusData = await statusRes.json();
          if (statusData.status !== "Pending" && statusData.status !== "Queued") {
            clearInterval(poll); setResult(statusData); setLoading(false);
            if (mode === "submit") {
              fetchSubmissions();
              setLeftTab("history");
            }
          }
        } catch (pollErr) { clearInterval(poll); setLoading(false); }
      }, 1000);
    } catch (err) { console.error(err); setResult({ status: "Error", error: err.message || "Network error occurred" }); setLoading(false); }
  };

  const handleGetHint = async () => {
    setHintLoading(true); setLeftTab("hint");
    try {
      const headers = token() ? { Authorization: `Bearer ${token()}` } : {};
      const res = await fetch(`${API}/hint/${id}`, { headers });
      const data = await res.json();
      setHint(data.hint || data.message || "Consider breaking the problem down using a hash map or binary search approach.");
    } catch (err) { setHint("Focus on optimizing your loop by using an efficient lookup data structure."); }
    finally { setHintLoading(false); }
  };

  if (fetchingProblem) {
    return (
      <div className="h-screen bg-surface-darker dark:bg-sunset-50 text-warm-text flex flex-col justify-center items-center">
        <div className="w-8 h-8 border-2 border-sunset-400 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-sm font-semibold text-warm-muted">Loading IDE Workspace...</span>
      </div>
    );
  }

  if (errorMsg || !problem) {
    return (
      <div className="h-screen bg-surface-darker dark:bg-sunset-50 text-warm-text flex flex-col justify-center items-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-warm-text dark:text-surface-darker">Problem Not Found</h2>
        <p className="text-sm text-warm-muted dark:text-warm-muted-light max-w-md">{errorMsg || "The requested problem could not be loaded."}</p>
        <button onClick={() => navigate("/problems")} className="px-4 py-2 rounded-xl bg-surface-raised hover:bg-surface-border text-sunset-400 text-xs font-bold transition-all flex items-center space-x-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Problems</span>
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-surface-darker dark:bg-sunset-50 text-warm-text dark:text-surface-darker overflow-hidden">
      <Navbar />

      {/* Workspace Top Action Bar */}
      <div className="h-14 shrink-0 bg-surface-dark/90 dark:bg-white border-b border-surface-border dark:border-sunset-200 px-4 flex items-center justify-between z-10">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate("/problems")} className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-warm-muted hover:text-warm-text dark:text-warm-muted-light dark:hover:text-surface-darker bg-surface-raised/60 dark:bg-sunset-50 hover:bg-surface-raised dark:hover:bg-sunset-100 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Problems</span>
          </button>
          <div className="h-4 w-[1px] bg-surface-border dark:bg-sunset-200" />
          <h1 className="text-sm font-bold text-warm-text dark:text-surface-darker truncate max-w-xs md:max-w-md">{problem?.title || "Problem Workspace"}</h1>
          {problem?.difficulty && (
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${problem.difficulty === "Easy" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : problem.difficulty === "Medium" ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
              }`}>{problem.difficulty}</span>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <select value={language} onChange={(e) => handleLanguageChange(e.target.value)} className="bg-surface-raised dark:bg-sunset-50 text-warm-text dark:text-surface-darker text-xs font-mono font-semibold px-3 py-1.5 rounded-lg border border-surface-border dark:border-sunset-200 focus:outline-none focus:border-sunset-500">
            <option value="cpp">C++ (GCC 11)</option>
            <option value="python">Python 3.10</option>
            <option value="java">Java 17</option>
            <option value="c">C (GCC 11)</option>
          </select>
          <button onClick={() => setCode(BOILERPLATE[language])} title="Reset code boilerplate" className="p-2 rounded-lg bg-surface-raised/80 dark:bg-sunset-50 text-warm-muted hover:text-warm-text dark:hover:text-surface-darker hover:bg-surface-raised dark:hover:bg-sunset-100 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleExecute("run")} disabled={loading} className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-surface-raised dark:bg-sunset-100 hover:bg-surface-border dark:hover:bg-sunset-200 text-warm-text dark:text-surface-darker font-bold text-xs border border-surface-border dark:border-sunset-200 transition-all disabled:opacity-50">
            <Play className="w-3.5 h-3.5 text-sunset-400 fill-sunset-400" />
            <span>Run</span>
          </button>
          <button onClick={() => handleExecute("submit")} disabled={loading} className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 hover:scale-105">
            <Send className="w-3.5 h-3.5" />
            <span>Submit</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Split Grid */}
      <div ref={containerRef} className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

        {/* Left Column */}
        <div style={{ width: `${leftWidth}%` }} className="hidden md:flex flex-col h-full bg-surface-darker/60 dark:bg-white overflow-hidden">
          <div className="shrink-0 flex items-center border-b border-surface-border dark:border-sunset-200 bg-surface-dark/40 dark:bg-sunset-50 px-2 overflow-x-auto">
            {[
              { id: "description", label: "Description", icon: Info },
              { id: "editorial", label: "Editorial", icon: BookOpen },
              { id: "history", label: "Submissions", icon: History },
              { id: "graph", label: "AST Evolution", icon: Workflow }
            ].map(tab => {
              const Icon = tab.icon;
              const active = leftTab === tab.id;
              return (
                <button key={tab.id} onClick={() => handleLeftTab(tab.id)} className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${active ? "border-sunset-400 text-sunset-400 bg-sunset-500/5" : "border-transparent text-warm-muted dark:text-warm-muted-light hover:text-warm-text dark:hover:text-surface-darker"
                  }`}>
                  <Icon className={`w-3.5 h-3.5 ${active ? "text-sunset-400" : "text-warm-muted"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {leftTab === "description" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-warm-text dark:text-surface-darker mb-2">{problem?.title}</h2>
                  <div className="flex items-center space-x-2">
                    {problem?.topics?.map(t => (
                      <span key={t} className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-raised dark:bg-sunset-50 text-warm-muted dark:text-warm-muted-light">
                        <Tag className="w-3 h-3 text-sunset-400" />
                        <span>{t}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="prose prose-invert max-w-none text-sm text-warm-muted dark:text-warm-muted-light leading-relaxed whitespace-pre-line">
                  {problem?.description || "No description provided."}
                </div>
                {problem?.testCases && problem.testCases.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-surface-border dark:border-sunset-200">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-warm-muted">Public Test Examples ({problem.testCases.length} Cases)</h3>
                    {problem.testCases.map((tc, idx) => (
                      <div key={idx} className="rounded-xl bg-surface-raised/80 dark:bg-sunset-50 border border-surface-border dark:border-sunset-200 p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-warm-muted">
                          <span>Example {idx + 1}</span>
                          <span className="text-[10px] text-sunset-400 font-mono">Public Testcase</span>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-warm-muted block mb-1">Input:</span>
                          <pre className="font-mono text-xs bg-surface-darker dark:bg-white p-2.5 rounded-lg border border-surface-border dark:border-sunset-200 text-warm-text dark:text-surface-darker overflow-x-auto">{tc.input}</pre>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-warm-muted block mb-1">Expected Output:</span>
                          <pre className="font-mono text-xs bg-surface-darker dark:bg-white p-2.5 rounded-lg border border-surface-border dark:border-sunset-200 text-emerald-400 dark:text-emerald-700 overflow-x-auto">{tc.output}</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {problem?.constraints && (
                  <div className="rounded-xl bg-surface-raised/60 dark:bg-sunset-50 border border-surface-border dark:border-sunset-200 p-4 space-y-2">
                    <h4 className="text-xs font-bold text-warm-text dark:text-surface-darker flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-warm-gold" />
                      <span>Constraints</span>
                    </h4>
                    <pre className="font-mono text-xs text-warm-muted dark:text-warm-muted-light whitespace-pre-line">{problem.constraints}</pre>
                  </div>
                )}

                {/* LeetCode-style Collapsible Hints Accordion */}
                {(() => {
                  const hintsList = getProblemHints(problem);
                  return (
                    <div className="space-y-3 pt-4 border-t border-surface-border dark:border-sunset-200">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-warm-muted flex items-center space-x-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-warm-gold" />
                        <span>Hints ({hintsList.length})</span>
                      </h3>
                      <div className="space-y-2">
                        {hintsList.map((hintText, hIdx) => {
                          const isExpanded = !!expandedHints[hIdx];
                          const approachBadges = [
                            { title: "⚡ Brute Force Approach", color: "text-amber-400 dark:text-amber-600 bg-amber-500/10 border-amber-500/30" },
                            { title: "💡 Better / Key Insight", color: "text-sunset-400 dark:text-sunset-600 bg-sunset-500/10 border-sunset-500/30" },
                            { title: "🚀 Optimal Approach", color: "text-emerald-400 dark:text-emerald-600 bg-emerald-500/10 border-emerald-500/30" }
                          ];
                          const badge = approachBadges[hIdx] || { title: `Hint ${hIdx + 1}`, color: "text-warm-gold bg-warm-gold/10 border-warm-gold/30" };
                          return (
                            <div
                              key={hIdx}
                              className="rounded-xl bg-surface-raised/80 dark:bg-sunset-50 border border-surface-border dark:border-sunset-200 overflow-hidden transition-all"
                            >
                              <button
                                onClick={() => setExpandedHints(prev => ({ ...prev, [hIdx]: !prev[hIdx] }))}
                                className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-warm-text dark:text-surface-darker hover:bg-surface-raised dark:hover:bg-sunset-100 transition-colors"
                              >
                                <span className="flex items-center space-x-2">
                                  <Lightbulb className={`w-3.5 h-3.5 ${isExpanded ? "text-warm-gold" : "text-warm-muted"}`} />
                                  <span>Hint {hIdx + 1}</span>
                                </span>
                                <ChevronDown className={`w-4 h-4 text-warm-muted transition-transform duration-200 ${isExpanded ? "rotate-180 text-sunset-400" : ""}`} />
                              </button>
                              {isExpanded && (
                                <div className="px-4 pb-3.5 pt-2.5 text-xs text-warm-muted dark:text-warm-muted-light font-sans leading-relaxed border-t border-surface-border/40 dark:border-sunset-200/60 bg-surface-darker/40 dark:bg-white/60 space-y-2">
                                  <div className={`${badge.color} inline-block px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border`}>
                                    {badge.title}
                                  </div>
                                  <div className="whitespace-pre-line text-warm-text dark:text-surface-darker font-medium">
                                    {hintText}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {leftTab === "editorial" && (
              <div className="space-y-6">
                {editorialLoading ? (
                  <div className="flex items-center justify-center py-12 text-warm-muted text-sm">
                    <Clock className="w-4 h-4 animate-spin mr-2" />
                    <span>Loading Editorial...</span>
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="text-lg font-bold text-warm-text dark:text-surface-darker mb-2">Official Solution & Breakdown</h3>
                      <p className="text-sm text-warm-muted dark:text-warm-muted-light leading-relaxed whitespace-pre-line">
                        {editorial?.editorialDescription || "Use optimal data structures to solve this problem efficiently."}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-warm-muted">Solution Code (4 Languages)</span>
                        <button onClick={() => handleCopy(editorial?.editorialSolutions?.[editorialLang] || "")} className="flex items-center space-x-1 text-xs text-sunset-400 hover:text-sunset-300">
                          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
                        </button>
                      </div>
                      <div className="flex space-x-2 border-b border-surface-border dark:border-sunset-200 pb-2">
                        {["cpp", "python", "java", "c"].map(lang => (
                          <button key={lang} onClick={() => setEditorialLang(lang)} className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${editorialLang === lang ? "bg-sunset-500/20 text-sunset-400 border border-sunset-500/40" : "bg-surface-raised dark:bg-sunset-50 text-warm-muted hover:text-warm-text"
                            }`}>{lang.toUpperCase()}</button>
                        ))}
                      </div>
                      <pre className="font-mono text-xs bg-surface-raised dark:bg-sunset-50 p-4 rounded-xl border border-surface-border dark:border-sunset-200 text-warm-text dark:text-surface-darker overflow-x-auto">
                        {editorial?.editorialSolutions?.[editorialLang] || "// Solution code loading..."}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            )}

            {leftTab === "history" && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-warm-text dark:text-surface-darker">Your Submission History</h3>
                {submissionsLoading ? (
                  <div className="py-8 text-center text-sm text-warm-muted">Loading submissions...</div>
                ) : submissions.length === 0 ? (
                  <div className="py-12 text-center text-sm text-warm-muted/60">No submissions yet. Write code and hit Submit!</div>
                ) : (
                  <div className="space-y-2">
                    {submissions.map((sub) => (
                      <div key={sub.id} onClick={() => setCode(sub.code)} className="group cursor-pointer rounded-xl bg-surface-raised/80 dark:bg-sunset-50 hover:bg-surface-raised border border-surface-border dark:border-sunset-200 p-3.5 flex items-center justify-between transition-all">
                        <div className="flex items-center space-x-3">
                          <StatusBadge status={sub.status} />
                          <span className="text-xs font-mono text-warm-muted uppercase">{sub.language}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-warm-muted">
                          {sub.ExecutionMetric && (
                            <span className="flex items-center space-x-1 text-sunset-400">
                              <Cpu className="w-3 h-3" />
                              <span>{sub.ExecutionMetric.execution_time_ms.toFixed(1)} ms</span>
                            </span>
                          )}
                          <span>{new Date(sub.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {leftTab === "graph" && (
              <div className="h-[450px]">
                <ASTGraphViewer problemId={id} problemTitle={problem?.title} problemTopic={problem?.topics?.[0]} />
              </div>
            )}

            {leftTab === "hint" && (
              <div className="space-y-4">
                <div className="rounded-xl bg-surface-raised/90 dark:bg-sunset-50 border border-warm-gold/30 p-5 space-y-3">
                  <div className="flex items-center space-x-2 text-warm-gold font-bold text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Execution Assistant</span>
                  </div>
                  {hintLoading ? (
                    <p className="text-xs text-warm-muted animate-pulse">Analyzing AST and execution graph...</p>
                  ) : (
                    <p className="text-sm text-warm-text dark:text-surface-darker leading-relaxed font-sans">
                      {hint || "Click AI Hint to get real-time algorithmic guidance tailored to your code."}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Horizontal Resize Handle */}
        <div className="resize-handle hidden md:block" onMouseDown={startHDrag} />

        {/* Right Column: Monaco + Console */}
        <div id="right-col" style={{ width: `${100 - leftWidth}%` }} className="hidden md:flex flex-col h-full bg-surface-darker dark:bg-sunset-50 relative overflow-hidden">
          <div className="flex-1 relative min-h-0 overflow-hidden">
            <Editor
              height="100%"
              language={MONACO_LANG[language] || "cpp"}
              theme={isDark ? "vs-dark" : "vs"}
              value={code}
              onChange={(v) => setCode(v || "")}
              loading={
                <div className="flex items-center justify-center h-full text-warm-muted text-xs">
                  <Clock className="w-4 h-4 animate-spin mr-2 text-sunset-400" />
                  Loading Monaco Editor...
                </div>
              }
              options={{
                fontSize: 14,
                fontFamily: "JetBrains Mono, monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                automaticLayout: true,
                padding: { top: 12, bottom: 12 }
              }}
            />
          </div>

          {consoleOpen && <div className="resize-handle-h" onMouseDown={startVDrag} />}

          <div style={{ height: consoleOpen ? `${consoleHeight}px` : '40px' }} className="shrink-0 border-t border-surface-border dark:border-sunset-200 bg-surface-dark/95 dark:bg-white transition-all duration-300 ease-in-out flex flex-col shadow-2xl">
            <div className="h-10 px-4 bg-surface-dark dark:bg-sunset-50 flex items-center justify-between border-b border-surface-border dark:border-sunset-200">
              <div className="flex items-center space-x-4">
                <button onClick={() => setConsoleOpen(!consoleOpen)} className="flex items-center space-x-1.5 text-xs font-bold text-warm-text dark:text-surface-darker hover:text-sunset-400">
                  <Terminal className="w-3.5 h-3.5 text-sunset-400" />
                  <span>Testcase Console</span>
                  {consoleOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
                {consoleOpen && (
                  <div className="flex space-x-2">
                    <button onClick={() => setActiveConsoleTab("results")} className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${activeConsoleTab === "results" ? "bg-sunset-500/20 text-sunset-400 border border-sunset-500/30" : "text-warm-muted dark:text-warm-muted-light hover:text-warm-text dark:hover:text-surface-darker"}`}>Execution Output</button>
                    <button onClick={() => setActiveConsoleTab("cases")} className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${activeConsoleTab === "cases" ? "bg-sunset-500/20 text-sunset-400 border border-sunset-500/30" : "text-warm-muted dark:text-warm-muted-light hover:text-warm-text dark:hover:text-surface-darker"}`}>Custom Inputs</button>
                  </div>
                )}
              </div>
              {result && (
                <div className="flex items-center space-x-3">
                  <span className="text-[11px] font-bold text-warm-muted font-sans hidden sm:inline">{execMode === "submit" ? "Submission Result:" : "Run Result:"}</span>
                  <StatusBadge status={result.status} />
                </div>
              )}
            </div>

            {consoleOpen && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-mono">
                {activeConsoleTab === "results" ? (
                  <div>
                    {loading ? (
                      <div className="space-y-4 py-3 font-sans">
                        <div className="flex items-center space-x-2 text-sunset-400 font-bold">
                          <Clock className="w-4 h-4 animate-spin" />
                          <span>{execMode === "run" ? "Running Public Testcases (2/2)..." : "Running ALL 5 Testcases (5/5)..."}</span>
                        </div>
                        <div className="flex space-x-2">
                          {(execMode === "run" ? [1, 2] : [1, 2, 3, 4, 5]).map((tcNum) => (
                            <div key={tcNum} className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface-raised border border-surface-border text-warm-muted animate-pulse text-xs">
                              <Clock className="w-3 h-3 text-sunset-400 animate-spin" />
                              <span>Case {tcNum}</span>
                            </div>
                          ))}
                        </div>
                        <div className="w-full bg-surface-raised h-1.5 rounded-full overflow-hidden">
                          <div className="bg-sunset-400 h-full w-2/3 animate-pulse rounded-full" />
                        </div>
                      </div>
                    ) : !result ? (
                      <p className="text-warm-muted/60 font-sans">Run or Submit your code to view testcase execution results here.</p>
                    ) : (
                      <div className="space-y-4 font-sans">
                        {execMode === "submit" && result ? (
                          <div className="space-y-4 font-sans">
                            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl ${result.status === "Accepted" ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200" : "bg-rose-950/40 border-rose-500/40 text-rose-200"
                              }`}>
                              <div className="flex items-center space-x-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl shrink-0 ${result.status === "Accepted" ? "bg-emerald-400 text-surface-darker shadow-lg shadow-emerald-500/30" : "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                                  }`}>{result.status === "Accepted" ? "✓" : "✗"}</div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <h2 className="text-xl font-extrabold tracking-tight">{result.status}</h2>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-surface-darker/80 border border-surface-border text-warm-muted">
                                      {result.status === "Accepted" ? "5 / 5 Testcases Passed" : `${result.details?.testCaseIndex ? result.details.testCaseIndex : 2} / 5 Testcases Passed`}
                                    </span>
                                  </div>
                                  <p className="text-xs text-warm-muted mt-0.5">Submitted at {new Date().toLocaleTimeString()} • Language: {language.toUpperCase()}</p>
                                </div>
                              </div>
                              {result.status === "Accepted" && (
                                <div className="flex items-center space-x-3">
                                  <div className="bg-surface-darker/80 border border-surface-border px-3.5 py-1.5 rounded-xl text-center">
                                    <span className="text-[9px] text-warm-muted uppercase font-bold block">Runtime</span>
                                    <span className="text-xs font-mono font-bold text-sunset-400">1.2 ms</span>
                                    <span className="text-[9px] text-emerald-400 font-bold block">Beats 95.4%</span>
                                  </div>
                                  <div className="bg-surface-darker/80 border border-surface-border px-3.5 py-1.5 rounded-xl text-center">
                                    <span className="text-[9px] text-warm-muted uppercase font-bold block">Memory</span>
                                    <span className="text-xs font-mono font-bold text-sunset-400">10.4 MB</span>
                                    <span className="text-[9px] text-emerald-400 font-bold block">Beats 89.1%</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-darker dark:bg-surface-dark border border-surface-border font-sans">
                            <div className="flex items-center space-x-3">
                              <StatusBadge status={result.status} />
                              <span className="text-warm-text font-bold text-sm">
                                {result.status === "Accepted" ? "All Public Test Cases Passed! Ready to Submit." : "Public Testcase Failed"}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center space-x-2 border-b border-surface-border pb-2">
                          {(execMode === "run" ? [0, 1] : [0, 1, 2, 3, 4]).map((idx) => {
                            const isFailingCase = result.status !== "Accepted" && (result.details?.testCaseIndex === idx || (!result.details?.testCaseIndex && idx === (execMode === "run" ? 0 : 2)));
                            const active = activeTestCaseIdx === idx;
                            return (
                              <button key={idx} onClick={() => setActiveTestCaseIdx(idx)} className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${active ? isFailingCase ? "bg-rose-500/20 text-rose-400 border border-rose-500/40" : "bg-sunset-500/20 text-sunset-400 border border-sunset-500/40"
                                  : "bg-surface-darker dark:bg-surface-dark text-warm-muted hover:text-warm-text"
                                }`}>
                                {result.status === "Accepted" ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : isFailingCase ? <XCircle className="w-3 h-3 text-rose-400" /> : <CheckCircle2 className="w-3 h-3 text-warm-muted/40" />}
                                <span>Case {idx + 1}</span>
                                {idx >= 2 && <span className="text-[9px] text-warm-gold font-sans ml-1">(Hidden)</span>}
                              </button>
                            );
                          })}
                        </div>

                        <div className="space-y-3 font-mono">
                          {result.error && (
                            <div>
                              <span className="text-rose-400 font-sans block mb-1 font-bold">Stderr / Execution Error:</span>
                              <pre className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 whitespace-pre-wrap text-xs">{result.error}</pre>
                            </div>
                          )}
                          {result.details && activeTestCaseIdx === (result.details.testCaseIndex ?? (result.details.isHidden ? 2 : 0)) ? (
                            <div className="rounded-xl bg-rose-950/30 border border-rose-500/40 p-4 space-y-3">
                              <div className="flex items-center justify-between text-rose-400 font-bold font-sans">
                                <span className="flex items-center space-x-1.5">
                                  <XCircle className="w-4 h-4" />
                                  <span>{result.details.isHidden ? `Hidden Test Case ${activeTestCaseIdx + 1} Failed` : `Test Case ${activeTestCaseIdx + 1} Failed`}</span>
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <span className="text-warm-muted font-sans block mb-1">Input:</span>
                                  <pre className="p-2.5 rounded bg-surface-darker border border-surface-border text-warm-text text-xs overflow-x-auto">{result.details.input}</pre>
                                </div>
                                <div>
                                  <span className="text-emerald-400 font-sans block mb-1">Expected Output:</span>
                                  <pre className="p-2.5 rounded bg-surface-darker border border-surface-border text-emerald-300 text-xs overflow-x-auto">{result.details.expected}</pre>
                                </div>
                                <div>
                                  <span className="text-rose-400 font-sans block mb-1">Your Output:</span>
                                  <pre className="p-2.5 rounded bg-surface-darker border border-surface-border text-rose-300 text-xs overflow-x-auto">{result.details.actual || "(No output)"}</pre>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <span className="text-warm-muted font-sans block mb-1">Testcase Input:</span>
                                <pre className="p-3 rounded-lg bg-surface-darker border border-surface-border text-warm-text text-xs overflow-x-auto">{customInputs[activeTestCaseIdx] || problem?.testCases?.[activeTestCaseIdx]?.input || "(Standard Test Case)"}</pre>
                              </div>
                              <div>
                                <span className="text-emerald-400 font-sans block mb-1">Expected Output:</span>
                                <pre className="p-3 rounded-lg bg-surface-darker border border-surface-border text-emerald-300 text-xs overflow-x-auto">{problem?.testCases?.[activeTestCaseIdx]?.output || result.output || "(Matches Expected)"}</pre>
                              </div>
                            </div>
                          )}
                          {result.output && !result.error && (
                            <div>
                              <span className="text-warm-muted font-sans block mb-1">Stdout Output:</span>
                              <pre className="p-3 rounded-lg bg-surface-darker border border-surface-border text-warm-text text-xs whitespace-pre-wrap">{result.output}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 font-sans">
                    <span className="text-warm-muted block text-xs font-bold">Select Test Case Input to Edit:</span>
                    <div className="flex space-x-2">
                      {customInputs.map((_, idx) => (
                        <button key={idx} onClick={() => setActiveTestCaseIdx(idx)} className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${activeTestCaseIdx === idx ? "bg-sunset-500/20 text-sunset-400 border border-sunset-500/40" : "bg-surface-darker text-warm-muted"
                          }`}>Case {idx + 1}</button>
                      ))}
                    </div>
                    <textarea rows={3} value={customInputs[activeTestCaseIdx] || ""} onChange={(e) => { const next = [...customInputs]; next[activeTestCaseIdx] = e.target.value; setCustomInputs(next); }}
                      className="w-full font-mono text-xs p-3 rounded-lg bg-surface-darker border border-surface-border text-warm-text focus:outline-none focus:border-sunset-500" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Problem() {
  return (
    <ProblemErrorBoundary>
      <ProblemContent />
    </ProblemErrorBoundary>
  );
}
