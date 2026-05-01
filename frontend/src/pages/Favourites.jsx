import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axiosInstance";

export default function Favourites() {
  const navigate = useNavigate();
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetchFavourites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFavourites = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Connects to GET /me/favourites in server.js
      const response = await api.get("/me/favourites");
      setFavourites(response.data);
    } catch (err) {
      console.error("Fetch Favourites Error:", err);
      setErrorMsg("Failed to load your favourite problems.");
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (level) => {
    switch (level) {
      case "Easy": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
      case "Medium": return "text-amber-400 bg-amber-400/10 border-amber-400/20";
      case "Hard": return "text-rose-400 bg-rose-400/10 border-rose-400/20";
      default: return "text-slate-400 bg-slate-400/10 border-slate-400/20";
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-300 p-8">
      <div className="max-w-4xl mx-auto">
        
        <div className="mb-8 border-b border-[#30363d] pb-4">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            ⭐ My Favourites
          </h1>
          <p className="text-slate-400 mt-2">
            Problems you've saved for later review.
          </p>
        </div>

        {/* Error State */}
        {errorMsg && (
          <div className="p-4 mb-6 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-center">
            {errorMsg}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
          </div>
        ) : (
          /* Favourites List */
          <div className="grid gap-4">
            {favourites.length === 0 ? (
              <div className="text-center py-16 text-slate-500 bg-[#161b22] rounded-xl border border-[#30363d]">
                You haven't favourited any problems yet. Go explore!
              </div>
            ) : (
              favourites.map((prob) => (
                <motion.div
                  key={prob.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ scale: 1.01 }}
                  className="bg-[#161b22] border border-[#30363d] p-5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:border-yellow-500/50"
                >
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-[#c9d1d9] mb-2">
                      {prob.title}
                    </h3>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full border ${getDifficultyColor(prob.difficulty)}`}>
                        {prob.difficulty}
                      </span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => navigate(`/problems/${prob.id}`)}
                    className="bg-[#21262d] border border-[#363b42] hover:bg-[#30363d] text-[#c9d1d9] px-4 py-2 rounded-md text-sm font-semibold transition-colors w-full md:w-auto"
                  >
                    Solve Again
                  </button>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}