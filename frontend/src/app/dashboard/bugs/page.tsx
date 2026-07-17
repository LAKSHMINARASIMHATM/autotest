"use client";

import { useEffect, useState } from "react";
import { AlertCircle, FileSearch, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getProjectBugs, getDefaultProjectId, type BugItem } from "@/lib/api";

export default function BugsPage() {
  const [bugs, setBugs] = useState<BugItem[]>([]);
  const [selectedBug, setSelectedBug] = useState<BugItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const pid = await getDefaultProjectId();
      if (!pid) throw new Error("No projects found.");
      const data = await getProjectBugs(pid);
      setBugs(data);
      if (data.length > 0) setSelectedBug(data[0]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load bugs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const repairBug = async () => {
    setRepairing(true);
    // Optimistic UI update
    setTimeout(() => {
      if (selectedBug) {
        const updated = { ...selectedBug, status: "patch_generated" };
        setSelectedBug(updated);
        setBugs((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      }
      setRepairing(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen pb-12">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">
          <span className="gradient-text">Bug</span> Intelligence Tracker
        </h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Review localized faults, call stack analyses, and root-cause explanations.
        </p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/30 text-red-400 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Bug list */}
        <div className="lg:col-span-1 space-y-4">
          <GlassCard className="p-5">
            <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Detected Faults</h3>
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />)}
              </div>
            ) : bugs.length === 0 ? (
              <p className="text-xs text-[#6B7280] py-4 text-center">No bugs detected yet.</p>
            ) : (
              <div className="space-y-2.5">
                {bugs.map((bug) => (
                  <button
                    key={bug.id}
                    onClick={() => setSelectedBug(bug)}
                    className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                      selectedBug?.id === bug.id
                        ? "bg-[rgba(59,130,246,0.12)] border-[rgba(59,130,246,0.2)]"
                        : "bg-transparent border-transparent hover:bg-[rgba(255,255,255,0.03)]"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      bug.severity === "critical" ? "bg-[#EF4444]/15 text-[#EF4444]"
                        : bug.severity === "high" ? "bg-[#F59E0B]/15 text-[#F59E0B]"
                        : "bg-[#3B82F6]/15 text-[#3B82F6]"
                    }`}>
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-semibold text-white truncate">{bug.method || "unknown"}</p>
                        <StatusBadge status={bug.status as any} />
                      </div>
                      <p className="text-[10px] text-[#6B7280] font-mono truncate">{bug.file}:{bug.line}</p>
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
              <div className="flex items-start justify-between border-b border-[rgba(255,255,255,0.05)] pb-4 mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-red-900/40 text-red-400">
                      {selectedBug.severity} severity
                    </span>
                    <span className="text-xs text-[#6B7280] font-mono">
                      Confidence: {(selectedBug.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[#F9FAFB]">
                    Fault in {selectedBug.method || "unknown"}()
                  </h3>
                  <p className="text-xs font-mono text-[#6B7280]">{selectedBug.file}:{selectedBug.line}</p>
                </div>
                <Button
                  onClick={repairBug}
                  disabled={repairing || selectedBug.status === "patch_generated"}
                  className="gap-1.5 text-xs bg-[#8B5CF6] hover:bg-[#7C3AED]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {repairing ? "Repairing…" : selectedBug.status === "patch_generated" ? "Patch Generated" : "Auto-Repair Bug"}
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <FileSearch className="w-3.5 h-3.5 text-[#3B82F6]" /> Root Cause Analysis
                  </span>
                  <p className="text-xs text-[#9CA3AF] leading-relaxed bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-3.5">
                    {selectedBug.rootCause || "Root cause analysis pending."}
                  </p>
                </div>

                {selectedBug.codeSnippet && (
                  <div>
                    <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">
                      Target Code Segment
                    </span>
                    <pre className="text-[11px] font-mono bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 text-[#9CA3AF] overflow-x-auto">
                      {selectedBug.codeSnippet}
                    </pre>
                  </div>
                )}

                {selectedBug.fixSuggestion && (
                  <div>
                    <span className="text-xs font-semibold text-[#10B981] uppercase tracking-wider block mb-1.5">
                      AI Proposed Correction
                    </span>
                    <pre className="text-[11px] font-mono bg-[#10B981]/5 border border-[#10B981]/15 rounded-xl p-4 text-[#10B981] overflow-x-auto">
                      {selectedBug.fixSuggestion}
                    </pre>
                  </div>
                )}
              </div>
            </GlassCard>
          ) : !loading ? (
            <GlassCard className="p-12 flex items-center justify-center text-[#6B7280] text-sm">
              Select a bug to view its root cause analysis.
            </GlassCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
