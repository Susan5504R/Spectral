import { useParams } from "react-router-dom";
import { useState } from "react";
import api from "../api/axiosInstance";

export default function ResetPassword() {
  const { token } = useParams();

  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();

    try {
      await api.post(`/reset-password/${token}`, {
        newPassword: password
      });
      setMessage("Password reset successful!");
    } catch (err) {
      setMessage(err.response?.data?.error || "Error");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-900 text-white">
      <form onSubmit={handleReset} className="bg-slate-800 p-6 rounded">
        <h2 className="mb-4">Reset Password</h2>

        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="p-2 w-full mb-4 bg-slate-900 border"
        />

        <button className="bg-green-600 p-2 w-full">Reset Password</button>

        {message && <p className="mt-4 text-sm">{message}</p>}
      </form>
    </div>
  );
}