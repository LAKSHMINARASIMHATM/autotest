"use client";

import React from "react";
import { CheckCircle2, XCircle, FileDiff, Wrench, RefreshCw, GitCommit } from "lucide-react";

export interface PatchDiffViewerProps {
  patchDiff?: string;
  explanation?: string;
  confidenceScore?: number;
  onApprove?: () => void;
  onReject?: () => void;
  isSubmitting?: boolean;
  commitSha?: string | null;
  status?: string;
}

export function PatchDiffViewer({
  patchDiff,
  explanation,
  confidenceScore,
  onApprove,
  onReject,
  isSubmitting = false,
  commitSha,
  status,
}: PatchDiffViewerProps) {
  const hasDiff = Boolean(patchDiff && patchDiff.trim().length > 0);
  const diffLines = hasDiff ? patchDiff!.split("\n") : [];
  const isAccepted = status === "accepted";
  const isRejected = status === "rejected";

  return (
    <div className="w-full bg-[#121318] border border-[#27272A] rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <FileDiff className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#F9FAFB]">Unified Patch Diff Viewer</h3>
            <p className="text-xs text-[#6B7280]">Automated Program Repair (APR) Patch Review</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {commitSha && (
            <span className="flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
              <GitCommit className="w-3.5 h-3.5" />
              {commitSha}
            </span>
          )}
          {confidenceScore !== undefined && (
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 font-semibold">
              Confidence C: {(confidenceScore * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      {!hasDiff ? (
        <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-[#27272A] rounded-xl bg-[#09090B]">
          <div className="w-10 h-10 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-center mb-3 text-[#6B7280]">
            <Wrench className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-semibold text-[#E4E4E7] mb-1">No Candidate Patch Selected</h4>
          <p className="text-[11px] text-[#6B7280] max-w-sm">
            Run automated program repair or select a patch item from the laboratory list to inspect unified code diffs.
          </p>
        </div>
      ) : (
        <>
          {/* Explanation Banner */}
          {explanation && (
            <div className="mb-4 p-3 rounded-lg bg-[#18181B] border border-[#27272A] text-xs text-[#D4D4D8]">
              <span className="font-semibold text-blue-400">RCA Explanation: </span>
              {explanation}
            </div>
          )}

          {/* Status Banner if committed */}
          {isAccepted && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Approved & Committed:</strong> Patch successfully applied and committed to repository {commitSha ? `(${commitSha})` : ""}.
              </span>
            </div>
          )}

          {isRejected && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Patch candidate has been rejected.</span>
            </div>
          )}

          {/* Real Code Diff Display */}
          <div className="font-mono text-xs border border-[#27272A] rounded-lg overflow-hidden bg-[#09090B] mb-4">
            {diffLines.map((line, idx) => {
              let lineBg = "bg-transparent text-[#A1A1AA]";
              if (line.startsWith("+") && !line.startsWith("+++")) {
                lineBg = "bg-emerald-950/40 text-emerald-300 font-semibold";
              } else if (line.startsWith("-") && !line.startsWith("---")) {
                lineBg = "bg-rose-950/40 text-rose-300 font-semibold";
              } else if (line.startsWith("@@")) {
                lineBg = "bg-blue-950/30 text-blue-400 font-bold";
              }

              return (
                <div key={idx} className={`px-4 py-1 border-b border-[#18181B] last:border-b-0 whitespace-pre ${lineBg}`}>
                  {line}
                </div>
              );
            })}
          </div>

          {/* Actions */}
          {(onApprove || onReject) && !isAccepted && !isRejected && (
            <div className="flex items-center justify-end gap-3 pt-2">
              {onReject && (
                <button
                  onClick={onReject}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold transition-all disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Reject Patch
                </button>
              )}

              {onApprove && (
                <button
                  onClick={onApprove}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Committing to Repo...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Approve & Commit Patch
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
