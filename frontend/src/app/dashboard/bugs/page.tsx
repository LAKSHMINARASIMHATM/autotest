"use client";

import { useEffect, useState } from "react";
import { IconAlertCircle, IconFileSearch, IconRefreshCw, IconSparkles } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getProjectBugs, listProjects, ProjectItem, generatePatches, scanBugs, type BugItem } from "@/lib/api";

export default function BugsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [bugs, setBugs] = useState<BugItem[]>([]);
  const [selectedBug, setSelectedBug] = useState<BugItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Load projects list
  useEffect(() => {
    listProjects(1, 100)
      .then((res) => {
        setProjects(res.items);
      })
      .catch((err) => {
        console.error("Failed to load projects", err);
        setError("Failed to load projects list.");
      });
  }, []);

  // Fetch bugs when selected project changes
  useEffect(() => {
    if (!selectedProjectId) return;
    async function fetchBugs() {
      setLoading(true);
      setError(null);
      try {
        const data = await getProjectBugs(selectedProjectId);
        setBugs(data);
        if (data.length > 0) {
          setSelectedBug(data[0]);
        } else {
          setSelectedBug(null);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load bugs");
      } finally {
        setLoading(false);
      }
    }
    fetchBugs();
  }, [selectedProjectId]);

  const handleHuggingFaceScan = async () => {
    if (!selectedProjectId) return;
    setScanning(true);
    setError(null);
    try {
      await scanBugs(selectedProjectId);
      setTimeout(async () => {
        try {
          const data = await getProjectBugs(selectedProjectId);
          setBugs(data);
          if (data.length > 0 && !selectedBug) setSelectedBug(data[0]);
        } catch { /* ignore */ }
        setScanning(false);
      }, 3500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to start HuggingFace scan");
      setScanning(false);
    }
  };

  const repairBug = async () => {
    if (!selectedBug) return;
    setRepairing(true);
    setError(null);
    try {
      const generated = await generatePatches({
        bug_id: selectedBug.id,
        file_path: selectedBug.file,
        method_name: selectedBug.method || "",
        buggy_code: selectedBug.codeSnippet || "",
        error_message: selectedBug.rootCause || "",
        root_cause: selectedBug.rootCause || "",
      });
      if (generated && generated.length > 0) {
        const updated = {
          ...selectedBug,
          status: "patch_generated",
          fixSuggestion: generated[0].diff,
        };
        setSelectedBug(updated);
        setBugs((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      } else {
        setError("Repair completed, but no patches could be generated for this bug.");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to trigger auto-repair");
    } finally {
      setRepairing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            <span className="gradient-text">Bug</span> Intelligence Tracker
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Review localized faults, call stack analyses, and root-cause explanations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Project Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Select Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={scanning}
              className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--color-brown-primary)] disabled:opacity-50"
              style={{ color: "var(--color-text-primary)" }}
            >
              <option value="all" className="bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]">
                All Repositories ({projects.length})
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-5">
            <Button
              onClick={handleHuggingFaceScan}
              disabled={scanning || !selectedProjectId}
              className="gap-2 text-[13px] font-semibold"
            >
              <IconRefreshCw size={16} className={scanning ? "animate-spin" : ""} />
              {scanning ? "Scanning Codebase…" : "Scan with HuggingFace"}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-[rgba(139,26,26,0.1)] border border-[rgba(139,26,26,0.3)] text-[var(--color-danger)] text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Bug list */}
        <div className="lg:col-span-1 space-y-4">
          <GlassCard className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>Detected Faults</h3>
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-[rgba(107,79,47,0.06)] animate-pulse" />)}
              </div>
            ) : bugs.length === 0 ? (
              <p className="text-xs py-4 text-center" style={{ color: "var(--color-text-muted)" }}>No bugs detected yet.</p>
            ) : (
              <div className="space-y-2.5">
                {bugs.map((bug) => (
                  <button
                    key={bug.id}
                    onClick={() => setSelectedBug(bug)}
                    className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                      selectedBug?.id === bug.id
                        ? "bg-[rgba(107,79,47,0.12)] border-[rgba(107,79,47,0.3)]"
                        : "bg-transparent border-transparent hover:bg-[rgba(107,79,47,0.04)]"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      bug.severity === "critical" ? "bg-[rgba(139,26,26,0.15)] text-[var(--color-danger)]"
                        : bug.severity === "high" ? "bg-[rgba(122,81,0,0.15)] text-[var(--color-warning)]"
                        : "bg-[rgba(107,79,47,0.15)] text-[var(--color-brown-primary)]"
                    }`}>
                      <IconAlertCircle size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>{bug.method || "unknown"}</p>
                        <StatusBadge status={bug.status as any} />
                      </div>
                      <p className="text-[10px] font-mono truncate" style={{ color: "var(--color-text-muted)" }}>{bug.file}:{bug.line}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right Column: Diagnosis & Suggestions */}
        <div className="lg:col-span-2 space-y-6">
          {selectedBug ? (
            <GlassCard className="p-6">
              <div className="flex items-start justify-between border-b border-[var(--color-border)] pb-4 mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-[rgba(139,26,26,0.15)] text-[var(--color-danger)]">
                      {selectedBug.severity} severity
                    </span>
                    <span className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>
                      Confidence: {(selectedBug.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    Fault in {selectedBug.method || "unknown"}()
                  </h3>
                  <p className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>{selectedBug.file}:{selectedBug.line}</p>
                </div>
                <Button
                  onClick={repairBug}
                  disabled={repairing || selectedBug.status === "patch_generated"}
                  className="gap-1.5 text-xs"
                >
                  <IconSparkles size={14} />
                  {repairing ? "Repairing…" : selectedBug.status === "patch_generated" ? "Patch Generated" : "Auto-Repair Bug"}
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1.5" style={{ color: "var(--color-brown-primary)" }}>
                    <IconFileSearch size={14} /> Root Cause Analysis
                  </span>
                  <p className="text-xs leading-relaxed bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3.5" style={{ color: "var(--color-text-secondary)" }}>
                    {selectedBug.rootCause || "Root cause analysis pending."}
                  </p>
                </div>

                {selectedBug.codeSnippet && (
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: "var(--color-text-muted)" }}>
                      Target Code Segment
                    </span>
                    <pre className="text-[11px] font-mono bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-4 overflow-x-auto" style={{ color: "var(--color-text-secondary)" }}>
                      {selectedBug.codeSnippet}
                    </pre>
                  </div>
                )}

                {selectedBug.fixSuggestion && (
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider block mb-1.5 text-[var(--color-success)]">
                      AI Proposed Correction
                    </span>
                    <pre className="text-[11px] font-mono bg-[rgba(46,107,62,0.06)] border border-[rgba(46,107,62,0.2)] rounded-xl p-4 text-[var(--color-success)] overflow-x-auto">
                      {selectedBug.fixSuggestion}
                    </pre>
                  </div>
                )}
              </div>
            </GlassCard>
          ) : !loading ? (
            <GlassCard className="p-12 flex items-center justify-center text-sm" style={{ color: "var(--color-text-muted)" }}>
              Select a bug to view its root cause analysis.
            </GlassCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
