import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import {
  Search, Code2, CheckCircle2, Circle, Star, Filter, Tag, Sparkles,
  Zap, Flame, Layers, Award, Terminal, ArrowUpRight
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const ALL_TOPICS = [
  "All", "Arrays", "Strings", "Math", "Recursion", "DP",
  "Binary Search", "Graphs", "Bit Manipulation", "Backtracking"
];

export default function Problems() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const [selectedTopic, setSelectedTopic] = useState("All");
  const [loading, setLoading] = useState(true);

  const fetchProblems = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      let url = `${API}/problems?`;
      if (query.trim()) url += `search=${encodeURIComponent(query.trim())}&`;
      if (difficulty !== "All") url += `difficulty=${difficulty}&`;
      if (selectedTopic !== "All") url += `topic=${encodeURIComponent(selectedTopic)}`;

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(url, { headers });
      const data = await res.json();
      setProblems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch problems", err);
      setProblems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProblems();
    }, 250);
    return () => clearTimeout(timer);
  }, [query, difficulty, selectedTopic]);

  const toggleFavorite = async (e, problemId, isFav) => {
    e.stopPropagation();
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const method = isFav ? "DELETE" : "POST";
      await fetch(`${API}/problems/${problemId}/favourite`, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      });
      setProblems((prev) =>
        prev.map((p) => (p.id === problemId ? { ...p, favourite: !isFav } : p))
      );
    } catch (err) {
      console.error("Favorite toggle error:", err);
    }
  };

  // Stats calculation
  const total = problems.length;
  const easyCount = problems.filter((p) => p.difficulty === "Easy").length;
  const mediumCount = problems.filter((p) => p.difficulty === "Medium").length;
  const hardCount = problems.filter((p) => p.difficulty === "Hard").length;

  return (
    <div className="min-h-screen bg-surface-darker dark:bg-sunset-50 text-warm-text dark:text-surface-darker flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden neo-panel p-8 md:p-10 border border-surface-border dark:border-sunset-200">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-gradient-to-br from-sunset-500/20 to-sunset-400/15 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative z-10 space-y-4 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sunset-500/10 border border-sunset-500/30 text-sunset-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>LeetCode-Grade Problem Catalog</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-warm-text dark:text-surface-darker">
              Master Data Structures & Algorithms
            </h1>
            <p className="text-sm text-warm-muted dark:text-warm-muted-light leading-relaxed">
              Explore 20 core algorithmic problems with 4-language editorials, AST evolution graph visualizer, and custom testcase runner.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-surface-border dark:border-sunset-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-surface-raised dark:bg-sunset-50 flex items-center justify-center text-sunset-400 border border-surface-border dark:border-sunset-200 font-bold neo-btn">
                {total}
              </div>
              <div>
                <span className="text-xs font-bold text-warm-muted block">Total Loaded</span>
                <span className="text-xs text-warm-muted/70">Available Problems</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/30 font-bold">
                {easyCount}
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-400 block">Easy</span>
                <span className="text-xs text-warm-muted/70">Beginner Friendly</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/30 font-bold">
                {mediumCount}
              </div>
              <div>
                <span className="text-xs font-bold text-amber-400 block">Medium</span>
                <span className="text-xs text-warm-muted/70">Intermediate</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/30 font-bold">
                {hardCount}
              </div>
              <div>
                <span className="text-xs font-bold text-rose-400 block">Hard</span>
                <span className="text-xs text-warm-muted/70">Advanced Algorithmic</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="space-y-4">
          
          {/* Search Bar + Difficulty Filter Pills */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-3 text-warm-muted w-4 h-4" />
              <input
                type="text"
                placeholder="Search by title or topic (e.g. Graphs, Arrays, DP)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-surface-dark dark:bg-white border border-surface-border dark:border-sunset-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-warm-text dark:text-surface-darker focus:outline-none focus:border-sunset-500 transition-colors"
                style={{ boxShadow: 'inset 3px 3px 8px #12122a, inset -3px -3px 8px #24243e' }}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-3 text-xs text-warm-muted hover:text-sunset-400 font-bold"
                >
                  CLEAR
                </button>
              )}
            </div>

            {/* Difficulty Tabs */}
            <div className="flex space-x-2 bg-surface-dark dark:bg-sunset-50 p-1 rounded-xl border border-surface-border dark:border-sunset-200 neo-btn">
              {["All", "Easy", "Medium", "Hard"].map((diff) => (
                <button
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    difficulty === diff
                      ? diff === "Easy"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
                        : diff === "Medium"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm"
                        : diff === "Hard"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm"
                        : "bg-sunset-500/20 text-sunset-400 border border-sunset-500/40 shadow-sm"
                      : "text-warm-muted hover:text-warm-text dark:text-warm-muted-light"
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Topics Category Pill Bar */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
            <span className="text-xs font-bold text-warm-muted uppercase tracking-wider shrink-0 flex items-center space-x-1 mr-1">
              <Tag className="w-3 h-3 text-sunset-400" />
              <span>Topics:</span>
            </span>
            {ALL_TOPICS.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTopic(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedTopic === t
                    ? "bg-sunset-500 text-white font-bold shadow-md shadow-sunset-500/20"
                    : "bg-surface-dark dark:bg-sunset-50 text-warm-muted dark:text-warm-muted-light hover:text-warm-text hover:bg-surface-raised"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Problem Table Card */}
        <div className="neo-panel rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 px-6 py-3.5 bg-surface-raised dark:bg-sunset-50 border-b border-surface-border dark:border-sunset-200 text-xs font-extrabold uppercase tracking-wider text-warm-muted">
            <div className="col-span-1 flex items-center">Status</div>
            <div className="col-span-6 md:col-span-7">Problem Title</div>
            <div className="col-span-3 md:col-span-2 text-center">Difficulty</div>
            <div className="col-span-2 md:col-span-2 text-right">Action</div>
          </div>

          {loading ? (
            <div className="p-16 text-center text-warm-muted text-sm">
              <div className="w-6 h-6 border-2 border-sunset-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <span>Searching problem set...</span>
            </div>
          ) : problems.length === 0 ? (
            <div className="p-16 text-center text-warm-muted text-sm space-y-2">
              <p className="font-bold text-warm-text">No problems found</p>
              <p className="text-xs text-warm-muted/70">Try adjusting your search query or topic filter.</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-border dark:divide-sunset-200">
              {problems.map((p, idx) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/problem/${p.id}`)}
                  className="grid grid-cols-12 px-6 py-4 items-center hover:bg-surface-raised/50 dark:hover:bg-sunset-50/80 cursor-pointer transition-all group"
                >
                  {/* Solved Status */}
                  <div className="col-span-1 flex items-center">
                    {p.solved ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                    ) : (
                      <Circle className="w-5 h-5 text-warm-muted/40 group-hover:text-warm-muted" />
                    )}
                  </div>

                  {/* Title & Topics */}
                  <div className="col-span-6 md:col-span-7 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs text-warm-muted/60">{idx + 1}.</span>
                      <span className="font-bold text-sm text-warm-text dark:text-surface-darker group-hover:text-sunset-400 transition-colors">
                        {p.title}
                      </span>
                    </div>
                    {p.topics && p.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.topics.map((t) => (
                          <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-surface-raised dark:bg-sunset-50 text-warm-muted dark:text-warm-muted-light border border-surface-border dark:border-sunset-200">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Difficulty Badge */}
                  <div className="col-span-3 md:col-span-2 flex justify-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                        p.difficulty === "Easy"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : p.difficulty === "Medium"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {p.difficulty}
                    </span>
                  </div>

                  {/* Favorite & Action */}
                  <div className="col-span-2 md:col-span-2 flex items-center justify-end space-x-2">
                    <button
                      onClick={(e) => toggleFavorite(e, p.id, p.favourite)}
                      className="p-1.5 rounded-lg hover:bg-surface-raised dark:hover:bg-sunset-100 transition-colors"
                      title={p.favourite ? "Remove from favourites" : "Save to favourites"}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          p.favourite
                            ? "text-warm-gold fill-warm-gold"
                            : "text-warm-muted/40 group-hover:text-warm-muted"
                        }`}
                      />
                    </button>
                    <ArrowUpRight className="w-4 h-4 text-warm-muted/40 group-hover:text-sunset-400 transition-colors" />
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
