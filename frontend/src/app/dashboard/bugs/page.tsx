"use client";

import { useState } from "react";
import { AlertCircle, Bug, ChevronRight, FileSearch, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusBadge } from "@/components/ui/status-badge";

interface BugReport {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  file: string;
  method: string;
  line: number;
  confidence: number;
  status: "detected" | "localized" | "fixed";
  rootCause: string;
  codeSnippet: string;
  fixSuggestion: string;
}

const mockBugs: BugReport[] = [
  {
    id: "bug_101",
    severity: "critical",
    file: "app/core/security.py",
    method: "verify_password",
    line: 23,
    confidence: 0.94,
    status: "localized",
    rootCause: "Subtle timing attack vector due to standard string equality comparison (==) instead of constant-time compare hmac.compare_digest.",
    codeSnippet: `def verify_password(plain_password: str, hashed_password: str) -> bool:
    # BUG: Timing attack vulnerability
    return plain_password == hashed_password`,
    fixSuggestion: `import hmac

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hmac.compare_digest(plain_password.encode(), hashed_password.encode())`,
  },
  {
    id: "bug_102",
    severity: "high",
    file: "app/api/v1/auth.py",
    method: "verify_jwt_token",
    line: 58,
    confidence: 0.89,
    status: "detected",
    rootCause: "Uncaught ExpiredSignatureError exceptions return generic 500 status code instead of standard 401 Unauthorized client response.",
    codeSnippet: `except jwt.ExpiredSignatureError:
    # BUG: Raises unhandled 500 internal server error
    raise ValueError("Token is expired")`,
    fixSuggestion: `except jwt.ExpiredSignatureError:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token signature has expired"
    )`,
  },
];

export default function BugsPage() {
  const [selectedBug, setSelectedBug] = useState<BugReport>(mockBugs[0]);
  const [isRepairing, setIsRepairing] = useState(false);

  const repairBug = () => {
    setIsRepairing(true);
    setTimeout(() => {
      setIsRepairing(false);
      setSelectedBug((prev) => ({ ...prev, status: "fixed" }));
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Bug list */}
        <div className="lg:col-span-1 space-y-4">
          <GlassCard className="p-5">
            <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Detected Faults</h3>
            <div className="space-y-2.5">
              {mockBugs.map((bug) => (
                <button
                  key={bug.id}
                  onClick={() => setSelectedBug(bug)}
                  className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                    selectedBug.id === bug.id
                      ? "bg-[rgba(59,130,246,0.12)] border-[rgba(59,130,246,0.2)]"
                      : "bg-transparent border-transparent hover:bg-[rgba(255,255,255,0.03)]"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    bug.severity === "critical" ? "bg-[#EF4444]/15 text-[#EF4444]" : "bg-[#F59E0B]/15 text-[#F59E0B]"
                  }`}>
                    <AlertCircle className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-semibold text-white truncate">{bug.method}</p>
                      <StatusBadge status={bug.status} />
                    </div>
                    <p className="text-[10px] text-[#6B7280] font-mono truncate">{bug.file}:{bug.line}</p>
                  </div>
                </button>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Diagnosis & Suggestions */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-start justify-between border-b border-[rgba(255,255,255,0.05)] pb-4 mb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-red-900/40 text-red-400">
                    {selectedBug.severity} severity
                  </span>
                  <span className="text-xs text-[#6B7280] font-mono">Confidence: {(selectedBug.confidence * 100).toFixed(0)}%</span>
                </div>
                <h3 className="text-base font-semibold text-[#F9FAFB]">Fault in {selectedBug.method}()</h3>
                <p className="text-xs font-mono text-[#6B7280]">{selectedBug.file}:{selectedBug.line}</p>
              </div>
              <Button onClick={repairBug} disabled={isRepairing} className="gap-1.5 text-xs bg-[#8B5CF6] hover:bg-[#7C3AED]">
                <Sparkles className="w-3.5 h-3.5" /> {isRepairing ? "Repairing..." : "Auto-Repair Bug"}
              </Button>
            </div>

            {/* Root cause analysis description */}
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <FileSearch className="w-3.5 h-3.5 text-[#3B82F6]" /> Root Cause Analysis
                </span>
                <p className="text-xs text-[#9CA3AF] leading-relaxed bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-3.5">
                  {selectedBug.rootCause}
                </p>
              </div>

              {/* Buggy Snippet */}
              <div>
                <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-1.5">Target Code Segment</span>
                <pre className="text-[11px] font-mono bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 text-[#9CA3AF] overflow-x-auto">
                  {selectedBug.codeSnippet}
                </pre>
              </div>

              {/* Proposed Patch Suggestion */}
              <div>
                <span className="text-xs font-semibold text-[#10B981] uppercase tracking-wider block mb-1.5">AI Proposed Correction</span>
                <pre className="text-[11px] font-mono bg-[#10B981]/5 border border-[#10B981]/15 rounded-xl p-4 text-[#10B981] overflow-x-auto">
                  {selectedBug.fixSuggestion}
                </pre>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
