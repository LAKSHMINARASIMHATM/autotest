"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderGit2, Plus, GitBranch, Globe, Code, CheckCircle,
  RefreshCw, BarChart2, Shield, Play, Zap, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  listProjects, importFromGitHub, triggerAgentPipeline, getPipelineStatus,
  type ProjectItem, type GitHubImportResponse, type PipelineStatusResponse,
} from "@/lib/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importResult, setImportResult] = useState<GitHubImportResponse | null>(null);

  // Form state
  const [repoUrl, setRepoUrl] = useState("");
  const [projName, setProjName] = useState("");
  const [branch, setBranch] = useState("main");
  const [description, setDescription] = useState("");
  const [autoRun, setAutoRun] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Session polling
  const [sessions, setSessions] = useState<Record<string, PipelineStatusResponse>>({});

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await listProjects();
      setProjects(res.items);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  // Poll active pipeline sessions every 5s
  useEffect(() => {
    const active = Object.values(sessions).filter(s => s.status === "running");
    if (active.length === 0) return;
    const timer = setInterval(async () => {
      for (const s of active) {
        try {
          const updated = await getPipelineStatus(s.session_id);
          setSessions(prev => ({ ...prev, [s.session_id]: updated }));
          if (updated.status !== "running") {
            fetchProjects(); // Refresh project list when done
          }
        } catch { /* ignore */ }
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [sessions]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) return;
    setIsImporting(true);
    setImportError(null);

    try {
      const result = await importFromGitHub({
        repo_url: repoUrl,
        name: projName || undefined,
        branch,
        description: description || undefined,
        auto_run_agents: autoRun,
      });
      setImportResult(result);

      // Track pipeline session
      if (result.session_id) {
        setSessions(prev => ({
          ...prev,
          [result.session_id!]: {
            session_id: result.session_id!,
            project_id: result.project_id,
            status: "running",
            agents_run: [],
            test_cases_generated: 0,
            bugs_found: 0,
            patches_generated: 0,
          },
        }));
      }
      await fetchProjects();
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const handleRunPipeline = async (projectId: string) => {
    try {
      const res = await triggerAgentPipeline(projectId, 2);
      setSessions(prev => ({
        ...prev,
        [res.session_id]: {
          session_id: res.session_id,
          project_id: projectId,
          status: "running",
          agents_run: [],
          test_cases_generated: 0,
          bugs_found: 0,
          patches_generated: 0,
        },
      }));
    } catch (err) {
      console.error("Pipeline trigger failed:", err);
    }
  };

  const closeModal = () => {
    setIsImportOpen(false);
    setImportResult(null);
    setImportError(null);
    setRepoUrl("");
    setProjName("");
    setBranch("main");
    setDescription("");
  };

  const getSessionForProject = (projectId: string) =>
    Object.values(sessions).find(s => s.project_id === projectId);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto relative min-h-screen pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">
            <span className="gradient-text">Project</span> Workspace
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Import from GitHub and run autonomous AI quality engineering pipelines.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={fetchProjects} disabled={loading} className="gap-2 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={() => setIsImportOpen(true)} className="gap-2 text-[13px] font-semibold">
            <Plus className="w-4 h-4" /> Import from GitHub
          </Button>
        </div>
      </div>

      {/* Active pipeline sessions banner */}
      {Object.values(sessions).filter(s => s.status === "running").map(s => (
        <div key={s.session_id} className="flex items-center gap-3 bg-blue-900/20 border border-blue-700/30 px-4 py-3 rounded-xl text-sm text-blue-300">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
          <span>
            Pipeline <span className="font-mono text-xs">{s.session_id.slice(0, 8)}</span> running for project <strong>{s.project_id.slice(-6)}</strong>…
          </span>
        </div>
      ))}
      {Object.values(sessions).filter(s => s.status === "complete").map(s => (
        <div key={s.session_id} className="flex items-center gap-3 bg-emerald-900/20 border border-emerald-700/30 px-4 py-3 rounded-xl text-sm text-emerald-300">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>
            Pipeline complete — <strong>{s.test_cases_generated}</strong> test cases · <strong>{s.bugs_found}</strong> bugs · <strong>{s.patches_generated}</strong> patches generated
          </span>
        </div>
      ))}

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-60 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      ) : projects.length === 0 ? (
        <GlassCard className="p-16 flex flex-col items-center justify-center gap-4 text-center">
          <FolderGit2 className="w-10 h-10 text-[#6B7280]" />
          <p className="text-[#6B7280] text-sm">No projects yet. Import a GitHub repository to get started.</p>
          <Button onClick={() => setIsImportOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Import from GitHub
          </Button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => {
            const session = getSessionForProject(proj.id);
            const isRunning = session?.status === "running";
            return (
              <GlassCard key={proj.id} className="p-6 relative overflow-hidden" glow={isRunning ? "blue" : "none"}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6]/10 to-[#8B5CF6]/10 flex items-center justify-center">
                      <FolderGit2 className="w-5 h-5 text-[#3B82F6]" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-[#F9FAFB]">{proj.name}</h3>
                      <p className="text-xs text-[#6B7280] flex items-center gap-1 mt-0.5 font-mono">
                        <Globe className="w-3.5 h-3.5" />
                        {proj.repo_url.replace("https://", "").slice(0, 40)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={isRunning ? "running" : (proj.status as any)} />
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-[#9CA3AF] flex items-center gap-1 font-mono">
                      <GitBranch className="w-3.5 h-3.5" /> {proj.branch}
                    </span>
                    <span className="text-[#9CA3AF] flex items-center gap-1">
                      <Code className="w-3.5 h-3.5" /> {proj.language} {proj.framework && `· ${proj.framework}`}
                    </span>
                  </div>

                  {/* Progress bars */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#6B7280] flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Coverage</span>
                        <span className="font-semibold text-[#F9FAFB]">{proj.coverage_percentage.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" style={{ width: `${proj.coverage_percentage}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between text-xs text-[#6B7280]">
                    <span>Tests: <strong className="text-[#F9FAFB]">{proj.total_test_cases}</strong></span>
                    <span>Bugs: <strong className="text-[#EF4444]">{proj.total_bugs_found}</strong></span>
                    <span>Patches: <strong className="text-[#10B981]">{proj.total_patches_applied}</strong></span>
                  </div>

                  {session && (
                    <div className="text-[10px] font-mono text-[#6B7280] bg-[rgba(255,255,255,0.03)] rounded-lg px-3 py-2">
                      {session.status === "running"
                        ? `⚡ Pipeline running… ${session.agents_run.length} agents done`
                        : session.status === "complete"
                        ? `✅ ${session.test_cases_generated} tests · ${session.bugs_found} bugs · ${session.patches_generated} patches`
                        : session.status}
                    </div>
                  )}

                  <div className="pt-1 flex gap-2">
                    <Button
                      variant="secondary"
                      className="w-full text-xs py-1 h-8"
                      onClick={() => window.location.href = `/dashboard`}
                    >
                      <BarChart2 className="w-3.5 h-3.5 mr-1" /> Dashboard
                    </Button>
                    <Button
                      className="w-full text-xs py-1 h-8 gap-1"
                      disabled={isRunning}
                      onClick={() => handleRunPipeline(proj.id)}
                    >
                      {isRunning
                        ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Running</>
                        : <><Zap className="w-3.5 h-3.5" /> Run Agents</>}
                    </Button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Import Modal */}
      <AnimatePresence>
        {isImportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-card max-w-lg w-full p-6 space-y-4 border border-[rgba(255,255,255,0.1)]"
            >
              {/* Success state */}
              {importResult ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle className="w-5 h-5" />
                    <h2 className="text-lg font-bold">Import Successful!</h2>
                  </div>
                  <div className="bg-[rgba(16,185,129,0.05)] border border-emerald-700/30 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between text-xs text-[#9CA3AF]">
                      <span>Project</span><strong className="text-white">{importResult.name}</strong>
                    </div>
                    <div className="flex justify-between text-xs text-[#9CA3AF]">
                      <span>Language</span><strong className="text-white">{importResult.language} {importResult.framework && `· ${importResult.framework}`}</strong>
                    </div>
                    <div className="flex justify-between text-xs text-[#9CA3AF]">
                      <span>Files scanned</span><strong className="text-white">{importResult.total_files}</strong>
                    </div>
                    <div className="flex justify-between text-xs text-[#9CA3AF]">
                      <span>Functions found</span><strong className="text-white">{importResult.total_functions}</strong>
                    </div>
                    <div className="flex justify-between text-xs text-[#9CA3AF]">
                      <span>API endpoints</span><strong className="text-white">{importResult.api_endpoints.length}</strong>
                    </div>
                    {importResult.session_id && (
                      <div className="pt-1 text-[10px] font-mono text-blue-400 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Agent pipeline started — session {importResult.session_id.slice(0, 8)}
                      </div>
                    )}
                  </div>
                  <Button className="w-full" onClick={closeModal}>Close</Button>
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-lg font-bold text-[#F9FAFB]">Import from GitHub</h2>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      Clone a public GitHub repository and run the AI agent pipeline.
                    </p>
                  </div>

                  {importError && (
                    <div className="flex items-start gap-2 bg-red-900/20 border border-red-700/30 text-red-400 text-xs px-3 py-2 rounded-xl">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      {importError}
                    </div>
                  )}

                  <form onSubmit={handleImport} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#9CA3AF]">GitHub Repository URL *</label>
                      <input
                        type="text"
                        required
                        value={repoUrl}
                        onChange={e => setRepoUrl(e.target.value)}
                        placeholder="https://github.com/username/repository"
                        className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3B82F6] font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#9CA3AF]">Project Name (optional)</label>
                        <input
                          type="text"
                          value={projName}
                          onChange={e => setProjName(e.target.value)}
                          placeholder="auto-detected"
                          className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#9CA3AF]">Branch</label>
                        <input
                          type="text"
                          value={branch}
                          onChange={e => setBranch(e.target.value)}
                          placeholder="main"
                          className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#9CA3AF]">Description (optional)</label>
                      <input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Brief description of the project"
                        className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                      />
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <div
                        onClick={() => setAutoRun(p => !p)}
                        className={`w-10 h-5 rounded-full transition-colors ${autoRun ? "bg-[#3B82F6]" : "bg-[rgba(255,255,255,0.12)]"}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white m-0.5 transition-transform ${autoRun ? "translate-x-5" : "translate-x-0"}`} />
                      </div>
                      <span className="text-xs text-[#9CA3AF]">
                        Auto-run AI agent pipeline after import
                        <span className="ml-1 text-[#6B7280]">(HuggingFace / Groq)</span>
                      </span>
                    </label>

                    <div className="pt-2 flex justify-end gap-3">
                      <Button type="button" variant="secondary" onClick={closeModal} disabled={isImporting}>
                        Cancel
                      </Button>
                      <Button type="submit" className="gap-2" disabled={isImporting}>
                        {isImporting ? (
                          <><RefreshCw className="w-4 h-4 animate-spin" /> Cloning &amp; Scanning…</>
                        ) : (
                          <><Play className="w-4 h-4" /> Import Repository</>
                        )}
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
