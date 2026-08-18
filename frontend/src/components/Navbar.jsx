import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import {
  Code2, Sun, Moon, Cpu, User, LogOut, Bookmark, GitBranch,
  Terminal, ShieldCheck, CheckCircle2, ChevronDown, Sparkles
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Navbar() {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [serverOnline, setServerOnline] = useState(true);
  const [userDropdown, setUserDropdown] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [username, setUsername] = useState(() => localStorage.getItem("username") || "User");

  useEffect(() => {
    setToken(localStorage.getItem("token"));
    setUsername(localStorage.getItem("username") || "User");
  }, [location]);

  // Check backend connectivity status
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch(`${API}/problems`, { method: "GET" });
        setServerOnline(res.ok);
      } catch (err) {
        setServerOnline(false);
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("isAdmin");
    setUserDropdown(false);
    navigate("/login");
  };

  const navLinks = [
    { label: "Problems", path: "/problems", icon: Code2 },
    { label: "AST Graph", path: "/graph", icon: GitBranch },
    { label: "Favourites", path: "/favourites", icon: Bookmark }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-surface-dark/90 dark:bg-white/90 border-b border-surface-border dark:border-sunset-200 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center space-x-8">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sunset-500 to-sunset-400 p-0.5 shadow-lg shadow-sunset-500/20 group-hover:shadow-sunset-500/40 transition-all">
              <div className="w-full h-full bg-surface-darker dark:bg-white rounded-[10px] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-sunset-500 dark:text-sunset-600 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-warm-text via-sunset-400 to-sunset-500 dark:from-surface-darker dark:via-sunset-700 dark:to-sunset-600 bg-clip-text text-transparent">
                SPECTRAL
              </span>
              <span className="text-[10px] font-semibold text-sunset-400 dark:text-sunset-600 uppercase tracking-widest -mt-1 flex items-center space-x-1">
                <span>RCE Engine</span>
                <span className="w-1 h-1 rounded-full bg-sunset-400 animate-ping" />
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-sunset-500/10 text-sunset-500 dark:text-sunset-600 border border-sunset-500/30 font-semibold"
                      : "text-warm-muted dark:text-warm-muted-light hover:text-warm-text dark:hover:text-surface-darker hover:bg-surface-raised dark:hover:bg-sunset-50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-sunset-500 dark:text-sunset-600" : "text-warm-muted"}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">

          {/* System Status Pill */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-surface-raised dark:bg-sunset-50 border border-surface-border dark:border-sunset-200 text-xs neo-btn">
            <span
              className={`w-2 h-2 rounded-full ${
                serverOnline ? "bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" : "bg-rose-500"
              }`}
            />
            <span className="text-warm-muted dark:text-warm-muted-light font-medium">
              {serverOnline ? "Engine Online" : "Engine Offline"}
            </span>
          </div>

          {/* Day / Night Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-surface-raised dark:bg-sunset-50 border border-surface-border dark:border-sunset-200 text-warm-muted dark:text-warm-muted-light hover:text-sunset-500 dark:hover:text-sunset-600 hover:border-sunset-500/40 transition-all neo-btn"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun className="w-4 h-4 text-warm-gold" /> : <Moon className="w-4 h-4 text-warm-muted-light" />}
          </button>

          {/* Auth State Menu */}
          {token ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdown(!userDropdown)}
                className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-surface-raised dark:bg-sunset-50 border border-surface-border dark:border-sunset-200 text-warm-text dark:text-surface-darker hover:border-sunset-500/40 transition-all neo-btn"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sunset-500 to-sunset-400 flex items-center justify-center font-bold text-white text-xs shadow-md">
                  {username.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium max-w-[100px] truncate">{username}</span>
                <ChevronDown className="w-3.5 h-3.5 text-warm-muted" />
              </button>

              {userDropdown && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-xl bg-surface-dark dark:bg-white border border-surface-border dark:border-sunset-200 py-2 z-50"
                  style={{ boxShadow: '8px 8px 20px #12122a, -8px -8px 20px #24243e' }}
                  onMouseLeave={() => setUserDropdown(false)}
                >
                  <div className="px-4 py-2 border-b border-surface-border dark:border-sunset-200">
                    <p className="text-xs text-warm-muted">Signed in as</p>
                    <p className="text-sm font-bold text-warm-text dark:text-surface-darker truncate">{username}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setUserDropdown(false)}
                    className="flex items-center space-x-2.5 px-4 py-2.5 text-sm text-warm-muted dark:text-warm-muted-light hover:bg-surface-raised dark:hover:bg-sunset-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-sunset-500" />
                    <span>Dashboard & Profile</span>
                  </Link>
                  <Link
                    to="/favourites"
                    onClick={() => setUserDropdown(false)}
                    className="flex items-center space-x-2.5 px-4 py-2.5 text-sm text-warm-muted dark:text-warm-muted-light hover:bg-surface-raised dark:hover:bg-sunset-50 transition-colors"
                  >
                    <Bookmark className="w-4 h-4 text-warm-gold" />
                    <span>Saved Problems</span>
                  </Link>
                  <div className="border-t border-surface-border dark:border-sunset-200 my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2.5 px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-warm-muted dark:text-warm-muted-light hover:text-sunset-500 dark:hover:text-sunset-600 transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-sunset-500 to-sunset-400 hover:from-sunset-400 hover:to-sunset-300 text-white font-medium text-sm shadow-md shadow-sunset-500/20 transition-all hover:scale-105"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
