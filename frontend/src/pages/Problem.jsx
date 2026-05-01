import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { ArrowLeft, Play, Send, RotateCcw, Terminal, Code2, Info } from "lucide-react";

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

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setCode(BOILERPLATE[newLang]);
  };

  const handleExecute = async (endpoint) => {
    setLoading(true);
    setResult(null);
    const token = localStorage.getItem("token");

    const body = endpoint === "/run"
      ? { code, language, input: problem.testCases?.[0]?.input ?? "" }
      : { code, language, problemId: id };

    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
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
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
            problem.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
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
          <button onClick={() => handleExecute("/submit")} disabled={loading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded-lg text-xs font-semibold text-white shadow-lg shadow-blue-900/20 transition disabled:opacity-50">
            <Send size={14} /> Submit
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-2 gap-2">
        {/* Left Panel: Description */}
        <section className="w-1/3 flex flex-col bg-[#141414] rounded-xl border border-white/5 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
            <Info size={16} className="text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</span>
          </div>
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            <h2 className="text-xl font-bold mb-4">{problem.title}</h2>
            <p className="text-slate-400 leading-relaxed text-sm whitespace-pre-line">{problem.description}</p>
          </div>
        </section>

        {/* Right Panel: Editor & Console */}
        <section className="flex-1 flex flex-col gap-2">
          <div className="flex-1 bg-[#141414] rounded-xl border border-white/5 overflow-hidden relative">
             <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/[0.02]">
                <Code2 size={16} className="text-purple-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Editor</span>
             </div>
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
                  cursorSmoothCaretAnimation: "on"
                }}
              />
          </div>

          <div className="h-1/3 bg-[#141414] rounded-xl border border-white/5 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Console Output</span>
              </div>
              <button onClick={() => setResult(null)} className="p-1 hover:bg-white/5 rounded transition text-slate-500"><RotateCcw size={14}/></button>
            </div>
            
            <div className="flex-1 p-4 font-mono text-sm overflow-y-auto bg-[#0d0d0d]">
              {loading && <div className="text-blue-400 flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" /> Waiting for sandbox...</div>}
              
              {result && (
                <div className="space-y-3">
                  <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase ${result.status === 'Accepted' || result.status === 'Solved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {result.status}
                  </div>
                  {result.output && (
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500 uppercase">Output:</span>
                      <pre className="text-slate-300 bg-white/[0.03] p-3 rounded-lg border border-white/5">{result.output}</pre>
                    </div>
                  )}
                  {result.error && (
                    <pre className="text-rose-400 bg-rose-500/5 p-3 rounded-lg border border-rose-500/20">{result.error}</pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}