import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { useState, useEffect } from "react";
import { ArrowLeft, User, Save, X, Settings, Star, BarChart3 } from "lucide-react";

// --- SUB-COMPONENT: EDIT PROFILE MODAL ---
function EditProfileModal({ isOpen, onClose, currentData, onUpdateSuccess }) {
  const [formData, setFormData] = useState({
    username: currentData?.username || "",
    bio: currentData?.bio || "",
    avatarUrl: currentData?.avatarUrl || ""
  });
  const [submitting, setSubmitting] = useState(false);

  // Sync state if currentData changes
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

  // Inside EditProfileModal (frontend)
const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const token = localStorage.getItem("token");

    try {
        const response = await fetch("http://localhost:5000/me/profile", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                username: formData.username,
                bio: formData.bio,
                avatarUrl: formData.avatarUrl
            }),
        });

        if (response.ok) {
            await onUpdateSuccess(); // Wait for the parent to fetch fresh data
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurred Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
      />

      {/* Modal Container */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings size={22} className="text-blue-500" />
            Edit Profile
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1 font-medium">Username</label>
            <input 
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1 font-medium">Avatar URL</label>
            <input 
              type="text"
              placeholder="https://images.com/photo.jpg"
              value={formData.avatarUrl}
              onChange={(e) => setFormData({...formData, avatarUrl: e.target.value})}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1 font-medium">Bio</label>
            <textarea 
              rows="3"
              placeholder="Tell us about yourself..."
              value={formData.bio}
              onChange={(e) => setFormData({...formData, bio: e.target.value})}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:border-blue-500 outline-none resize-none transition-all"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? "Saving..." : <><Save size={18} /> Save</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// --- MAIN PROFILE COMPONENT ---
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
        fetch("http://localhost:5000/me/profile", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("http://localhost:5000/me/favourites", { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (profileRes.ok) setProfileData(await profileRes.json());
      if (favsRes.ok) setFavorites(await favsRes.json());
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Loading Profile...</div>;
  if (!profileData) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Error loading profile.</div>;

  const { user, stats } = profileData;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* ⬅️ BACK BUTTON */}
        <button 
          onClick={() => navigate(-1)} 
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Dashboard</span>
        </button>

        {/* 🔝 PROFILE CARD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/60 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between mb-8 gap-6"
        >
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-blue-500/50 p-1 bg-slate-900 shadow-xl shadow-blue-500/10">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover rounded-full" />
              ) : (
                <div className="w-full h-full bg-blue-600 flex items-center justify-center text-3xl font-bold">
                  {user.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user.username}</h2>
              <p className="text-slate-400 text-sm mb-1">{user.bio || "No bio added yet."}</p>
              <p className="text-slate-500 text-xs">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-5 py-2.5 rounded-xl border border-slate-600 transition-all active:scale-95"
          >
            <User size={18} />
            Edit Profile
          </button>
        </motion.div>

        {/* 📊 STATS SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Circle */}
          <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700 flex flex-col items-center justify-center">
            <h3 className="mb-4 text-slate-400 text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
               <BarChart3 size={16} /> Progress
            </h3>
            <div className="w-32 h-32">
              <CircularProgressbar
                value={stats.totalSolved}
                maxValue={Math.max(stats.totalSolved + 20, 100)} 
                text={`${stats.totalSolved}`}
                styles={buildStyles({
                  pathColor: "#3b82f6",
                  textColor: "#fff",
                  trailColor: "#1e293b",
                  strokeLinecap: "round"
                })}
              />
            </div>
          </div>

          {/* Bars Breakdown */}
          <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700">
            <h3 className="mb-4 text-slate-400 text-sm font-semibold uppercase tracking-wider">Difficulty</h3>
            <div className="space-y-4">
              {[
                { label: 'Easy', count: stats.breakdown.Easy, color: 'bg-green-400', text: 'text-green-400' },
                { label: 'Medium', count: stats.breakdown.Medium, color: 'bg-yellow-400', text: 'text-yellow-400' },
                { label: 'Hard', count: stats.breakdown.Hard, color: 'bg-red-400', text: 'text-red-400' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1 font-medium">
                    <span className={item.text}>{item.label}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-700">
                    <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${stats.totalSolved > 0 ? (item.count / stats.totalSolved) * 100 : 0}%` }}
                       className={`${item.color} h-full rounded-full`} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Topics */}
          <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700">
            <h3 className="mb-4 text-slate-400 text-sm font-semibold uppercase tracking-wider">Top Topics</h3>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(stats.topicBreakdown).map(([topic, count]) => (
                <span key={topic} className="bg-blue-900/30 text-blue-300 px-3 py-1 rounded-lg text-xs border border-blue-800/50">
                  {topic} <span className="opacity-50 ml-1">x{count}</span>
                </span>
              ))}
              {Object.keys(stats.topicBreakdown).length === 0 && <p className="text-slate-500 text-sm italic">No data yet.</p>}
            </div>
          </div>
        </div>

        {/* 📚 TABS SECTION */}
        <div className="bg-slate-800/40 rounded-2xl border border-slate-700 overflow-hidden min-h-[400px]">
          <div className="flex bg-slate-800/80 border-b border-slate-700">
            {["overview", "favorites"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-8 py-4 capitalize font-semibold transition-all relative ${
                  tab === t ? "text-blue-500" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t}
                {tab === t && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
                )}
              </button>
            ))}
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {tab === "overview" ? (
                <motion.div 
                  key="overview"
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: 10 }}
                >
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <BarChart3 className="text-blue-500" /> Mastery Summary
                  </h3>
                  <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 leading-relaxed">
                    <p className="text-slate-300">
                      You have successfully solved <span className="text-white font-bold">{stats.totalSolved}</span> problems across 
                      <span className="text-white font-bold ml-1">{Object.keys(stats.topicBreakdown).length}</span> unique technical topics. 
                      Keep pushing to improve your score on Hard difficulty problems!
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="favorites"
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: 10 }}
                >
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Star className="text-yellow-500 fill-yellow-500" /> Starred Problems
                  </h3>
                  {favorites.length > 0 ? (
                    <div className="grid gap-3">
                      {favorites.map((prob) => (
                        <div 
                          key={prob.id} 
                          onClick={() => navigate(`/problems/${prob.id}`)}
                          className="group flex justify-between items-center bg-slate-900/50 px-6 py-4 rounded-xl border border-slate-700 hover:border-blue-500 hover:bg-slate-800 transition-all cursor-pointer shadow-lg"
                        >
                          <span className="font-medium group-hover:text-blue-400 transition-colors">{prob.title}</span>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-tighter ${
                            prob.difficulty === 'Easy' ? 'bg-green-900/30 text-green-400 border border-green-800' : 
                            prob.difficulty === 'Medium' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800' : 
                            'bg-red-900/30 text-red-400 border border-red-800'
                          }`}>
                            {prob.difficulty}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 border-2 border-dashed border-slate-700 rounded-2xl">
                      <Star size={48} className="mx-auto text-slate-700 mb-4" />
                      <p className="text-slate-500">Your favorite problems will appear here.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 🛠️ EDIT MODAL COMPONENT */}
      <AnimatePresence>
        {isEditModalOpen && (
          <EditProfileModal 
            isOpen={isEditModalOpen} 
            onClose={() => setIsEditModalOpen(false)}
            currentData={user}
            onUpdateSuccess={fetchAllData} // Refresh data after update
          />
        )}
      </AnimatePresence>
    </div>
  );
}