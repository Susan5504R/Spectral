import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import api from "../api/axiosInstance";

export default function Login() {
  const navigate = useNavigate();

  // Changed 'email' to 'username' to match backend model
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/login", { username, password });
      localStorage.setItem("token", data.token);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute w-[400px] h-[400px] bg-blue-600 opacity-20 blur-3xl rounded-full"></div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="z-10 bg-slate-800/60 backdrop-blur-md p-8 rounded-2xl border border-slate-700 w-full max-w-md shadow-lg"
      >
        <h2 className="text-3xl font-bold mb-6 text-center">Welcome Back 👋</h2>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-500 p-3 rounded-md mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {/* Username Input */}
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="bg-slate-900 border border-slate-600 px-4 py-2 rounded-md focus:outline-none focus:border-blue-500 transition-colors"
          />

          {/* Password Input */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-slate-900 border border-slate-600 px-4 py-2 rounded-md focus:outline-none focus:border-blue-500 transition-colors"
          />

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className={`bg-blue-600 py-2 rounded-md font-semibold mt-2 shadow-md shadow-blue-500/30 transition-all ${
              loading ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
            }`}
          >
            {loading ? "Logging in..." : "Login"}
          </motion.button>
        </form>

        <div className="flex items-center gap-2 my-6">
          <div className="flex-1 h-[1px] bg-slate-600"></div>
          <span className="text-slate-400 text-sm">OR</span>
          <div className="flex-1 h-[1px] bg-slate-600"></div>
        </div>

        <p className="text-center text-slate-400 text-sm">
          Don’t have an account?{" "}
          <span
            onClick={() => navigate("/signup")}
            className="text-blue-500 cursor-pointer hover:underline"
          >
            Sign Up
          </span>
        </p>
      </motion.div>
    </div>
  );
}