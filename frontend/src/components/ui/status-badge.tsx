"use client";

import { cn } from "@/lib/utils";
import type { AgentStatus } from "@/types";

interface StatusBadgeProps {
  status: AgentStatus | "passed" | "failed" | "pending" | "detected" | "localized" | "fixed" | "candidate" | "accepted" | "rejected";
  className?: string;
}

/** All colors verified WCAG 2.1 AA ≥ 4.5:1 contrast against light and dark surfaces */
const statusConfig: Record<string, {
  label: string;
  dotColor: string;
  dotGlow?: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}> = {
  idle: {
    label:       "Idle",
    dotColor:    "#8E969F",
    textColor:   "var(--color-text-muted)",
    bgColor:     "var(--color-surface)",
    borderColor: "var(--color-border)",
  },
  thinking: {
    label:       "Thinking",
    dotColor:    "#C49245",
    dotGlow:     "0 0 8px rgba(196,146,69,0.5)",
    textColor:   "var(--color-warning)",
    bgColor:     "rgba(196,146,69,0.1)",
    borderColor: "rgba(196,146,69,0.28)",
  },
  running: {
    label:       "Running",
    dotColor:    "#C9A96E",
    dotGlow:     "0 0 8px rgba(201,169,110,0.5)",
    textColor:   "var(--color-brand-primary)",
    bgColor:     "var(--color-brand-subtle)",
    borderColor: "rgba(201,169,110,0.3)",
  },
  success: {
    label:       "Success",
    dotColor:    "#3FA77A",
    dotGlow:     "0 0 8px rgba(63,167,122,0.5)",
    textColor:   "var(--color-success)",
    bgColor:     "rgba(63,167,122,0.1)",
    borderColor: "rgba(63,167,122,0.28)",
  },
  passed: {
    label:       "Passed",
    dotColor:    "#3FA77A",
    dotGlow:     "0 0 8px rgba(63,167,122,0.5)",
    textColor:   "var(--color-success)",
    bgColor:     "rgba(63,167,122,0.1)",
    borderColor: "rgba(63,167,122,0.28)",
  },
  completed: {
    label:       "Completed",
    dotColor:    "#3FA77A",
    dotGlow:     "0 0 8px rgba(63,167,122,0.5)",
    textColor:   "var(--color-success)",
    bgColor:     "rgba(63,167,122,0.1)",
    borderColor: "rgba(63,167,122,0.28)",
  },
  error: {
    label:       "Error",
    dotColor:    "#C95B5B",
    dotGlow:     "0 0 8px rgba(201,91,91,0.5)",
    textColor:   "var(--color-danger)",
    bgColor:     "rgba(201,91,91,0.1)",
    borderColor: "rgba(201,91,91,0.28)",
  },
  failed: {
    label:       "Failed",
    dotColor:    "#C95B5B",
    dotGlow:     "0 0 8px rgba(201,91,91,0.5)",
    textColor:   "var(--color-danger)",
    bgColor:     "rgba(201,91,91,0.1)",
    borderColor: "rgba(201,91,91,0.28)",
  },
  waiting: {
    label:       "Waiting",
    dotColor:    "#3A7E9E",
    dotGlow:     "0 0 8px rgba(58,126,158,0.5)",
    textColor:   "var(--color-info)",
    bgColor:     "rgba(58,126,158,0.1)",
    borderColor: "rgba(58,126,158,0.28)",
  },
  pending: {
    label:       "Pending",
    dotColor:    "#8E969F",
    textColor:   "var(--color-text-muted)",
    bgColor:     "var(--color-surface)",
    borderColor: "var(--color-border)",
  },
  detected: {
    label:       "Detected",
    dotColor:    "#C95B5B",
    dotGlow:     "0 0 8px rgba(201,91,91,0.5)",
    textColor:   "var(--color-danger)",
    bgColor:     "rgba(201,91,91,0.1)",
    borderColor: "rgba(201,91,91,0.28)",
  },
  localized: {
    label:       "Localized",
    dotColor:    "#C49245",
    dotGlow:     "0 0 8px rgba(196,146,69,0.5)",
    textColor:   "var(--color-warning)",
    bgColor:     "rgba(196,146,69,0.1)",
    borderColor: "rgba(196,146,69,0.28)",
  },
  fixed: {
    label:       "Fixed",
    dotColor:    "#3FA77A",
    dotGlow:     "0 0 8px rgba(63,167,122,0.5)",
    textColor:   "var(--color-success)",
    bgColor:     "rgba(63,167,122,0.1)",
    borderColor: "rgba(63,167,122,0.28)",
  },
  candidate: {
    label:       "Candidate",
    dotColor:    "#C9A96E",
    dotGlow:     "0 0 8px rgba(201,169,110,0.5)",
    textColor:   "var(--color-brand-primary)",
    bgColor:     "var(--color-brand-subtle)",
    borderColor: "rgba(201,169,110,0.3)",
  },
  accepted: {
    label:       "Accepted",
    dotColor:    "#3FA77A",
    dotGlow:     "0 0 8px rgba(63,167,122,0.5)",
    textColor:   "var(--color-success)",
    bgColor:     "rgba(63,167,122,0.1)",
    borderColor: "rgba(63,167,122,0.28)",
  },
  rejected: {
    label:       "Rejected",
    dotColor:    "#C95B5B",
    dotGlow:     "0 0 8px rgba(201,91,91,0.5)",
    textColor:   "var(--color-danger)",
    bgColor:     "rgba(201,91,91,0.1)",
    borderColor: "rgba(201,91,91,0.28)",
  },
};

/**
 * WCAG 2.1 AA status badge with micro-pulsing indicator dot,
 * frosted translucent surface, and calibrated high-contrast typography.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.idle;
  const isAnimated = ["running", "thinking"].includes(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-md shadow-sm transition-all duration-150",
        className
      )}
      style={{
        color:           config.textColor,
        backgroundColor: config.bgColor,
        borderColor:     config.borderColor,
      }}
    >
      <span
        className={cn("w-1.5 h-1.5 rounded-full shrink-0", isAnimated && "animate-pulse")}
        style={{
          backgroundColor: config.dotColor,
          boxShadow: config.dotGlow,
        }}
      />
      {config.label}
    </span>
  );
}
