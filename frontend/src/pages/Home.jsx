import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("http://localhost:5000/me/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Based on your backend: res.json({ user, stats: {...} })
          setUser(data.user);
        } else {
          // Token might be expired
          localStorage.removeItem("token");
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col overflow-hidden">
      {/* Navbar */}
      <div className="flex justify-between items-center px-8 py-4 border-b border-slate-700 z-20">
        <h1 
          className="text-xl font-semibold tracking-wide cursor-pointer" 
          onClick={() => navigate("/")}
        >
          Code Engine
        </h1>

        <div className="flex gap-4 items-center">
          {!loading && (
            <>
              {user ? (
                /* Authenticated View */
                <>
                  <span className="text-slate-400 mr-2">
                    Hi, <span className="text-white font-medium">{user.username}</span>
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate("/profile")}
                    className="px-4 py-1.5 rounded-md border border-slate-500 hover:border-blue-500 hover:text-blue-400 transition"
                  >
                    Profile
                  </motion.button>
                  <button
                    onClick={handleLogout}
                    className="text-slate-400 hover:text-red-400 text-sm transition"
                  >
                    Logout
                  </button>
                </>
              ) : (
                /* Guest View */
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate("/login")}
                    className="px-4 py-1.5 rounded-md border border-slate-500 hover:border-blue-500 hover:text-blue-400 transition"
                  >
                    Login
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate("/signup")}
                    className="px-4 py-1.5 rounded-md border border-slate-500 hover:border-blue-500 hover:text-blue-400 transition"
                  >
                    Sign Up
                  </motion.button>
                </>
              )}
            </>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/problems")}
            className="bg-blue-600 px-4 py-1.5 rounded-md hover:bg-blue-700 transition shadow-md shadow-blue-500/20"
          >
            Start Solving
          </motion.button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center text-center flex-1 px-6 relative">
        <div className="absolute w-[500px] h-[500px] bg-blue-600 opacity-20 blur-3xl rounded-full"></div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-6xl font-bold mb-6 leading-tight z-10"
        >
          Master <span className="text-blue-500">DSA</span> Like a Pro
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-slate-400 max-w-xl mb-8 text-lg z-10"
        >
          Practice coding problems, track your growth, and level up your problem-solving skills.
        </motion.p>

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/problems")}
          className="bg-blue-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 shadow-lg shadow-blue-500/30 z-10"
        >
          {user ? "Continue Solving →" : "Start Solving →"}
        </motion.button>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6 px-10 pb-16 z-10">
        {[
          { title: "Track Progress", desc: "Monitor solved problems and growth." },
          { title: "Smart Practice", desc: "Easy, Medium, Hard problems." },
          { title: "Instant Execution", desc: "Run code with real-time results." },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2 }}
            whileHover={{ y: -5 }}
            className="bg-slate-800/60 backdrop-blur-md p-6 rounded-xl border border-slate-700 hover:border-blue-500 transition"
          >
            <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
            <p className="text-slate-400 text-sm">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}