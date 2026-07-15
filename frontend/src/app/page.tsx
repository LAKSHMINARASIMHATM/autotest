"use client";

import { motion } from "framer-motion";
import { ArrowRight, Bot, GitBranch, Network, Shield, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Bot, title: "13 AI Agents", desc: "Autonomous multi-agent pipeline for end-to-end quality engineering" },
  { icon: Network, title: "Knowledge Graph", desc: "Neo4j-powered project understanding with structural reasoning" },
  { icon: Sparkles, title: "RAG Pipeline", desc: "Hybrid retrieval with dense embeddings and graph traversal" },
  { icon: Shield, title: "Auto Repair", desc: "Generate, validate, and apply patches in isolated sandboxes" },
  { icon: GitBranch, title: "CI/CD Ready", desc: "Integrate into your pipeline with Docker and GitHub Actions" },
  { icon: Zap, title: "Explainable AI", desc: "Every decision includes reasoning traces and confidence scores" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#3B82F6]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#8B5CF6]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.15)] mb-8"
      >
        <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
        <span className="text-xs font-semibold text-[#3B82F6] tracking-wide">AI-POWERED QUALITY ENGINEERING</span>
      </motion.div>

      {/* Hero */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        className="text-5xl md:text-7xl font-extrabold text-center leading-[1.1] tracking-tight max-w-4xl"
      >
        <span className="gradient-text">Autonomous</span>
        <br />
        Software Quality
        <br />
        Engineering
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-lg text-[#9CA3AF] text-center max-w-2xl mt-6 leading-relaxed"
      >
        AutoTestAI deploys 13 specialized AI agents to analyze your codebase,
        generate intelligent tests, localize bugs, repair code, and continuously
        learn — all autonomously.
      </motion.p>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5 }}
        className="flex items-center gap-3 mt-10"
      >
        <Link href="/dashboard">
          <Button size="lg" className="gap-2 text-[15px]">
            Open Dashboard
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
        <Button variant="secondary" size="lg" className="text-[15px]">
          View Docs
        </Button>
      </motion.div>

      {/* Features grid */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-20 max-w-5xl w-full"
      >
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + i * 0.08, duration: 0.4 }}
            className="glass-card p-5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6]/20 to-[#8B5CF6]/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
              <f.icon className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <h3 className="text-[15px] font-semibold text-[#F9FAFB] mb-1">{f.title}</h3>
            <p className="text-[13px] text-[#6B7280] leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
