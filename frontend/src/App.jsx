import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Problems from "./pages/Problems";
import Problem from "./pages/Problem";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import Favourites from "./pages/Favourites";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminProblem from "./pages/AdminProblem";
import GraphStats from "./pages/GraphStats";
import PlagiarismReport from "./pages/PlagiarismReport";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/problems" element={<Problems />} />
        <Route path="/problem/:id" element={<Problem />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/favourites" element={<Favourites />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/admin/problem" element={<AdminProblem />} />
        <Route path="/graph" element={<GraphStats />} />
        <Route path="/plagiarism/:submissionId" element={<PlagiarismReport />} />
      </Routes>
    </BrowserRouter>
  );
}
