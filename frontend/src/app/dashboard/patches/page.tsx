"use client";

import { useEffect, useState } from "react";
import {
  IconWrench,
  IconCheckCircle,
  IconXCircle,
  IconRefreshCw,
  IconShieldCheck,
  IconCheck,
  IconSparkles,
  IconAlertTriangle,
  IconFilter,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getProjectPatches, listProjects, approvePatch, rejectPatch, type PatchItem, type ProjectItem } from "@/lib/api";
import { PatchDiffViewer } from "@/components/PatchDiffViewer";

export default function PatchesPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [patches, setPatches] = useState<PatchItem[]>([]);
  const [selectedPatch, setSelectedPatch] = useState<PatchItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [commitShas, setCommitShas] = useState<Record<string, string>>({});

  useEffect(() => {
    listProjects(1, 100).then((res) => {
      setProjects(res.items);
    }).catch(console.error);
  }, []);

  const fetchData = async (pid: string = selectedProjectId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProjectPatches(pid);
      setPatches(data);
      if (data.length > 0) {
        setSelectedPatch(data[0]);
      } else {
        setSelectedPatch(null);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load candidate patches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(selectedProjectId); }, [selectedProjectId]);

  const handleApprove = async (id: string) => {
    setSubmittingId(id);
    setError(null);
    setSuccessNotice(null);
    try {
      const res = await approvePatch(id);
      if (res.commit_sha) {
        setCommitShas((prev) => ({ ...prev, [id]: res.commit_sha! }));
      }
      setPatches((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            const updated = { ...p, status: "accepted" };
            if (selectedPatch?.id === id) setSelectedPatch(updated);
            return updated;
          }
          return p;
        })
      );
      setSuccessNotice(`Patch approved and automatically committed to repository! ${res.commit_sha ? `(Git Commit: ${res.commit_sha})` : ""}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to approve and commit patch.");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setSubmittingId(id);
    setError(null);
    setSuccessNotice(null);
    try {
      await rejectPatch(id);
      setPatches((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            const updated = { ...p, status: "rejected" };
            if (selectedPatch?.id === id) setSelectedPatch(updated);
            return updated;
          }
          return p;
        })
      );
      setSuccessNotice("Patch candidate marked as rejected.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to reject patch.");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto min-h-screen pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-[rgba(107,79,47,0.08)] border border-[rgba(107,79,47,0.2)] text-[var(--color-brown-primary)]">
              <IconWrench size={20} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              <span className="gradient-text">Patch Repair</span> Laboratory
            </h1>
          </div>
          <p className="text-sm leading-relaxed max-w-2xl" style={{ color: "var(--color-text-muted)" }}>
            Inspect multi-strategy AI code fixes, review validation telemetry, and approve automatic Git commits directly to target repositories.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-2 shadow-sm">
            <IconFilter size={14} className="text-[var(--color-brown-primary)]" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent text-xs font-semibold outline-none cursor-pointer pr-2"
              style={{ color: "var(--color-text-primary)" }}
            >
              <option value="all" className="bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]">
                All Repositories ({projects.length})
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]">
                  {p.name} ({p.language})
                </option>
              ))}
            </select>
          </div>
          <Button onClick={() => fetchData(selectedProjectId)} disabled={loading} variant="secondary" className="gap-2 text-xs self-start sm:self-auto">
            <IconRefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Patches
          </Button>
        </div>
      </div>

      {/* Error / Success Notifications */}
      {error && (
        <div className="bg-[rgba(139,26,26,0.1)] border border-[rgba(139,26,26,0.3)] text-[var(--color-danger)] text-sm px-4 py-3.5 rounded-2xl flex items-center gap-3 shadow-lg">
          <IconXCircle size={20} className="shrink-0 text-[var(--color-danger)]" />
          <span>{error}</span>
        </div>
      )}

      {successNotice && (
        <div className="bg-[rgba(46,107,62,0.1)] border border-[rgba(46,107,62,0.3)] text-[var(--color-success)] text-sm px-4 py-3.5 rounded-2xl flex items-center gap-3 shadow-lg">
          <IconCheck size={20} className="shrink-0 text-[var(--color-success)]" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Patch List & Validation Summary */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: "var(--color-text-muted)" }}>
                <IconSparkles size={14} className="text-[var(--color-brown-primary)]" /> Generated Candidates
              </h3>
              <span className="text-xs font-semibold bg-[rgba(107,79,47,0.1)] px-2 py-0.5 rounded-md" style={{ color: "var(--color-text-primary)" }}>
                {patches.length} Total
              </span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-[rgba(107,79,47,0.06)] animate-pulse" />
                ))}
              </div>
            ) : patches.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]">
                <IconAlertTriangle size={24} className="mx-auto mb-2 text-[var(--color-warning)]" />
                <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>No Patches Generated Yet</p>
                <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                  Trigger the AI agent pipeline or run bug localization to generate candidates.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {patches.map((patch) => (
                  <button
                    key={patch.id}
                    onClick={() => setSelectedPatch(patch)}
                    className={`w-full text-left flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedPatch?.id === patch.id
                        ? "bg-[rgba(107,79,47,0.12)] border-[rgba(107,79,47,0.3)] shadow-md"
                        : "bg-transparent border-transparent hover:bg-[rgba(107,79,47,0.04)]"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-[rgba(107,79,47,0.1)] flex items-center justify-center text-[var(--color-brown-primary)] shrink-0 border border-[rgba(107,79,47,0.2)]">
                      <IconWrench size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold capitalize truncate" style={{ color: "var(--color-text-primary)" }}>{patch.strategy} Strategy</p>
                        <StatusBadge status={patch.status as any} />
                      </div>
                      <p className="text-[11px] font-mono truncate" style={{ color: "var(--color-text-muted)" }}>{patch.file}</p>
                      <p className="text-[10px] mt-1 font-semibold" style={{ color: "var(--color-text-muted)" }}>Confidence: {(patch.confidence * 100).toFixed(0)}%</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Validation Checklist */}
          {selectedPatch && (
            <GlassCard glow="brown" className="p-6 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] pb-3">
                <IconShieldCheck size={16} className="text-[var(--color-success)]" />
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-primary)" }}>Validation Criteria</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  <IconCheckCircle size={16} className="text-[var(--color-success)] shrink-0" /> Isolated Sandbox Compilation
                </div>
                <div className="flex items-center gap-2.5 text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  <IconCheckCircle size={16} className="text-[var(--color-success)] shrink-0" /> Target PyTest Assertions Satisfied
                </div>
                <div className="flex items-center gap-2.5 text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  {selectedPatch.status === "accepted" ? (
                    <IconCheckCircle size={16} className="text-[var(--color-success)] shrink-0" />
                  ) : (
                    <IconXCircle size={16} className="text-[var(--color-warning)] shrink-0" />
                  )}
                  {selectedPatch.status === "accepted" ? "Zero Regression Sweeps Passed" : "Regression Sweep Pending Approval"}
                </div>
                <div className="flex items-center gap-2.5 text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  <IconCheckCircle size={16} className="text-[var(--color-success)] shrink-0" />
                  Calculated Heuristic Score: {(selectedPatch.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Right Column: Unified Diff Viewer */}
        <div className="lg:col-span-2">
          {selectedPatch ? (
            <PatchDiffViewer
              patchDiff={selectedPatch.diff}
              explanation={`Applied ${selectedPatch.strategy} repair strategy on file ${selectedPatch.file}`}
              confidenceScore={selectedPatch.confidence}
              status={selectedPatch.status}
              commitSha={commitShas[selectedPatch.id]}
              isSubmitting={submittingId === selectedPatch.id}
              onApprove={() => handleApprove(selectedPatch.id)}
              onReject={() => handleReject(selectedPatch.id)}
            />
          ) : (
            <GlassCard className="p-12 text-center border-dashed" style={{ color: "var(--color-text-muted)" }}>
              <IconWrench size={32} className="text-[var(--color-brown-primary)] mx-auto mb-3 opacity-60" />
              <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Select a patch candidate from the list</p>
              <p className="text-xs mt-1">Review unified diffs, structural explanations, and perform auto-commits.</p>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
