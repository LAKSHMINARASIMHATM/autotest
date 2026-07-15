"use client";

import { cn } from "@/lib/utils";
import type { AgentStatus } from "@/types";

interface StatusBadgeProps {
  status: AgentStatus | "passed" | "failed" | "pending" | "detected" | "localized" | "fixed" | "candidate" | "accepted" | "rejected";
  className?: string;
}

const statusConfig: Record<string, { label: string; dotClass: string; textClass: string; bgClass: string }> = {
  idle: { label: "Idle", dotClass: "bg-[#6B7280]", textClass: "text-[#9CA3AF]", bgClass: "bg-[#6B7280]/10" },
  thinking: { label: "Thinking", dotClass: "bg-[#F59E0B]", textClass: "text-[#F59E0B]", bgClass: "bg-[#F59E0B]/10" },
  running: { label: "Running", dotClass: "bg-[#3B82F6]", textClass: "text-[#3B82F6]", bgClass: "bg-[#3B82F6]/10" },
  success: { label: "Success", dotClass: "bg-[#10B981]", textClass: "text-[#10B981]", bgClass: "bg-[#10B981]/10" },
  passed: { label: "Passed", dotClass: "bg-[#10B981]", textClass: "text-[#10B981]", bgClass: "bg-[#10B981]/10" },
  error: { label: "Error", dotClass: "bg-[#EF4444]", textClass: "text-[#EF4444]", bgClass: "bg-[#EF4444]/10" },
  failed: { label: "Failed", dotClass: "bg-[#EF4444]", textClass: "text-[#EF4444]", bgClass: "bg-[#EF4444]/10" },
  waiting: { label: "Waiting", dotClass: "bg-[#8B5CF6]", textClass: "text-[#8B5CF6]", bgClass: "bg-[#8B5CF6]/10" },
  pending: { label: "Pending", dotClass: "bg-[#6B7280]", textClass: "text-[#9CA3AF]", bgClass: "bg-[#6B7280]/10" },
  detected: { label: "Detected", dotClass: "bg-[#EF4444]", textClass: "text-[#EF4444]", bgClass: "bg-[#EF4444]/10" },
  localized: { label: "Localized", dotClass: "bg-[#F59E0B]", textClass: "text-[#F59E0B]", bgClass: "bg-[#F59E0B]/10" },
  fixed: { label: "Fixed", dotClass: "bg-[#10B981]", textClass: "text-[#10B981]", bgClass: "bg-[#10B981]/10" },
  candidate: { label: "Candidate", dotClass: "bg-[#06B6D4]", textClass: "text-[#06B6D4]", bgClass: "bg-[#06B6D4]/10" },
  accepted: { label: "Accepted", dotClass: "bg-[#10B981]", textClass: "text-[#10B981]", bgClass: "bg-[#10B981]/10" },
  rejected: { label: "Rejected", dotClass: "bg-[#EF4444]", textClass: "text-[#EF4444]", bgClass: "bg-[#EF4444]/10" },
};

/**
 * Animated status badge with pulsing dot and color-coded text.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.idle;
  const isAnimated = ["running", "thinking"].includes(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        config.bgClass,
        config.textClass,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dotClass, isAnimated && "animate-pulse")} />
      {config.label}
    </span>
  );
}
