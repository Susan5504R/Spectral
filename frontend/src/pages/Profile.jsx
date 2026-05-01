import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import { useState } from "react";

export default function Profile() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");

  // 🔹 TEMP DATA (replace with backend later)
  const user = {
    name: "Srujan Gawande",
    username: "srujan_07",
    email: "srujan@email.com",
    avatar: "https://i.pravatar.cc/150?img=3",
    solved: 120,
    easy: 50,
    medium: 45,
    hard: 25,
  };

  const recentProblems = [
    { title: "Two Sum", difficulty: "Easy" },
    { title: "LRU Cache", difficulty: "Hard" },
    { title: "Binary Tree Level Order", difficulty: "Medium" },
  ];

  const heatmapData = [
    { date: "2026-04-01", count: 2 },
    { date: "2026-04-02", count: 5 },
    { date: "2026-04-03", count: 1 },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      
      {/* 🔝 PROFILE CARD */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/60 backdrop-blur-md border border-slate-700 rounded-xl p-6 flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-4">
          <img
            src={user.avatar}
            alt="avatar"
            className="w-16 h-16 rounded-full border border-slate-600"
          />
          <div>
            <h2 className="text-xl font-semibold">{user.name}</h2>
            <p className="text-slate-400 text-sm">@{user.username}</p>
            <p className="text-slate-500 text-sm">{user.email}</p>
          </div>
        </div>

        <button
          onClick={() => navigate("/edit-profile")}
          className="bg-blue-600 px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Edit Profile
        </button>
      </motion.div>

      {/* 📊 STATS */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">

        {/* Total Solved */}
        <div className="bg-slate-800/60 p-6 rounded-xl border border-slate-700 flex flex-col items-center">
          <h3 className="mb-4">Total Solved</h3>

          <div className="w-32 h-32">
            <CircularProgressbar
              value={(user.solved / 300) * 100}
              text={`${user.solved}`}
              styles={buildStyles({
                pathColor: "#3b82f6",
                textColor: "#fff",
                trailColor: "#1e293b",
              })}
            />
          </div>
        </div>

        {/* Difficulty Breakdown */}
        <div className="bg-slate-800/60 p-6 rounded-xl border border-slate-700">
          <h3 className="mb-4">Breakdown</h3>
          <p className="text-green-400">Easy: {user.easy}</p>
          <p className="text-yellow-400">Medium: {user.medium}</p>
          <p className="text-red-400">Hard: {user.hard}</p>
        </div>

        {/* Activity Heatmap */}
        <div className="bg-slate-800/60 p-6 rounded-xl border border-slate-700">
          <h3 className="mb-4">🔥 Activity</h3>

          <CalendarHeatmap
            startDate={new Date("2026-01-01")}
            endDate={new Date("2026-12-31")}
            values={heatmapData}
            classForValue={(value) => {
              if (!value) return "color-empty";
              return `color-scale-${value.count}`;
            }}
          />
        </div>
      </div>

      {/* 📚 TABS */}
      <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-6">

        {/* Tabs Header */}
        <div className="flex gap-6 mb-6 border-b border-slate-700 pb-2">
          <button
            onClick={() => setTab("overview")}
            className={
              tab === "overview"
                ? "text-blue-500 border-b-2 border-blue-500 pb-1"
                : "text-slate-400"
            }
          >
            Overview
          </button>

          <button
            onClick={() => setTab("favorites")}
            className={
              tab === "favorites"
                ? "text-blue-500 border-b-2 border-blue-500 pb-1"
                : "text-slate-400"
            }
          >
            Favorites
          </button>
        </div>

        {/* Tab Content */}
        <div>

          {/* 📘 Overview */}
          {tab === "overview" && (
            <div>
              <h3 className="text-lg mb-4">Recent Problems</h3>

              <div className="space-y-3">
                {recentProblems.map((prob, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center bg-slate-700/40 px-4 py-3 rounded-md"
                  >
                    <span>{prob.title}</span>
                    <span
                      className={
                        prob.difficulty === "Easy"
                          ? "text-green-400"
                          : prob.difficulty === "Medium"
                          ? "text-yellow-400"
                          : "text-red-400"
                      }
                    >
                      {prob.difficulty}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ⭐ Favorites */}
          {tab === "favorites" && (
            <div className="text-center">
              <h3 className="text-lg mb-4">⭐ Favorite Problems</h3>

              <p className="text-slate-400 mb-6">
                Quickly access all problems you’ve starred.
              </p>

              <button
                onClick={() => navigate("/problems?filter=favorites")}
                className="bg-blue-600 px-6 py-2 rounded-md hover:bg-blue-700"
              >
                Go to Favorites
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}