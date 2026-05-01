import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";

export default function Signup() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSignup = (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    // TODO: connect backend later
    console.log("Signup:", name, email, password);

    navigate("/login"); // redirect after signup
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center relative overflow-hidden">

      {/* Background Glow */}
      <div className="absolute w-[450px] h-[450px] bg-blue-600 opacity-20 blur-3xl rounded-full"></div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-slate-800/60 backdrop-blur-md p-8 rounded-2xl border border-slate-700 w-full max-w-md shadow-lg"
      >
        {/* Title */}
        <h2 className="text-3xl font-bold mb-6 text-center">
          Create Account 🚀
        </h2>

        {/* Form */}
        <form onSubmit={handleSignup} className="flex flex-col gap-4">

          {/* Name */}
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="bg-slate-900 border border-slate-600 px-4 py-2 rounded-md focus:outline-none focus:border-blue-500"
          />

          {/* Email */}
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-slate-900 border border-slate-600 px-4 py-2 rounded-md focus:outline-none focus:border-blue-500"
          />

          {/* Password */}
          <input
            type="password"
            placeholder="Create Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-slate-900 border border-slate-600 px-4 py-2 rounded-md focus:outline-none focus:border-blue-500"
          />

          {/* Confirm Password */}
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="bg-slate-900 border border-slate-600 px-4 py-2 rounded-md focus:outline-none focus:border-blue-500"
          />

          {/* Signup Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="bg-blue-600 py-2 rounded-md font-semibold hover:bg-blue-700 mt-2 shadow-md shadow-blue-500/30"
          >
            Sign Up
          </motion.button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-2 my-6">
          <div className="flex-1 h-[1px] bg-slate-600"></div>
          <span className="text-slate-400 text-sm">OR</span>
          <div className="flex-1 h-[1px] bg-slate-600"></div>
        </div>

        {/* Login Redirect */}
        <p className="text-center text-slate-400 text-sm">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-blue-500 cursor-pointer hover:underline"
          >
            Login
          </span>
        </p>
      </motion.div>
    </div>
  );
}