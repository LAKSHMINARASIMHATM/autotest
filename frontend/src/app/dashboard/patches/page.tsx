"use client";

import { useEffect, useState } from "react";
import { Wrench, CheckCircle2, XCircle, RefreshCw, ShieldCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getProjectPatches, getDefaultProjectId, approvePatch, rejectPatch, type PatchItem } from "@/lib/api";
import { PatchDiffViewer } from "@/components/PatchDiffViewer";

export default function PatchesPage() {
  const [patches, setPatches] = useState<PatchItem[]>([]);
  const [selectedPatch, setSelectedPatch] = useState<PatchItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [commitShas, setCommitShas] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const pid = await getDefaultProjectId();
      if (!pid) throw new Error("No projects found.");
      const data = await getProjectPatches(pid);
      setPatches(data);
      if (data.length > 0) setSelectedPatch(data[0]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load patches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

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
      setSuccessNotice(`Patch approved and automatically committed to repository! ${res.commit_sha ? `(Commit: ${res.commit_sha})` : ""}`);
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
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">
            <span className="gradient-text">Patch</span> Repair Laboratory
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Approve, audit, and auto-commit AI-generated code fixes directly to your repository.
          </p>
        </div>
        <Button onClick={fetchData} disabled={loading} variant="secondary" className="gap-2 text-xs">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/30 text-red-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successNotice && (
        <div className="bg-emerald-900/20 border border-emerald-700/30 text-emerald-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: list */}
        <div className="lg:col-span-1 space-y-4">
          <GlassCard className="p-5">
            <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Generated Patches</h3>
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />)}
              </div>
            ) : patches.length === 0 ? (
              <p className="text-xs text-[#6B7280] py-4 text-center">No patches generated yet.</p>
            ) : (
              <div className="space-y-2">
                {patches.map((patch) => (
                  <button
                    key={patch.id}
                    onClick={() => setSelectedPatch(patch)}
                    className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                      selectedPatch?.id === patch.id
                        ? "bg-[rgba(59,130,246,0.12)] border-[rgba(59,130,246,0.2)]"
                        : "bg-transparent border-transparent hover:bg-[rgba(255,255,255,0.03)]"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#6B7280] shrink-0">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-semibold text-white truncate capitalize">{patch.strategy}</p>
                        <StatusBadge status={patch.status as any} />
                      </div>
                      <p className="text-[10px] text-[#6B7280] font-mono truncate">{patch.file}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Validation Checklist */}
          {selectedPatch && (
            <GlassCard className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Validation Checks</h3>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" /> Compilation Succeeded
                </div>
                <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" /> Failing Test Now Passes
                </div>
                <div className={`flex items-center gap-2 text-xs ${selectedPatch.status === "accepted" ? "text-[#9CA3AF]" : "text-[#F59E0B]"}`}>
                  {selectedPatch.status === "accepted"
                    ? <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    : <XCircle className="w-4 h-4 text-[#F59E0B]" />}
                  {selectedPatch.status === "accepted" ? "Regression Tests Passed" : "Regression Tests Pending"}
                </div>
                <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  Confidence: {(selectedPatch.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Right Column: diff viewer */}
        <div className="lg:col-span-2">
          {selectedPatch ? (
            <PatchDiffViewer
              patchDiff={selectedPatch.diff}
              explanation={`Applied ${selectedPatch.strategy} repair strategy on ${selectedPatch.file}`}
              confidenceScore={selectedPatch.confidence}
              status={selectedPatch.status}
              commitSha={commitShas[selectedPatch.id]}
              isSubmitting={submittingId === selectedPatch.id}
              onApprove={() => handleApprove(selectedPatch.id)}
              onReject={() => handleReject(selectedPatch.id)}
            />
          ) : (
            <GlassCard className="p-8 text-center text-[#6B7280]">
              Select a patch from the list to review unified diff and RCA explanation.
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
