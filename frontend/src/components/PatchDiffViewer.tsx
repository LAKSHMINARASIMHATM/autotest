"use client";

import React from "react";
import { CheckCircle2, XCircle, FileDiff, Wrench } from "lucide-react";

export interface PatchDiffViewerProps {
  patchDiff?: string;
  explanation?: string;
  confidenceScore?: number;
  onApprove?: () => void;
  onReject?: () => void;
}

export function PatchDiffViewer({
  patchDiff,
  explanation,
  confidenceScore,
  onApprove,
  onReject,
}: PatchDiffViewerProps) {
  const hasDiff = Boolean(patchDiff && patchDiff.trim().length > 0);
  const diffLines = hasDiff ? patchDiff!.split("\n") : [];

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

        {confidenceScore !== undefined && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 font-semibold">
              Confidence C: {(confidenceScore * 100).toFixed(0)}%
            </span>
          </div>
        )}
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
          {(onApprove || onReject) && (
            <div className="flex items-center justify-end gap-3 pt-2">
              {onReject && (
                <button
                  onClick={onReject}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold transition-all"
                >
                  <XCircle className="w-4 h-4" />
                  Reject Patch
                </button>
              )}

              {onApprove && (
                <button
                  onClick={onApprove}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve & Commit Patch
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
