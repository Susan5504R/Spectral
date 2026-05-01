import { useState } from "react";
import api from "../api/axiosInstance";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/forgot-password", { email });
      setMessage("Reset email sent!");
    } catch (err) {
      setMessage(err.response?.data?.error || "Error");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-900 text-white">
      <form onSubmit={handleSubmit} className="bg-slate-800 p-6 rounded">
        <h2 className="mb-4">Forgot Password</h2>

        <input
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="p-2 w-full mb-4 bg-slate-900 border"
        />

        <button className="bg-blue-600 p-2 w-full">Send Reset Link</button>

        {message && <p className="mt-4 text-sm">{message}</p>}
      </form>
    </div>
  );
}