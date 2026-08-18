import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { ArrowLeft, GitBranch, Activity, Clock, Cpu, Network } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function StatCard({ label, value, sub }) {
  return (
    <div className="neo-panel rounded-2xl p-6 flex flex-col justify-between space-y-2">
      <span className="text-warm-muted text-xs font-extrabold uppercase tracking-wider">{label}</span>
      <span className="text-4xl font-black bg-gradient-to-r from-sunset-500 to-sunset-400 bg-clip-text text-transparent">
        {value ?? "—"}
      </span>
      {sub && <span className="text-warm-muted/60 text-xs">{sub}</span>}
    </div>
  );
}

function StatusBadge({ status }) {
  const isPass = status === "Accepted";
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
        isPass
          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
      }`}
    >
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
    <div className="min-h-screen bg-surface-darker dark:bg-sunset-50 text-warm-text dark:text-surface-darker flex flex-col">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        
        {/* Header */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-xl bg-surface-raised dark:bg-sunset-50 border border-surface-border dark:border-sunset-200 text-warm-muted hover:text-warm-text transition-colors neo-btn"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center space-x-2">
              <GitBranch className="w-6 h-6 text-sunset-400" />
              <span>AST Graph Analytics</span>
            </h1>
            <p className="text-xs text-warm-muted dark:text-warm-muted-light mt-1">
              Tree-sitter AST evolution graph nodes and structural transformation telemetry.
            </p>
          </div>
        </div>

        {/* Stat Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {statsLoading ? (
            <div className="col-span-2 text-warm-muted text-sm text-center py-8">Loading graph telemetry...</div>
          ) : (
            <>
              <StatCard
                label="Code State Nodes"
                value={stats?.nodeCount?.toLocaleString()}
                sub="Unique AST snapshots catalogued in Apache AGE"
              />
              <StatCard
                label="Transformation Edges"
                value={stats?.edgeCount?.toLocaleString()}
                sub="Labelled refactoring transitions between states"
              />
            </>
          )}
        </div>

        {/* Timeline Log */}
        <div className="neo-panel rounded-2xl p-6 space-y-6">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-sunset-400" />
            <h2 className="text-base font-bold">Your Submission AST Evolution Timeline</h2>
          </div>

          {timelineLoading ? (
            <div className="text-warm-muted text-sm text-center py-8">Loading timeline...</div>
          ) : timeline.length === 0 ? (
            <div className="text-warm-muted text-sm text-center py-12 border-2 border-dashed border-surface-border dark:border-sunset-200 rounded-xl">
              No submissions logged in the AST graph yet.
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 max-h-[500px] overflow-y-auto pr-2">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-surface-border dark:bg-sunset-200" />

              {timeline.map((sub) => (
                <div key={sub.id} className="relative flex items-start space-x-4">
                  <div
                    className={`absolute -left-[19px] top-2 w-3 h-3 rounded-full border-2 border-surface-darker ${
                      sub.status === "Accepted" ? "bg-emerald-400" : "bg-rose-500"
                    }`}
                  />
                  <div className="flex-1 bg-surface-raised dark:bg-sunset-50 border border-surface-border dark:border-sunset-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <StatusBadge status={sub.status} />
                        <span className="text-xs font-mono text-warm-muted">{sub.id.substring(0, 8)}...</span>
                      </div>
                      <p className="text-xs text-warm-muted/60 font-mono">
                        {new Date(sub.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/problem/${sub.problemId}`)}
                      className="px-3 py-1.5 rounded-lg bg-surface-dark dark:bg-sunset-100 hover:bg-surface-border text-xs font-bold text-sunset-400 neo-btn"
                    >
                      View Workspace
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
