import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import api from "../api/axiosInstance";
import { jwtDecode } from "jwt-decode";
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

const decoded = jwtDecode(data.token);

if (decoded.isAdmin) {
  navigate("/admin/add-problem");
} else {
  navigate("/");
}
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <motion.div className="bg-slate-800 p-8 rounded-xl w-full max-w-md">
        <h2 className="text-2xl mb-6 text-center">Login</h2>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="p-2 bg-slate-900 border border-slate-600 rounded"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="p-2 bg-slate-900 border border-slate-600 rounded"
          />

          {/* 🔥 NEW: Forgot Password */}
          <div className="text-right text-sm">
            <span
              onClick={() => navigate("/forgot-password")}
              className="text-blue-400 cursor-pointer hover:underline"
            >
              Forgot Password?
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 py-2 rounded"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-center text-sm mt-4">
          Don’t have an account?{" "}
          <span
            onClick={() => navigate("/signup")}
            className="text-blue-400 cursor-pointer"
          >
            Sign Up
          </span>
        </p>
      </motion.div>
    </div>
  );
}