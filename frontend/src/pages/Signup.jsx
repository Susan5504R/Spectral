import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import api from "../api/axiosInstance";
import Navbar from "../components/Navbar";
import { Cpu, Lock, User, Mail, ShieldCheck, ArrowRight } from "lucide-react";

export default function Signup() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    setLoading(true);

    try {
      await api.post("/register", {
        username,
        email,
        password,
        adminKey
      });

      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-surface-darker dark:bg-sunset-50 border border-surface-border dark:border-sunset-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-warm-text dark:text-surface-darker focus:outline-none focus:border-sunset-500 transition-colors";

  return (
    <div className="min-h-screen bg-surface-darker dark:bg-sunset-50 text-warm-text dark:text-surface-darker flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden my-8">
        <div className="absolute w-96 h-96 bg-sunset-400/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-warm-gold/10 blur-[80px] rounded-full pointer-events-none" />

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
            <h2 className="text-2xl font-black tracking-tight">Create Account</h2>
            <p className="text-xs text-warm-muted dark:text-warm-muted-light">
              Join Spectral to solve problems and track execution performance.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-warm-muted mb-1">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 text-warm-muted/60 w-4 h-4" />
                <input type="text" placeholder="Choose a unique username" value={username} onChange={(e) => setUsername(e.target.value)} required className={inputCls} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-warm-muted mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 text-warm-muted/60 w-4 h-4" />
                <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-warm-muted mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 text-warm-muted/60 w-4 h-4" />
                <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputCls} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-warm-muted mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 text-warm-muted/60 w-4 h-4" />
                <input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputCls} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-warm-muted mb-1">Admin Key (Optional)</label>
              <div className="relative">
                <ShieldCheck className="absolute left-3.5 top-3 text-warm-muted/60 w-4 h-4" />
                <input type="password" placeholder="Enter key if registering as admin" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} className={inputCls} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sunset-500 to-sunset-400 hover:from-sunset-400 hover:to-sunset-300 text-white font-bold text-sm shadow-lg shadow-sunset-500/20 transition-all hover:scale-[1.02] flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? "Creating Account..." : "Sign Up"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center text-xs text-warm-muted">
            Already have an account?{" "}
            <span
              onClick={() => navigate("/login")}
              className="text-sunset-400 font-bold hover:underline cursor-pointer"
            >
              Sign In
            </span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
