import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, GitBranch, Activity, Clock } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col gap-1">
      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{label}</span>
      <span className="text-4xl font-bold text-white">{value ?? "—"}</span>
      {sub && <span className="text-slate-500 text-xs">{sub}</span>}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles =
    status === "Accepted"
      ? "bg-emerald-500/20 text-emerald-400"
      : status === "Pending"
      ? "bg-blue-500/20 text-blue-400"
      : "bg-rose-500/20 text-rose-400";
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${styles}`}>
      {status}
    </span>
  );
}

export default function GraphStats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(true);

  const token = () => localStorage.getItem("token");

  useEffect(() => {
    const userId = getUserId();

    fetch(`${API}/graph/stats`)
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setStatsLoading(false));

    if (userId) {
      fetch(`${API}/graph/user/${userId}/evolution`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
        .then((r) => r.json())
        .then((data) => setTimeline(data.timeline || []))
        .catch(console.error)
        .finally(() => setTimelineLoading(false));
    } else {
      setTimelineLoading(false);
    }
  }, []);

  function getUserId() {
    try {
      const t = token();
      if (!t) return null;
      const payload = JSON.parse(atob(t.split(".")[1]));
      return payload.id;
    } catch {
      return null;
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition"
        >
          <ArrowLeft size={18} /> Back
        </button>

        <div className="flex items-center gap-3 mb-8">
          <GitBranch className="text-purple-400" size={28} />
          <div>
            <h1 className="text-2xl font-bold">Graph Analytics</h1>
            <p className="text-slate-400 text-sm">AST evolution graph — code state nodes and transformation edges</p>
          </div>
        </div>

        {/* Graph stats */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          {statsLoading ? (
            <div className="col-span-2 text-slate-500 text-sm text-center py-8">Loading stats...</div>
          ) : (
            <>
              <StatCard
                label="Code State Nodes"
                value={stats?.nodeCount?.toLocaleString()}
                sub="Unique AST snapshots stored in the graph"
              />
              <StatCard
                label="Transformation Edges"
                value={stats?.edgeCount?.toLocaleString()}
                sub="Labelled transitions between code states"
              />
            </>
          )}
        </div>

        {/* Evolution timeline */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Activity size={18} className="text-blue-400" />
            <h2 className="font-semibold">Your Submission Timeline</h2>
          </div>

          {timelineLoading ? (
            <div className="text-slate-500 text-sm text-center py-8">Loading timeline...</div>
          ) : timeline.length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-10 border-2 border-dashed border-slate-800 rounded-xl">
              No submissions yet.
            </div>
          ) : (
            <div className="relative pl-6">
              {/* vertical rule */}
              <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-800" />

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {timeline.map((sub, i) => (
                  <div key={sub.id} className="relative flex items-start gap-4">
                    {/* dot */}
                    <div
                      className={`absolute -left-[19px] top-1.5 w-3 h-3 rounded-full border-2 border-slate-950 ${
                        sub.status === "Accepted"
                          ? "bg-emerald-400"
                          : "bg-rose-400"
                      }`}
                    />

                    <div className="flex-1 bg-slate-800/40 border border-slate-700 rounded-xl p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <StatusBadge status={sub.status} />
                        <button
                          onClick={() => navigate(`/problem/${sub.problemId}`)}
                          className="text-[10px] text-slate-500 hover:text-blue-400 transition"
                        >
                          View Problem
                        </button>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
                        <Clock size={10} />
                        {new Date(sub.createdAt).toLocaleString()}
                      </div>
                    </div>
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
