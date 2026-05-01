import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ShieldAlert, ShieldCheck, Shield, AlertTriangle } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const VERDICT_META = {
  clean:      { icon: ShieldCheck,  color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", label: "Clean" },
  suspicious: { icon: AlertTriangle, color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/30",   label: "Suspicious" },
  flagged:    { icon: ShieldAlert,  color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/30",    label: "Flagged" },
  pending_ai: { icon: Shield,       color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/30",    label: "Pending AI" }
};

function VerdictBadge({ verdict }) {
  const meta = VERDICT_META[verdict] || VERDICT_META.pending_ai;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.bg} ${meta.color}`}>
      <Icon size={12} /> {meta.label}
    </span>
  );
}

function ScoreBar({ label, value }) {
  const pct = Math.round((value ?? 0) * 100);
  const color =
    pct >= 80 ? "bg-rose-500" : pct >= 50 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono text-white">{pct}%</span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function PlagiarismReport() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/plagiarism/${submissionId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load report");
        setReport(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [submissionId]);

  if (loading)
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center text-slate-400">
        Loading report...
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-rose-400 text-center">
          <ShieldAlert size={40} className="mx-auto mb-3" />
          <p>{error}</p>
        </div>
      </div>
    );

  const checks = report?.checks ?? [];
  const overallVerdict = checks.length === 0
    ? "clean"
    : checks.some((c) => c.verdict === "flagged")
    ? "flagged"
    : checks.some((c) => c.verdict === "suspicious")
    ? "suspicious"
    : "clean";

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition"
        >
          <ArrowLeft size={18} /> Back
        </button>

        <div className="flex items-center gap-3 mb-2">
          <ShieldAlert className="text-blue-400" size={26} />
          <h1 className="text-2xl font-bold">Plagiarism Report</h1>
        </div>
        <p className="text-slate-500 text-xs font-mono mb-8">
          Submission: {submissionId}
        </p>

        {/* Summary */}
        <div className={`flex items-center justify-between p-5 rounded-2xl border mb-8 ${VERDICT_META[overallVerdict].bg}`}>
          <div>
            <p className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">
              Overall Verdict
            </p>
            <VerdictBadge verdict={overallVerdict} />
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 mb-1">Comparisons</p>
            <p className="text-2xl font-bold">{checks.length}</p>
          </div>
        </div>

        {checks.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500">
            <ShieldCheck size={40} className="mx-auto mb-3 text-emerald-600" />
            No similarity matches found. This submission looks original.
          </div>
        ) : (
          <div className="space-y-4">
            {checks.map((c, i) => (
              <div
                key={i}
                className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Compared against</p>
                    <p className="font-mono text-sm text-slate-300">{c.against}</p>
                  </div>
                  <VerdictBadge verdict={c.verdict} />
                </div>

                <div className="space-y-2">
                  <ScoreBar label="Cosine Similarity" value={c.cosineScore} />
                  <ScoreBar label="Jaccard Similarity" value={c.jaccardScore} />
                  {c.aiScore != null && (
                    <ScoreBar label="AI Score" value={c.aiScore} />
                  )}
                </div>

                {c.explanation && (
                  <div className="bg-slate-800/50 rounded-xl p-3">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">AI Explanation</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{c.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
