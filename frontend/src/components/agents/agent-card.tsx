"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AgentStatus } from "@/types";
import {
  IconBrain,
  IconChevronRight,
  IconClock,
  IconCpu,
} from "@/components/icons";

interface AgentCardProps {
  name: string;
  description: string;
  status: AgentStatus;
  icon: React.ElementType;
  confidence: number;
  latencyMs?: number;
  currentTask?: string;
  memoryUsage?: string;
  reasoningSteps?: number;
  model?: string;
  isSelected?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * Detailed agent card showing status, confidence, latency,
 * current task, engine model, and reasoning chain length.
 */
export function AgentCard({
  name,
  description,
  status,
  icon: Icon,
  confidence,
  latencyMs,
  currentTask,
  memoryUsage = "14 MB",
  reasoningSteps = 0,
  model = "Groq LLaMA-3.3",
  isSelected = false,
  className,
  onClick,
}: AgentCardProps) {
  const isActive = status === "running" || status === "thinking";

  // Compute icon styling by status
  const iconColor =
    isSelected            ? "var(--color-maroon-primary)" :
    status === "running"  ? "var(--color-brand-primary)" :
    status === "success"  ? "var(--color-success)"       :
    status === "error"    ? "var(--color-danger)"        :
    status === "thinking" ? "var(--color-warning)"       :
                            "var(--color-text-placeholder)";

  const iconBg =
    isSelected            ? "var(--color-maroon-glass)" :
    status === "running"  ? "var(--color-brand-subtle)"  :
    status === "success"  ? "rgba(63, 167, 122, 0.12)"   :
    status === "error"    ? "rgba(239, 68, 68, 0.12)"    :
    status === "thinking" ? "rgba(234, 179, 8, 0.12)"    :
                            "var(--color-surface)";

  const confidenceBarColor =
    confidence >= 0.85 ? "var(--color-success)" :
    confidence >= 0.7  ? "var(--color-brand-primary)" :
    confidence >= 0.5  ? "var(--color-warning)" :
                         "var(--color-danger)";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={cn(
        "glass-card p-5 group relative overflow-hidden transition-all duration-200 cursor-pointer hover:scale-[1.015]",
        isSelected && "maroon-glass-box border-[var(--color-maroon-primary)] shadow-[0_0_24px_var(--color-maroon-glow)]",
        isActive && !isSelected && "shadow-[0_8px_30px_rgba(201,169,110,0.15)] border-[rgba(201,169,110,0.4)]",
        className
      )}
    >
      {/* Active pulse border */}
      {isActive && (
        <div
          className="absolute inset-0 rounded-2xl border animate-pulse pointer-events-none"
          style={{ borderColor: isSelected ? "var(--color-maroon-border)" : "rgba(201, 169, 110, 0.25)" }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3.5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm border border-[var(--color-border)] shrink-0"
            style={{ backgroundColor: iconBg }}
          >
            <Icon size={20} style={{ color: iconColor }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-[14px] font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                {name}
              </h4>
              {isSelected && (
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[var(--color-maroon-primary)] text-white tracking-wider">
                  Active Focus
                </span>
              )}
            </div>
            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              {description}
            </p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Current Task */}
      {currentTask && (
        <div
          className="mb-3.5 px-3 py-2 rounded-xl border"
          style={{
            backgroundColor: isSelected ? "rgba(128, 0, 32, 0.05)" : "var(--color-surface)",
            borderColor: isSelected ? "var(--color-maroon-border)" : "var(--color-border)",
          }}
        >
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              Autonomous Task
            </p>
            <span className="text-[10px] font-mono text-[var(--color-navy-accent)] bg-[var(--color-navy-subtle)] px-1.5 py-0.2 rounded border border-[var(--color-navy-border)]">
              {model}
            </span>
          </div>
          <p className="text-[11px] font-medium line-clamp-2 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            {currentTask}
          </p>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        {/* Confidence */}
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-wider mb-1"
            style={{ color: "var(--color-text-placeholder)" }}
          >
            Confidence
          </p>
          <div className="flex items-center gap-1.5">
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: "var(--color-surface-hover)" }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(confidence * 100, 8)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ backgroundColor: confidenceBarColor }}
              />
            </div>
            <span className="text-[11px] font-bold font-mono" style={{ color: "var(--color-text-primary)" }}>
              {(confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Latency */}
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-wider mb-1"
            style={{ color: "var(--color-text-placeholder)" }}
          >
            Latency
          </p>
          <div className="flex items-center gap-1.5">
            <IconClock size={12} style={{ color: "var(--color-text-muted)" }} />
            <span className="text-[11px] font-bold font-mono" style={{ color: "var(--color-text-primary)" }}>
              {latencyMs ? `${latencyMs}ms` : "142ms"}
            </span>
          </div>
        </div>

        {/* Engine */}
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-wider mb-1"
            style={{ color: "var(--color-text-placeholder)" }}
          >
            Memory
          </p>
          <div className="flex items-center gap-1.5">
            <IconCpu size={12} style={{ color: "var(--color-text-muted)" }} />
            <span
              className="text-[11px] font-bold truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {memoryUsage}
            </span>
          </div>
        </div>
      </div>

      {/* Reasoning chain footer */}
      <div
        className="mt-3 pt-2.5 flex items-center justify-between"
        style={{ borderTop: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-1.5">
          <IconBrain size={12} style={{ color: isSelected ? "var(--color-maroon-primary)" : "var(--color-navy-accent)" }} />
          <span className="text-[10px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
            {reasoningSteps > 0 ? `${reasoningSteps} chain-of-thought steps` : "Multi-agent LangGraph node"}
          </span>
        </div>
        <IconChevronRight
          size={13}
          style={{ color: isSelected ? "var(--color-maroon-primary)" : "var(--color-text-placeholder)" }}
          className="group-hover:translate-x-1 transition-transform"
        />
      </div>
    </motion.div>
  );
}
