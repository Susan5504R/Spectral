import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import {
  Cpu, Zap, ShieldCheck, GitBranch, ArrowRight, Code2,
  Terminal, Sparkles, CheckCircle2, Layers, Server
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1 } }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="min-h-screen bg-surface-darker dark:bg-sunset-50 text-warm-text dark:text-surface-darker flex flex-col selection:bg-sunset-500/30">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex-1 flex flex-col justify-center">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-sunset-500/20 to-sunset-400/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-warm-gold/10 to-sunset-500/10 blur-[100px] rounded-full pointer-events-none" />

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="text-center relative z-10 space-y-8 max-w-4xl mx-auto"
        >
          {/* Top Pill Badge */}
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-surface-dark/90 dark:bg-sunset-50 border border-sunset-500/30 text-sunset-400 text-xs font-semibold neo-btn"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>High-Performance Distributed Code Execution Engine</span>
          </motion.div>

          {/* Main Title */}
          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight"
          >
            Execute Code with{" "}
            <span className="bg-gradient-to-r from-sunset-500 via-sunset-400 to-warm-gold bg-clip-text text-transparent">
              Zero Latency & Hard Sandbox Isolation
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            className="text-lg sm:text-xl text-warm-muted dark:text-warm-muted-light max-w-2xl mx-auto font-normal leading-relaxed"
          >
            Spectral combines BullMQ worker nodes, Docker process sandboxes, AST transformation graphs, and AI anti-cheat analytics to deliver a modern LeetCode-grade platform.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <button
              onClick={() => navigate(token ? "/problems" : "/signup")}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-sunset-500 to-sunset-400 hover:from-sunset-400 hover:to-sunset-300 text-white font-bold text-base shadow-xl shadow-sunset-500/25 transition-all hover:scale-105 flex items-center justify-center space-x-2"
            >
              <span>{token ? "Explore Problems" : "Get Started Free"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("/graph")}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-surface-dark/80 dark:bg-white hover:bg-surface-raised dark:hover:bg-sunset-50 text-warm-text dark:text-surface-darker font-bold text-base border border-surface-border dark:border-sunset-200 transition-all flex items-center justify-center space-x-2 neo-btn"
            >
              <GitBranch className="w-4 h-4 text-sunset-400" />
              <span>View AST Graph</span>
            </button>
          </motion.div>
        </motion.div>

        {/* Feature Cards Grid */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid md:grid-cols-4 gap-6 pt-20 z-10"
        >
          {[
            {
              icon: Cpu,
              color: "text-sunset-500",
              title: "Docker Isolation",
              desc: "Untrusted code executes in capped, zero-network container sandboxes."
            },
            {
              icon: Zap,
              color: "text-warm-gold",
              title: "BullMQ Distributed Queue",
              desc: "Guaranteed asynchronous job queueing with Redis backing."
            },
            {
              icon: GitBranch,
              color: "text-sunset-400",
              title: "AST Evolution Graph",
              desc: "Tree-sitter AST hashing to track step-by-step student problem solving."
            },
            {
              icon: ShieldCheck,
              color: "text-emerald-400",
              title: "AI Anti-Cheat System",
              desc: "Jaccard & Gemini LLM plagiarism detection across submissions."
            }
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={i}
                variants={fadeUp}
                whileHover={{ y: -6 }}
                className="neo-panel neo-hover p-6 rounded-2xl space-y-3"
              >
                <div className="w-12 h-12 rounded-xl bg-surface-raised dark:bg-sunset-50 border border-surface-border dark:border-sunset-200 flex items-center justify-center neo-btn">
                  <Icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <h3 className="text-base font-bold text-warm-text dark:text-surface-darker">{item.title}</h3>
                <p className="text-xs text-warm-muted dark:text-warm-muted-light leading-relaxed">{item.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>
    </div>
  );
}
