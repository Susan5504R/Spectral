import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    // TODO: connect backend later
    console.log("Login:", email, password);

    navigate("/problems"); // temp redirect
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center relative overflow-hidden">

      {/* Background Glow */}
      <div className="absolute w-[400px] h-[400px] bg-blue-600 opacity-20 blur-3xl rounded-full"></div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-slate-800/60 backdrop-blur-md p-8 rounded-2xl border border-slate-700 w-full max-w-md shadow-lg"
      >
        {/* Title */}
        <h2 className="text-3xl font-bold mb-6 text-center">
          Welcome Back 👋
        </h2>

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">

          {/* Email */}
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-slate-900 border border-slate-600 px-4 py-2 rounded-md focus:outline-none focus:border-blue-500"
          />

          {/* Password */}
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-slate-900 border border-slate-600 px-4 py-2 rounded-md focus:outline-none focus:border-blue-500"
          />

          {/* Login Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="bg-blue-600 py-2 rounded-md font-semibold hover:bg-blue-700 mt-2 shadow-md shadow-blue-500/30"
          >
            Login
          </motion.button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-2 my-6">
          <div className="flex-1 h-[1px] bg-slate-600"></div>
          <span className="text-slate-400 text-sm">OR</span>
          <div className="flex-1 h-[1px] bg-slate-600"></div>
        </div>

        {/* Signup Redirect */}
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