"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconFolderGit, IconPlus, IconGitBranch, IconGlobe, IconCode, IconCheckCircle,
  IconRefreshCw, IconBarChart2, IconShield, IconPlay, IconZap, IconAlertCircle,
  IconUpload, IconFileArchive, IconLink
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  listProjects, importFromGitHub, importFromZip, triggerAgentPipeline, getPipelineStatus,
  type ProjectItem, type GitHubImportResponse, type PipelineStatusResponse,
} from "@/lib/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importResult, setImportResult] = useState<GitHubImportResponse | null>(null);

  // Form state
  const [activeTab, setActiveTab] = useState<"link" | "file">("link");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
    } fontally: {
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
    setIsImporting(true);
    setImportError(null);

    try {
      let result: GitHubImportResponse;
      if (activeTab === "link") {
        if (!repoUrl) {
          throw new Error("Repository/ZIP link URL is required");
        }
        result = await importFromGitHub({
          repo_url: repoUrl,
          name: projName || undefined,
          branch,
          description: description || undefined,
          auto_run_agents: autoRun,
        });
      } else {
        if (!selectedFile) {
          throw new Error("Please select a project ZIP file to upload");
        }
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("name", projName);
        formData.append("repo_url", repoUrl);
        formData.append("description", description);
        formData.append("auto_run_agents", autoRun.toString());

        result = await importFromZip(formData);
      }

      setImportResult(result);
      if (result.session_id) {
        setSessions(prev => ({
          ...prev,
          [result.session_id!]: {
            session_id: result.session_id!,
            project_id: result.name || "",
            status: "running",
            agents_run: [],
            test_cases_generated: 0,
            bugs_found: 0,
            patches_generated: 0,
          }
        }));
      }
      fetchProjects();
    } catch (e: unknown) {
      setImportError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const closeModal = () => {
    setIsImportOpen(false);
    setImportResult(null);
    setImportError(null);
    setRepoUrl("");
    setProjName("");
    setSelectedFile(null);
    setDescription("");
  };

  const handleRunPipeline = async (projectId: string) => {
    try {
      const resp = await triggerAgentPipeline(projectId);
      setSessions(prev => ({
        ...prev,
        [resp.session_id]: {
          session_id: resp.session_id,
          project_id: projectId,
          status: "running",
          agents_run: [],
          test_cases_generated: 0,
          bugs_found: 0,
          patches_generated: 0,
        }
      }));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to run pipeline");
    }
  };

  const getSessionForProject = (pid: string) => {
    return Object.values(sessions).reverse().find(s => s.session_id.startsWith(pid) || s.status === "running");
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            <span className="gradient-text">Project</span> Portfolio
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Import repositories, inspect test coverage, and execute AI agent testing pipelines.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchProjects} variant="secondary" className="gap-2 text-xs">
            <IconRefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
          <Button onClick={() => setIsImportOpen(true)} className="gap-2 text-xs shadow-lg">
            <IconPlus size={16} /> Import Project
          </Button>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-60 rounded-2xl bg-[rgba(107,79,47,0.06)] animate-pulse" />)}
        </div>
      ) : projects.length === 0 ? (
        <GlassCard className="p-16 flex flex-col items-center justify-center gap-4 text-center">
          <IconFolderGit size={40} className="text-[var(--color-brown-primary)]" />
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No projects yet. Import a GitHub repository to get started.</p>
          <Button onClick={() => setIsImportOpen(true)} className="gap-2">
            <IconPlus size={16} /> Import from GitHub
          </Button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => {
            const session = getSessionForProject(proj.id);
            const isRunning = session?.status === "running";
            return (
              <GlassCard key={proj.id} className="p-6 relative overflow-hidden" glow={isRunning ? "brown" : "none"}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(107,79,47,0.1)] border border-[rgba(107,79,47,0.2)] flex items-center justify-center">
                      <IconFolderGit size={20} className="text-[var(--color-brown-primary)]" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>{proj.name}</h3>
                      <p className="text-xs flex items-center gap-1 mt-0.5 font-mono" style={{ color: "var(--color-text-muted)" }}>
                        <IconGlobe size={14} />
                        {proj.repo_url.replace("https://", "").slice(0, 40)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={isRunning ? "running" : (proj.status as any)} />
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1 font-mono" style={{ color: "var(--color-text-secondary)" }}>
                      <IconGitBranch size= {14} /> {proj.branch}
                    </span>
                    <span className="flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
                      <IconCode size={14} /> {proj.language} {proj.framework && `· ${proj.framework}`}
                    </span>
                  </div>

                  {/* Progress bars */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}><IconShield size={14} /> Coverage</span>
                        <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{proj.coverage_percentage.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[rgba(107,79,47,0.1)] overflow-hidden">
                        <div className="h-full bg-[var(--color-brown-primary)] rounded-full" style={{ width: `${proj.coverage_percentage}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-xs" style={{ color: "var(--color-text-muted)" }}>
                    <span>Tests: <strong style={{ color: "var(--color-text-primary)" }}>{proj.total_test_cases}</strong></span>
                    <span>Bugs: <strong className="text-[var(--color-danger)]">{proj.total_bugs_found}</strong></span>
                    <span>Patches: <strong className="text-[var(--color-success)]">{proj.total_patches_applied}</strong></span>
                  </div>

                  {session && (
                    <div className="text-[10px] font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2" style={{ color: "var(--color-text-secondary)" }}>
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
                      <IconBarChart2 size={14} className="mr-1" /> Dashboard
                    </Button>
                    <Button
                      className="w-full text-xs py-1 h-8 gap-1"
                      disabled={isRunning}
                      onClick={() => handleRunPipeline(proj.id)}
                    >
                      {isRunning
                        ? <><IconRefreshCw size={14} className="animate-spin" /> Running</>
                        : <><IconZap size={14} /> Run Agents</>}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-card max-w-lg w-full p-6 space-y-4 border border-[var(--color-border)] shadow-2xl"
            >
              {/* Success state */}
              {importResult ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[var(--color-success)]">
                    <IconCheckCircle size={20} />
                    <h2 className="text-lg font-bold">Import Successful!</h2>
                  </div>
                  <div className="bg-[rgba(46,107,62,0.06)] border border-[rgba(46,107,62,0.2)] rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between text-xs" style={{ color: "var(--color-text-muted)" }}>
                      <span>Project</span><strong style={{ color: "var(--color-text-primary)" }}>{importResult.name}</strong>
                    </div>
                    <div className="flex justify-between text-xs" style={{ color: "var(--color-text-muted)" }}>
                      <span>Language</span><strong style={{ color: "var(--color-text-primary)" }}>{importResult.language} {importResult.framework && `· ${importResult.framework}`}</strong>
                    </div>
                    <div className="flex justify-between text-xs" style={{ color: "var(--color-text-muted)" }}>
                      <span>Files scanned</span><strong style={{ color: "var(--color-text-primary)" }}>{importResult.total_files}</strong>
                    </div>
                    <div className="flex justify-between text-xs" style={{ color: "var(--color-text-muted)" }}>
                      <span>Functions found</span><strong style={{ color: "var(--color-text-primary)" }}>{importResult.total_functions}</strong>
                    </div>
                    <div className="flex justify-between text-xs" style={{ color: "var(--color-text-muted)" }}>
                      <span>API endpoints</span><strong style={{ color: "var(--color-text-primary)" }}>{importResult.api_endpoints.length}</strong>
                    </div>
                    {importResult.session_id && (
                      <div className="pt-1 text-[10px] font-mono text-[var(--color-brown-primary)] flex items-center gap-1">
                        <IconRefreshCw size={12} className="animate-spin" />
                        Agent pipeline started — session {importResult.session_id.slice(0, 8)}
                      </div>
                    )}
                  </div>
                  <Button className="w-full" onClick={closeModal}>Close</Button>
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>Import Project</h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      Import a project by repository link, ZIP download link, or direct ZIP file upload.
                    </p>
                  </div>

                  {importError && (
                    <div className="flex items-start gap-2 bg-[rgba(139,26,26,0.1)] border border-[rgba(139,26,26,0.3)] text-[var(--color-danger)] text-xs px-3 py-2 rounded-xl">
                      <IconAlertCircle size={16} className="shrink-0 mt-0.5" />
                      {importError}
                    </div>
                  )}

                  <div className="flex bg-[var(--color-bg-secondary)] p-1 rounded-xl border border-[var(--color-border)]">
                    <button
                      type="button"
                      onClick={() => setActiveTab("link")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === "link"
                          ? "bg-[rgba(107,79,47,0.15)] border border-[rgba(107,79,47,0.3)] text-[var(--color-brown-primary)]"
                          : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                        }`}
                    >
                      <IconLink size={14} />
                      Git / ZIP Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("file")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === "file"
                          ? "bg-[rgba(107,79,47,0.15)] border border-[rgba(107,79,47,0.3)] text-[var(--color-brown-primary)]"
                          : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                        }`}
                    >
                      <IconUpload size={14} />
                      ZIP File Upload
                    </button>
                  </div>

                  <form onSubmit={handleImport} className="space-y-4">
                    {activeTab === "link" ? (
                      <>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Repository or ZIP URL *</label>
                          <input
                            type="text"
                            required
                            value={repoUrl}
                            onChange={e => setRepoUrl(e.target.value)}
                            placeholder="https://github.com/username/repository or https://site.com/code.zip"
                            className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-brown-primary)] font-mono"
                            style={{ color: "var(--color-text-primary)" }}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Project Name (optional)</label>
                            <input
                              type="text"
                              value={projName}
                              onChange={e => setProjName(e.target.value)}
                              placeholder="auto-detected"
                              className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm focus:outline-none"
                              style={{ color: "var(--color-text-primary)" }}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Branch</label>
                            <input
                              type="text"
                              value={branch}
                              onChange={e => setBranch(e.target.value)}
                              placeholder="main"
                              className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm focus:outline-none"
                              style={{ color: "var(--color-text-primary)" }}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Project ZIP File *</label>
                          <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (e.dataTransfer.files?.[0]) {
                                setSelectedFile(e.dataTransfer.files[0]);
                                if (!projName) {
                                  setProjName(e.dataTransfer.files[0].name.replace(/\.zip$/, ""));
                                }
                              }
                            }}
                            className="border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-brown-primary)] transition-colors rounded-xl p-5 text-center cursor-pointer bg-[var(--color-surface)] flex flex-col items-center justify-center space-y-2"
                            onClick={() => document.getElementById("zip-file-input")?.click()}
                          >
                            <input
                              id="zip-file-input"
                              type="file"
                              accept=".zip"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  setSelectedFile(e.target.files[0]);
                                  if (!projName) {
                                    setProjName(e.target.files[0].name.replace(/\.zip$/, ""));
                                  }
                                }
                              }}
                            />
                            {selectedFile ? (
                              <>
                                <IconFileArchive size={32} className="text-[var(--color-brown-primary)] animate-pulse" />
                                <div className="text-xs font-semibold truncate max-w-[250px]" style={{ color: "var(--color-text-primary)" }}>
                                  {selectedFile.name}
                                </div>
                                <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                                </div>
                                <span className="text-[10px] text-[var(--color-brown-primary)] font-semibold underline mt-0.5">Change file</span>
                              </>
                            ) : (
                              <>
                                <IconUpload size={32} className="text-[var(--color-brown-primary)] opacity-60" />
                                <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                                  Drag &amp; drop project ZIP here, or <span className="text-[var(--color-brown-primary)] underline font-semibold">browse</span>
                                </div>
                                <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                                  Supports only .zip archives up to 50MB
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Project Name *</label>
                            <input
                              type="text"
                              required
                              value={projName}
                              onChange={e => setProjName(e.target.value)}
                              placeholder="Project Name"
                              className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm focus:outline-none"
                              style={{ color: "var(--color-text-primary)" }}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Project/Repo URL (optional)</label>
                            <input
                              type="text"
                              value={repoUrl}
                              onChange={e => setRepoUrl(e.target.value)}
                              placeholder="https://example.com"
                              className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-brown-primary)] font-mono"
                              style={{ color: "var(--color-text-primary)" }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Description (optional)</label>
                      <input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Brief description of the project"
                        className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm focus:outline-none"
                        style={{ color: "var(--color-text-primary)" }}
                      />
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <div
                        onClick={() => setAutoRun(p => !p)}
                        className={`w-10 h-5 rounded-full transition-colors ${autoRun ? "bg-[var(--color-brown-primary)]" : "bg-[rgba(107,79,47,0.2)]"}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white m-0.5 transition-transform ${autoRun ? "translate-x-5" : "translate-x-0"}`} />
                      </div>
                      <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        Auto-run AI agent pipeline after import
                        <span className="ml-1" style={{ color: "var(--color-text-muted)" }}>(HuggingFace / Groq)</span>
                      </span>
                    </label>

                    <div className="pt-2 flex justify-end gap-3">
                      <Button type="button" variant="secondary" onClick={closeModal} disabled={isImporting}>
                        Cancel
                      </Button>
                      <Button type="submit" className="gap-2" disabled={isImporting}>
                        {isImporting ? (
                          <><IconRefreshCw size={16} className="animate-spin" /> Processing &amp; Scanning…</>
                        ) : (
                          <><IconPlay size={16} /> Import Project</>
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
