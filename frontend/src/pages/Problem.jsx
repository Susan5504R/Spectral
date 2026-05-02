import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { ArrowLeft, Play, Send, RotateCcw, Terminal, Code2, Info, BarChart2, Star, Workflow, X } from "lucide-react";
import SubmissionGraph from "../components/SubmissionGraph";
import ASTGraphViewer from "../components/ASTGraphViewer";


const BOILERPLATE = {
  cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write code here\n    return 0;\n}",
  python: "def solution():\n    # Write code here\n    pass\n\nif __name__ == '__main__':\n    solution()",
  javascript: "// Write code here\nfunction main() {\n    console.log('Hello World');\n}\nmain();",
  java: "public class Main {\n    public static void main(String[] args) {\n        // Write code here\n    }\n}"
};

export default function Problem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("cpp");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("description"); // "description" | "stats"
  const [rightTab, setRightTab] = useState("code"); // "code" | "editorial"
  const [editorial, setEditorial] = useState(null);
  const [distributionData, setDistributionData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [editorialLoading, setEditorialLoading] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  useEffect(() => {
    const fetchProblem = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`http://localhost:5000/problems/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setProblem(data);
        setCode(BOILERPLATE["cpp"]); // Default
      } catch (err) { console.error("Fetch error:", err); }
    };
    fetchProblem();
  }, [id]);

  useEffect(() => {
    if (activeTab === "stats") {
      fetchDistribution();
    }
  }, [activeTab, id]);

  const fetchEditorial = async () => {
    if (editorial) return;
    setEditorialLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`http://localhost:5000/problems/${id}/editorial`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setEditorial(data);
    } catch (err) { console.error("Editorial fetch error:", err); }
    setEditorialLoading(false);
  };

  useEffect(() => {
    if (rightTab === "editorial") {
      fetchEditorial();
    }
  }, [rightTab, id]);

  const fetchDistribution = async () => {
    setStatsLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`http://localhost:5000/problems/${id}/distribution`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setDistributionData(data);
    } catch (err) { console.error("Stats fetch error:", err); }
    setStatsLoading(false);
  };

  const toggleFavorite = async () => {
    const token = localStorage.getItem("token");
    const method = problem.favourite ? "DELETE" : "POST";
    try {
      await fetch(`http://localhost:5000/problems/${id}/favourite`, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      });
      setProblem({ ...problem, favourite: !problem.favourite });
    } catch (err) { console.error("Fav toggle failed", err); }
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setCode(BOILERPLATE[newLang]);
  };

  const handleExecute = async (endpoint) => {
    setLoading(true);
    setResult(null);
    const token = localStorage.getItem("token");

    const body = endpoint === "/run"
      ? { code, language, input: problem.testCases?.[0]?.input ?? "", problemId: id }
      : { code, language, problemId: id };

    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

  const pollStatus = async (subId) => {
    const token = localStorage.getItem("token");
    const interval = setInterval(async () => {
      const res = await fetch(`http://localhost:5000/status/${subId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status !== "Pending") {
        setResult(data);
        setLoading(false);
        clearInterval(interval);
      }
    }, 2000);
  };

  if (!problem) return <div className="h-screen bg-[#0a0a0a] flex items-center justify-center text-blue-500 animate-pulse">Loading Environment...</div>;

  return (
    <div className="h-screen bg-[#0a0a0a] text-slate-200 flex flex-col font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-white/5">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-lg transition text-slate-400 hover:text-white">
            <ArrowLeft size={18} />
          </button>
          <div className="h-4 w-[1px] bg-white/10" />
          <h1 className="font-semibold text-sm tracking-tight">{problem.title}</h1>
          <button onClick={toggleFavorite} className="hover:scale-110 transition-transform">
            <Star size={16} fill={problem.favourite ? "#eab308" : "none"} className={problem.favourite ? "text-yellow-500" : "text-slate-500"} />
          </button>
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${problem.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              problem.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>{problem.difficulty}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-[#2a2a2a] p-1 rounded-lg border border-white/5">
            {['cpp', 'python', 'javascript', 'java'].map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`px-3 py-1 text-xs rounded-md capitalize transition ${language === lang ? 'bg-[#3a3a3a] text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {lang === 'cpp' ? 'C++' : lang}
              </button>
            ))}
          </div>
          <button onClick={() => handleExecute("/run")} disabled={loading} className="flex items-center gap-2 bg-[#2a2a2a] hover:bg-[#333] px-4 py-1.5 rounded-lg text-xs font-medium border border-white/5 transition disabled:opacity-50">
            <Play size={14} className="fill-current" /> Run
          </button>
          <button onClick={() => setShowGraph(true)} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 px-4 py-1.5 rounded-lg text-xs font-semibold text-white shadow-lg shadow-purple-900/20 transition">
            <Workflow size={14} /> AST Graph
          </button>
          <button onClick={() => handleExecute("/submit")} disabled={loading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded-lg text-xs font-semibold text-white shadow-lg shadow-blue-900/20 transition disabled:opacity-50">
            <Send size={14} /> Submit
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-2 gap-2">
        {/* Left Panel: Description & Stats */}
        <section className="w-1/2 flex flex-col bg-[#141414] rounded-xl border border-white/5 overflow-hidden">
          <div className="flex items-center gap-0 px-2 py-1 border-b border-white/5 bg-white/[0.02]">
            <button
              onClick={() => setActiveTab("description")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition text-[10px] font-bold uppercase tracking-wider ${activeTab === 'description' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Info size={14} /> Description
            </button>
            <button
              onClick={() => setActiveTab("stats")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition text-[10px] font-bold uppercase tracking-wider ${activeTab === 'stats' ? 'bg-purple-500/10 text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <BarChart2 size={14} /> Stats
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            {activeTab === 'description' ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{problem.title}</h2>
                  <div className="flex gap-2 mb-4">
                    {problem.topics?.map(t => (
                      <span key={t} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase font-bold">{t}</span>
                    ))}
                  </div>
                  <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-line">{problem.description}</p>
                </div>

                {problem.testCases && problem.testCases.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-200 border-b border-white/5 pb-2">Examples</h3>
                    {problem.testCases.slice(0, 2).map((tc, idx) => (
                      <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-lg p-4 space-y-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Input</span>
                          <pre className="text-xs text-emerald-400 font-mono bg-black/20 p-2 rounded">{tc.input}</pre>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Output</span>
                          <pre className="text-xs text-blue-400 font-mono bg-black/20 p-2 rounded">{tc.output}</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {problem.constraints && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 border-b border-white/5 pb-2 mb-3">Constraints</h3>
                    <pre className="text-xs text-slate-400 font-mono italic leading-relaxed">{problem.constraints}</pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Submission Analysis</h2>
                  <button onClick={fetchDistribution} className="p-2 hover:bg-white/5 rounded-lg transition text-slate-500"><RotateCcw size={14} /></button>
                </div>

                {statsLoading ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                    <p className="text-xs text-slate-500 font-medium animate-pulse">Analyzing submissions...</p>
                  </div>
                ) : distributionData ? (
                  <div className="space-y-6">
                    <SubmissionGraph data={distributionData} userPerformance={distributionData.userPerformance} type="runtime" />
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-slate-500 text-sm">Failed to load statistics.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Editor & Editorial & Console */}
        <section className="flex-1 flex flex-col gap-2 overflow-hidden">
          <div className="flex-1 bg-[#141414] rounded-xl border border-white/5 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-2 py-1 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center">
                <button
                  onClick={() => setRightTab("code")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition text-[10px] font-bold uppercase tracking-wider ${rightTab === 'code' ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Code2 size={14} /> Code
                </button>
                <button
                  onClick={() => setRightTab("editorial")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition text-[10px] font-bold uppercase tracking-wider ${rightTab === 'editorial' ? 'bg-amber-500/10 text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Terminal size={14} /> Editorial
                </button>
              </div>
              {rightTab === 'code' && (
                <div className="flex items-center gap-2 mr-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">{language}</span>
                </div>
              )}
            </div>

            <div className="flex-1 relative overflow-hidden">
              {rightTab === 'code' ? (
                <Editor
                  theme="vs-dark"
                  language={language === 'cpp' ? 'cpp' : language === 'python' ? 'python' : 'javascript'}
                  value={code}
                  onChange={(val) => setCode(val)}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    padding: { top: 20 },
                    background: '#141414',
                    lineNumbersMinChars: 3,
                    smoothScrolling: true,
                    cursorSmoothCaretAnimation: "on",
                    scrollbar: { vertical: 'hidden', horizontal: 'hidden' }
                  }}
                />
              ) : (
                <div className="p-6 overflow-y-auto h-full scrollbar-hide">
                  {editorialLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                      <p className="text-xs text-slate-500 font-medium animate-pulse">Loading Editorial...</p>
                    </div>
                  ) : editorial ? (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-3">Approach</h3>
                        <p className="text-slate-300 text-sm leading-relaxed">{editorial.editorialDescription}</p>
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest">Implementation</h3>
                        <pre className="bg-black/30 p-4 rounded-xl border border-white/5 text-xs text-slate-300 font-mono overflow-x-auto">
                          {editorial.editorialSolutions?.[language] || "No solution available for this language."}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-slate-500 text-sm">Editorial not available for this problem.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Console / Results Area */}
          <div className={`${result ? 'h-2/3' : 'h-12'} bg-[#141414] rounded-xl border border-white/5 overflow-hidden flex flex-col transition-all duration-300`}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Terminal size={16} className={result?.status === 'Accepted' || result?.status === 'Solved' ? 'text-emerald-400' : 'text-slate-400'} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Console & Results</span>
                {result?.details?.total && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${result.details.passed === result.details.total ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {result.details.passed}/{result.details.total} Passed
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {result && <button onClick={() => setResult(null)} className="p-1 hover:bg-white/5 rounded transition text-slate-500"><RotateCcw size={12} /></button>}
              </div>
            </div>

            <div className="flex-1 p-4 font-mono text-sm overflow-y-auto bg-[#0d0d0d]">
              {!result && !loading && <div className="text-slate-600 text-[10px] uppercase tracking-widest text-center mt-2">Run or Submit to see results</div>}
              {loading && <div className="text-blue-400 flex items-center gap-2 text-xs"><span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" /> Executing in secure sandbox...</div>}

              {result && (
                <div className="space-y-4">
                  {/* Status Badge */}
                  <div className="flex items-center gap-3">
                    <div className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-tighter ${result.status === 'Accepted' || result.status === 'Solved' ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'}`}>
                      {result.status}
                    </div>
                  </div>

                  {/* Detailed Test Case Results */}
                  {result.details?.results && (
                    <div className="space-y-2">
                      {result.details.results.map((tc, idx) => (
                        <div key={idx} className={`rounded-lg border overflow-hidden ${tc.passed ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
                          <div className="flex items-center gap-2 px-3 py-2">
                            <span className={`text-[10px] font-black uppercase ${tc.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {tc.passed ? '✓' : '✗'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              Test Case #{tc.index}
                            </span>
                            {tc.isHidden && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 uppercase">Hidden</span>}
                            {tc.error && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 uppercase">{tc.error}</span>}
                          </div>
                          {!tc.isHidden && tc.input !== null && (
                            <div className="px-3 pb-3 space-y-2 border-t border-white/5">
                              <div className="pt-2">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Input</span>
                                <pre className="text-[11px] text-slate-300 mt-1">{tc.input}</pre>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-emerald-500 uppercase">Expected</span>
                                <pre className="text-[11px] text-emerald-400 mt-1">{tc.expected}</pre>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-rose-500 uppercase">Your Output</span>
                                <pre className="text-[11px] text-rose-400 mt-1">{tc.actual}</pre>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fallback: raw output if no test case details */}
                  {!result.details?.results && result.output && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Standard Output:</span>
                      <pre className="text-xs text-slate-300 bg-white/[0.03] p-3 rounded-lg border border-white/5 overflow-x-auto">{result.output}</pre>
                    </div>
                  )}
                  {result.error && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">Execution Error:</span>
                      <pre className="text-xs text-rose-400 bg-rose-500/5 p-3 rounded-lg border border-rose-500/20 overflow-x-auto whitespace-pre-wrap">{result.error}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* AST Graph Modal Overlay */}
      {showGraph && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 w-full h-full max-w-7xl max-h-[90vh] rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden relative">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Workflow className="text-purple-500" /> Problem AST Evolution
              </h2>
              <button onClick={() => setShowGraph(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 w-full h-full relative">
              <ASTGraphViewer problemId={id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}