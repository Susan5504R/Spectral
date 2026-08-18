import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import api from "../api/axiosInstance";
import { jwtDecode } from "jwt-decode";
import Navbar from "../components/Navbar";
import { Cpu, Lock, User, ArrowRight, ShieldCheck } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
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
      localStorage.setItem("username", username);

      const decoded = jwtDecode(data.token);
      if (decoded.isAdmin) {
        localStorage.setItem("isAdmin", "true");
        navigate("/admin/add-problem");
      } else {
        navigate("/problems");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-darker dark:bg-sunset-50 text-warm-text dark:text-surface-darker flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute w-96 h-96 bg-sunset-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-warm-gold/10 blur-[80px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="neo-panel p-8 rounded-3xl w-full max-w-md relative z-10 space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sunset-500 to-sunset-400 p-0.5 mx-auto shadow-lg shadow-sunset-500/20">
              <div className="w-full h-full bg-surface-darker dark:bg-white rounded-[14px] flex items-center justify-center">
                <Cpu className="w-6 h-6 text-sunset-400" />
              </div>
            </div>
            <h2 className="text-2xl font-black tracking-tight">Welcome Back</h2>
            <p className="text-xs text-warm-muted dark:text-warm-muted-light">
              Sign in to access your problems, code execution history & dashboard.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-warm-muted mb-1">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 text-warm-muted/60 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full bg-surface-darker dark:bg-sunset-50 border border-surface-border dark:border-sunset-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-warm-text dark:text-surface-darker focus:outline-none focus:border-sunset-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-warm-muted">Password</label>
                <span
                  onClick={() => navigate("/forgot-password")}
                  className="text-xs font-semibold text-sunset-400 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 text-warm-muted/60 w-4 h-4" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-surface-darker dark:bg-sunset-50 border border-surface-border dark:border-sunset-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-warm-text dark:text-surface-darker focus:outline-none focus:border-sunset-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sunset-500 to-sunset-400 hover:from-sunset-400 hover:to-sunset-300 text-white font-bold text-sm shadow-lg shadow-sunset-500/20 transition-all hover:scale-[1.02] flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? "Authenticating..." : "Sign In"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center text-xs text-warm-muted">
            Don't have an account?{" "}
            <span
              onClick={() => navigate("/signup")}
              className="text-sunset-400 font-bold hover:underline cursor-pointer"
            >
              Create Account
            </span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
