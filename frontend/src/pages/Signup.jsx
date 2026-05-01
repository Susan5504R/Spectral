import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import api from "../api/axiosInstance";

export default function Signup() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(""); // ✅ added
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
const [adminKey, setAdminKey] = useState("");
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

      alert("Account created successfully!");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <motion.div className="bg-slate-800 p-8 rounded-xl w-full max-w-md">
        <h2 className="text-3xl mb-6 text-center">Create Account 🚀</h2>

        {error && (
          <div className="text-red-500 text-sm mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="flex flex-col gap-4">

          {/* Username */}
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="p-2 bg-slate-900 border border-slate-600 rounded"
          />

          {/* 🔥 Email */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="p-2 bg-slate-900 border border-slate-600 rounded"
          />

          {/* Password */}
          <input
            type="password"
            placeholder="Create Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="p-2 bg-slate-900 border border-slate-600 rounded"
          />

          {/* Confirm Password */}
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="p-2 bg-slate-900 border border-slate-600 rounded"
          />
          <input
  type="password"
  placeholder="Admin Key (optional)"
  value={adminKey}
  onChange={(e) => setAdminKey(e.target.value)}
  className="bg-slate-900 border border-slate-600 px-4 py-2 rounded-md focus:outline-none focus:border-blue-500 transition-colors"
/>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 py-2 rounded"
          >
            {loading ? "Creating..." : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-sm mt-4">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-blue-400 cursor-pointer"
          >
            Login
          </span>
        </p>
      </motion.div>
    </div>
  );
}