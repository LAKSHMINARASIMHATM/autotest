"use client";

import React, { useState } from "react";
import {
  IconCheckCircle,
  IconXCircle,
  IconFileDiff,
  IconWrench,
  IconRefreshCw,
  IconGitCommit,
  IconCopy,
  IconCheck,
} from "@/components/icons";
import { Button } from "@/components/ui/button";

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
  const [copied, setCopied] = useState(false);
  const hasDiff    = Boolean(patchDiff && patchDiff.trim().length > 0);
  const diffLines  = hasDiff ? patchDiff!.split("\n") : [];
  const isAccepted = status === "accepted";
  const isRejected = status === "rejected";

  const handleCopy = () => {
    if (patchDiff) {
      navigator.clipboard.writeText(patchDiff);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="w-full rounded-2xl p-6 border shadow-lg"
      style={{
        backgroundColor: "rgba(250, 248, 244, 0.95)",
        borderColor: "var(--color-border)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Header */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner border"
            style={{
              backgroundColor: "rgba(107,79,47,0.08)",
              borderColor: "rgba(107,79,47,0.2)",
            }}
          >
            <IconFileDiff size={20} style={{ color: "var(--color-brown-primary)" }} />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              Unified Patch Diff Inspector
            </h3>
            <p className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Automated Program Repair (APR) Multi-Strategy Diff
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {commitSha && (
            <span
              className="flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-lg border font-semibold shadow-sm"
              style={{
                color: "var(--color-success)",
                backgroundColor: "rgba(46,107,62,0.08)",
                borderColor: "rgba(46,107,62,0.25)",
              }}
            >
              <IconGitCommit size={14} />
              {commitSha}
            </span>
          )}
          {confidenceScore !== undefined && (
            <span
              className="text-xs font-mono px-3 py-1 rounded-lg border font-semibold shadow-sm"
              style={{
                color: "var(--color-brown-primary)",
                backgroundColor: "rgba(107,79,47,0.08)",
                borderColor: "rgba(107,79,47,0.2)",
              }}
            >
              Confidence: {(confidenceScore * 100).toFixed(0)}%
            </span>
          )}
          {hasDiff && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              aria-label="Copy patch diff to clipboard"
              className="gap-1.5 text-xs border"
              style={{ borderColor: "var(--color-border)" }}
            >
              {copied
                ? <IconCheck size={14} style={{ color: "var(--color-success)" }} />
                : <IconCopy  size={14} style={{ color: "var(--color-text-muted)" }} />
              }
              {copied ? "Copied" : "Copy Diff"}
            </Button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {!hasDiff ? (
        <div
          className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-2xl"
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-surface)",
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-inner border"
            style={{
              backgroundColor: "rgba(107,79,47,0.08)",
              borderColor: "rgba(107,79,47,0.15)",
            }}
          >
            <IconWrench size={24} style={{ color: "var(--color-brown-primary)" }} />
          </div>
          <h4 className="text-sm font-bold mb-1" style={{ color: "var(--color-text-primary)" }}>
            No Candidate Patch Selected
          </h4>
          <p className="text-xs max-w-md leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            Select a candidate patch from the repair laboratory list to inspect synthesized unified diffs and execute automated git commits.
          </p>
        </div>
      ) : (
        <>
          {/* RCA Explanation Banner */}
          {explanation && (
            <div
              className="mb-5 p-4 rounded-xl text-xs leading-relaxed shadow-sm border"
              style={{
                color: "#1A4D6B",
                backgroundColor: "rgba(26,82,123,0.06)",
                borderColor: "rgba(26,82,123,0.18)",
              }}
            >
              <span
                className="font-bold uppercase tracking-wider text-[11px] block mb-1"
                style={{ color: "var(--color-info)" }}
              >
                Root Cause Explanation
              </span>
              {explanation}
            </div>
          )}

          {/* Status Banners */}
          {isAccepted && (
            <div
              className="mb-5 p-4 rounded-xl text-xs flex items-center gap-3 shadow-sm border"
              style={{
                color: "var(--color-success)",
                backgroundColor: "rgba(46,107,62,0.07)",
                borderColor: "rgba(46,107,62,0.25)",
              }}
            >
              <IconCheckCircle size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong className="font-bold" style={{ color: "#1E4D2B" }}>Approved & Auto-Committed:</strong>
                <p className="text-[11px] mt-0.5 opacity-80">
                  Patch applied to project source code and committed to target Git repository{commitSha ? ` (SHA: ${commitSha})` : ""}.
                </p>
              </div>
            </div>
          )}

          {isRejected && (
            <div
              className="mb-5 p-4 rounded-xl text-xs flex items-center gap-3 shadow-sm border"
              style={{
                color: "var(--color-danger)",
                backgroundColor: "rgba(139,26,26,0.07)",
                borderColor: "rgba(139,26,26,0.25)",
              }}
            >
              <IconXCircle size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong className="font-bold" style={{ color: "#5C1111" }}>Patch Candidate Rejected:</strong>
                <p className="text-[11px] mt-0.5 opacity-80">
                  Candidate was rejected during human-in-the-loop review.
                </p>
              </div>
            </div>
          )}

          {/* Unified Diff Display */}
          <div
            className="font-mono text-xs rounded-xl overflow-hidden border shadow-inner mb-5"
            style={{
              backgroundColor: "#FEFDF9",
              borderColor: "var(--color-border)",
            }}
          >
            <div
              className="px-4 py-2 border-b text-[11px] font-sans font-semibold flex items-center justify-between"
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-muted)",
              }}
            >
              <span>Code Changes</span>
              <span>Diff View</span>
            </div>
            <div className="p-2 overflow-x-auto max-h-[420px] overflow-y-auto leading-relaxed">
              {diffLines.map((line, idx) => {
                let lineStyle: React.CSSProperties = { color: "#7D6352" };
                if (line.startsWith("+") && !line.startsWith("+++")) {
                  lineStyle = {
                    backgroundColor: "rgba(46,107,62,0.1)",
                    color: "#1E4D2B",
                    fontWeight: 500,
                    borderLeft: "2px solid #2E6B3E",
                    paddingLeft: "8px",
                  };
                } else if (line.startsWith("-") && !line.startsWith("---")) {
                  lineStyle = {
                    backgroundColor: "rgba(139,26,26,0.08)",
                    color: "#5C1111",
                    fontWeight: 500,
                    borderLeft: "2px solid #8B1A1A",
                    paddingLeft: "8px",
                  };
                } else if (line.startsWith("@@")) {
                  lineStyle = {
                    backgroundColor: "rgba(107,79,47,0.08)",
                    color: "var(--color-brown-primary)",
                    fontWeight: 700,
                    borderLeft: "2px solid var(--color-brown-primary)",
                    paddingLeft: "8px",
                    paddingTop: "2px",
                    paddingBottom: "2px",
                    marginTop: "4px",
                    marginBottom: "4px",
                  };
                } else if (line.startsWith("---") || line.startsWith("+++")) {
                  lineStyle = { color: "var(--color-text-muted)", fontWeight: 700, opacity: 0.75 };
                }

                return (
                  <div
                    key={idx}
                    className="px-3 py-1 rounded-sm whitespace-pre"
                    style={lineStyle}
                  >
                    {line}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          {(onApprove || onReject) && !isAccepted && !isRejected && (
            <div className="flex items-center justify-end gap-3 pt-2">
              {onReject && (
                <Button
                  variant="danger"
                  size="md"
                  onClick={onReject}
                  disabled={isSubmitting}
                  className="gap-2 text-xs"
                >
                  <IconXCircle size={16} />
                  Reject Candidate
                </Button>
              )}
              {onApprove && (
                <Button
                  variant="success"
                  size="md"
                  onClick={onApprove}
                  disabled={isSubmitting}
                  className="gap-2 text-xs"
                >
                  {isSubmitting ? (
                    <>
                      <IconRefreshCw size={16} />
                      Applying & Committing...
                    </>
                  ) : (
                    <>
                      <IconCheckCircle size={16} />
                      Approve & Auto-Commit Patch
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
