import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import ActivityCalendar from "../components/ActivityCalendar";
import {
  ArrowLeft, User, Save, X, Settings, Star, BarChart3, GitBranch,
  CheckCircle2, Flame, Award, BookOpen
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function EditProfileModal({ isOpen, onClose, currentData, onUpdateSuccess }) {
  const [formData, setFormData] = useState({
    username: currentData?.username || "",
    bio: currentData?.bio || "",
    avatarUrl: currentData?.avatarUrl || ""
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentData) {
      setFormData({
        username: currentData.username || "",
        bio: currentData.bio || "",
        avatarUrl: currentData.avatarUrl || ""
      });
    }
  }, [currentData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${API}/me/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await onUpdateSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Update failed");
      }
    } catch (err) {
      console.error("Update failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full bg-surface-darker dark:bg-sunset-50 border border-surface-border dark:border-sunset-200 rounded-xl px-4 py-2.5 text-sm text-warm-text dark:text-surface-darker focus:outline-none focus:border-sunset-500 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-surface-darker/70 backdrop-blur-md"
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative neo-panel w-full max-w-md p-6 z-10"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center space-x-2 text-warm-text dark:text-surface-darker">
            <Settings className="w-5 h-5 text-sunset-400" />
            <span>Edit Profile</span>
          </h2>
          <button onClick={onClose} className="text-warm-muted hover:text-warm-text">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-warm-muted mb-1">Username</label>
            <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className={inputCls} required />
          </div>

          <div>
            <label className="block text-xs font-bold text-warm-muted mb-1">Avatar URL</label>
            <input type="text" placeholder="https://images.unsplash.com/..." value={formData.avatarUrl} onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })} className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-bold text-warm-muted mb-1">Bio</label>
            <textarea rows={3} placeholder="Tell the community about yourself..." value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} className={`${inputCls} resize-none`} />
          </div>

          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 bg-surface-raised dark:bg-sunset-50 hover:bg-surface-border py-2.5 rounded-xl font-bold text-xs text-warm-muted dark:text-surface-darker neo-btn">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 bg-gradient-to-r from-sunset-500 to-sunset-400 hover:from-sunset-400 hover:to-sunset-300 py-2.5 rounded-xl font-bold text-xs text-white shadow-md shadow-sunset-500/20">
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      const [profileRes, favsRes] = await Promise.all([
        fetch(`${API}/me/profile`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/me/favourites`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (profileRes.ok) setProfileData(await profileRes.json());
      if (favsRes.ok) setFavorites(await favsRes.json());
    } catch (err) {
      console.error("Error fetching profile data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-darker dark:bg-sunset-50 text-warm-text flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-sunset-400 border-t-transparent rounded-full animate-spin mr-2" />
        <span>Loading Dashboard...</span>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-surface-darker dark:bg-sunset-50 text-warm-text flex items-center justify-center">
        Error loading profile dashboard.
      </div>
    );
  }

  const { user, stats } = profileData;

  return (
    <div className="min-h-screen bg-surface-darker dark:bg-sunset-50 text-warm-text dark:text-surface-darker flex flex-col">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        
        {/* Profile Card Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="neo-panel rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-sunset-500/50 p-1 bg-surface-dark shadow-xl shadow-sunset-500/10">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-sunset-500 to-sunset-400 rounded-xl flex items-center justify-center text-3xl font-black text-white">
                  {user.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-black text-warm-text dark:text-surface-darker tracking-tight">
                  {user.username}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-warm-gold/10 text-warm-gold border border-warm-gold/30">
                  Student
                </span>
              </div>
              <p className="text-sm text-warm-muted dark:text-warm-muted-light mt-1">
                {user.bio || "No bio added yet."}
              </p>
              <p className="text-xs text-warm-muted/60 mt-2 font-mono">
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate("/graph")}
              className="flex items-center space-x-2 bg-surface-raised dark:bg-sunset-50 hover:bg-surface-border px-4 py-2.5 rounded-xl border border-surface-border dark:border-sunset-200 transition-all text-sunset-400 font-bold text-xs neo-btn"
            >
              <GitBranch className="w-4 h-4" />
              <span>AST Graph</span>
            </button>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-sunset-500 to-sunset-400 hover:from-sunset-400 hover:to-sunset-300 px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md shadow-sunset-500/20 transition-all hover:scale-105"
            >
              <User className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          </div>
        </motion.div>

        {/* Stats Ring Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Circular Stat Ring */}
          <div className="neo-panel p-6 rounded-2xl flex flex-col items-center justify-center">
            <h3 className="mb-4 text-xs font-extrabold uppercase tracking-wider text-warm-muted flex items-center space-x-1.5">
              <BarChart3 className="w-4 h-4 text-sunset-400" />
              <span>Problems Solved</span>
            </h3>
            <div className="w-32 h-32">
              <CircularProgressbar
                value={stats.totalSolved}
                maxValue={20}
                text={`${stats.totalSolved} / 20`}
                styles={buildStyles({
                  pathColor: "#FF6B6B",
                  textColor: "#FF6B6B",
                  trailColor: "rgba(42, 42, 69, 0.5)",
                  strokeLinecap: "round"
                })}
              />
            </div>
          </div>

          {/* Difficulty Bars */}
          <div className="neo-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-warm-muted">
              Difficulty Breakdown
            </h3>
            <div className="space-y-3">
              {[
                { label: "Easy", count: stats.breakdown.Easy, color: "bg-emerald-400", text: "text-emerald-400" },
                { label: "Medium", count: stats.breakdown.Medium, color: "bg-amber-400", text: "text-amber-400" },
                { label: "Hard", count: stats.breakdown.Hard, color: "bg-rose-400", text: "text-rose-400" }
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1 font-bold">
                    <span className={item.text}>{item.label}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="w-full bg-surface-raised dark:bg-sunset-100 h-2 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.totalSolved > 0 ? (item.count / 20) * 100 : 0}%` }}
                      className={`${item.color} h-full rounded-full`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Topic Tags */}
          <div className="neo-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-warm-muted">
              Mastered Topics
            </h3>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
              {Object.entries(stats.topicBreakdown).map(([topic, count]) => (
                <span key={topic} className="px-3 py-1 rounded-lg text-xs font-medium bg-sunset-500/10 text-sunset-400 border border-sunset-500/30">
                  {topic} <span className="opacity-60 ml-1">x{count}</span>
                </span>
              ))}
              {Object.keys(stats.topicBreakdown).length === 0 && (
                <p className="text-xs text-warm-muted/60 italic">No topics completed yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Activity Calendar Component */}
        <div className="neo-panel p-6 rounded-2xl">
          <ActivityCalendar
            userId={user.id}
            token={localStorage.getItem("token")}
            apiBase={API}
          />
        </div>

        {/* Saved Favorites Section */}
        <div className="neo-panel rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-warm-text dark:text-surface-darker flex items-center space-x-2">
            <Star className="w-4 h-4 text-warm-gold fill-warm-gold" />
            <span>Saved Problems ({favorites.length})</span>
          </h3>

          {favorites.length === 0 ? (
            <p className="text-xs text-warm-muted/60">No starred problems yet.</p>
          ) : (
            <div className="grid gap-3">
              {favorites.map((prob) => (
                <div
                  key={prob.id}
                  onClick={() => navigate(`/problem/${prob.id}`)}
                  className="flex justify-between items-center bg-surface-raised dark:bg-sunset-50 px-5 py-3.5 rounded-xl border border-surface-border dark:border-sunset-200 hover:border-sunset-500/50 cursor-pointer transition-all neo-hover"
                >
                  <span className="font-bold text-sm text-warm-text dark:text-surface-darker">{prob.title}</span>
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                      prob.difficulty === "Easy"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : prob.difficulty === "Medium"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-rose-500/20 text-rose-400"
                    }`}
                  >
                    {prob.difficulty}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      <AnimatePresence>
        {isEditModalOpen && (
          <EditProfileModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            currentData={user}
            onUpdateSuccess={fetchAllData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
