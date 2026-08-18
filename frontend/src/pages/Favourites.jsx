import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axiosInstance";
import Navbar from "../components/Navbar";
import { ArrowLeft, Star, Code2, ArrowUpRight, Bookmark } from "lucide-react";

export default function Favourites() {
  const navigate = useNavigate();
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetchFavourites();
  }, []);

  const fetchFavourites = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.get("/me/favourites");
      setFavourites(response.data);
    } catch (err) {
      console.error("Fetch Favourites Error:", err);
      setErrorMsg("Failed to load your saved problems.");
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-darker dark:bg-sunset-50 text-warm-text dark:text-surface-darker flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        
        {/* Top Header & Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border dark:border-sunset-200 pb-6">
          <div className="space-y-1">
            <button
              onClick={() => navigate("/problems")}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-warm-muted hover:text-warm-text bg-surface-raised dark:bg-sunset-50 border border-surface-border dark:border-sunset-200 hover:bg-surface-border transition-colors mb-2 neo-btn"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Problems</span>
            </button>
            <h1 className="text-3xl font-extrabold tracking-tight text-warm-text dark:text-surface-darker flex items-center space-x-3">
              <Star className="w-7 h-7 text-warm-gold fill-warm-gold" />
              <span>Saved Favourites</span>
            </h1>
            <p className="text-sm text-warm-muted dark:text-warm-muted-light">
              Personal bookmark list of problems saved for revision and practice.
            </p>
          </div>
        </div>

        {/* Error State */}
        {errorMsg && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm font-semibold text-center">
            {errorMsg}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-2 border-sunset-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          /* Favourites List */
          <div className="grid gap-4">
            {favourites.length === 0 ? (
              <div className="text-center py-20 neo-panel p-8 space-y-4">
                <Bookmark className="w-12 h-12 text-warm-muted/40 mx-auto" />
                <h3 className="text-lg font-bold text-warm-text">No Saved Problems Yet</h3>
                <p className="text-xs text-warm-muted/60 max-w-sm mx-auto">
                  Click the star icon next to any problem in the problem catalog to save it here.
                </p>
                <button
                  onClick={() => navigate("/problems")}
                  className="px-4 py-2 rounded-xl bg-sunset-500 hover:bg-sunset-400 text-white font-bold text-xs shadow-lg shadow-sunset-500/20 transition-all"
                >
                  Explore Problem Catalog
                </button>
              </div>
            ) : (
              favourites.map((prob) => (
                <motion.div
                  key={prob.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => navigate(`/problem/${prob.id}`)}
                  className="neo-panel neo-hover p-5 rounded-2xl flex items-center justify-between cursor-pointer group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-base text-warm-text dark:text-surface-darker group-hover:text-sunset-400 transition-colors">
                        {prob.title}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          prob.difficulty === "Easy"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : prob.difficulty === "Medium"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {prob.difficulty}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-sunset-500 to-sunset-400 hover:from-sunset-400 hover:to-sunset-300 text-white font-bold text-xs shadow-md shadow-sunset-500/20 transition-all flex items-center space-x-1.5">
                      <span>Solve Problem</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
