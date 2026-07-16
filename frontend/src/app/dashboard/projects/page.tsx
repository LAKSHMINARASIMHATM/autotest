"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderGit2, Plus, GitBranch, Globe, Code, CheckCircle, RefreshCw, BarChart2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusBadge } from "@/components/ui/status-badge";

interface Project {
  id: string;
  name: string;
  repo: string;
  branch: string;
  language: string;
  health: number;
  coverage: number;
  testCount: number;
  status: "idle" | "running" | "success" | "error";
  lastRun: string;
}

const initialProjects: Project[] = [
  { id: "1", name: "AutoTestAI", repo: "github.com/autotest/core", branch: "main", language: "Python/Next.js", health: 94, coverage: 85.3, testCount: 1247, status: "success", lastRun: "12 mins ago" },
  { id: "2", name: "InterviewGPT", repo: "github.com/user/interview-gpt", branch: "main", language: "TypeScript/React", health: 88, coverage: 78.4, testCount: 512, status: "idle", lastRun: "3 hours ago" },
  { id: "3", name: "ScholarAgent", repo: "github.com/research/scholar-agent", branch: "develop", language: "Python/LangGraph", health: 91, coverage: 82.1, testCount: 862, status: "running", lastRun: "Just now" },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [projName, setProjName] = useState("");
  const [branch, setBranch] = useState("main");
  const [lang, setLang] = useState("Python");
  const [isScanning, setIsScanning] = useState(false);

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName || !repoUrl) return;

    setIsScanning(true);
    setTimeout(() => {
      const newProj: Project = {
        id: (projects.length + 1).toString(),
        name: projName,
        repo: repoUrl.replace("https://", "").replace("http://", ""),
        branch: branch,
        language: lang,
        health: 100,
        coverage: 0,
        testCount: 0,
        status: "idle",
        lastRun: "Never",
      };
      setProjects([newProj, ...projects]);
      setIsScanning(false);
      setIsImportOpen(false);
      // Reset form
      setRepoUrl("");
      setProjName("");
      setBranch("main");
      setLang("Python");
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto relative min-h-screen pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">
            <span className="gradient-text">Project</span> Workspace
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Import, scan, and manage code repositories for auto-testing.
          </p>
        </div>
        <Button onClick={() => setIsImportOpen(true)} className="gap-2 text-[13px] font-semibold">
          <Plus className="w-4 h-4" /> Import Project
        </Button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((proj) => (
          <GlassCard key={proj.id} className="p-6 relative overflow-hidden" glow={proj.status === "running" ? "blue" : "none"}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6]/10 to-[#8B5CF6]/10 flex items-center justify-center">
                  <FolderGit2 className="w-5 h-5 text-[#3B82F6]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#F9FAFB]">{proj.name}</h3>
                  <p className="text-xs text-[#6B7280] flex items-center gap-1 mt-0.5 font-mono">
                    <Globe className="w-3.5 h-3.5" /> {proj.repo}
                  </p>
                </div>
              </div>
              <StatusBadge status={proj.status === "running" ? "running" : proj.status === "success" ? "success" : "idle"} />
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4 text-xs">
                <span className="text-[#9CA3AF] flex items-center gap-1 font-mono">
                  <GitBranch className="w-3.5 h-3.5" /> {proj.branch}
                </span>
                <span className="text-[#9CA3AF] flex items-center gap-1">
                  <Code className="w-3.5 h-3.5" /> {proj.language}
                </span>
              </div>

              {/* Progress/Score bars */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#6B7280] flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Health Index</span>
                    <span className="font-semibold text-[#F9FAFB]">{proj.health}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full" style={{ width: `${proj.health}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#6B7280] flex items-center gap-1"><BarChart2 className="w-3.5 h-3.5" /> Coverage</span>
                    <span className="font-semibold text-[#F9FAFB]">{proj.coverage}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" style={{ width: `${proj.coverage}%` }} />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between text-xs text-[#6B7280]">
                <span>Tests: <strong className="text-[#F9FAFB]">{proj.testCount}</strong></span>
                <span>Last run: <strong className="text-[#F9FAFB]">{proj.lastRun}</strong></span>
              </div>

              <div className="pt-2 flex gap-2">
                <Button variant="secondary" className="w-full text-xs py-1 h-8">View details</Button>
                <Button className="w-full text-xs py-1 h-8">Scan repo</Button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Import Modal */}
      <AnimatePresence>
        {isImportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-card max-w-lg w-full p-6 space-y-4 border border-[rgba(255,255,255,0.1)] relative"
            >
              <h2 className="text-lg font-bold text-[#F9FAFB]">Import Repository</h2>
              <p className="text-xs text-[#6B7280]">Connect your GitHub repo to set up AutoTestAI pipelines.</p>

              <form onSubmit={handleImport} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#9CA3AF]">Project Name</label>
                  <input
                    type="text"
                    required
                    value={projName}
                    onChange={(e) => setProjName(e.target.value)}
                    placeholder="e.g. ecommerce-backend"
                    className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#9CA3AF]">Repository URL</label>
                  <input
                    type="text"
                    required
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="e.g. github.com/username/repo"
                    className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#9CA3AF]">Default Branch</label>
                    <input
                      type="text"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="main"
                      className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#9CA3AF]">Language/Framework</label>
                    <select
                      value={lang}
                      onChange={(e) => setLang(e.target.value)}
                      className="w-full bg-[#18181B] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                    >
                      <option value="Python">Python</option>
                      <option value="TypeScript/React">TypeScript/React</option>
                      <option value="Next.js">Next.js</option>
                      <option value="Go">Go</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <Button type="button" variant="secondary" onClick={() => setIsImportOpen(false)} disabled={isScanning}>
                    Cancel
                  </Button>
                  <Button type="submit" className="gap-2" disabled={isScanning}>
                    {isScanning ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Scanning...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" /> Confirm Import
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
