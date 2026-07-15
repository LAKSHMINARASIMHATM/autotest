"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AgentStatus } from "@/types";
import {
  Brain,
  ChevronRight,
  Clock,
  Cpu,
  type LucideIcon,
} from "lucide-react";

interface AgentCardProps {
  name: string;
  description: string;
  status: AgentStatus;
  icon: LucideIcon;
  confidence: number;
  latencyMs: number;
  currentTask?: string;
  memoryUsage?: string;
  reasoningSteps?: number;
  className?: string;
}

/**
 * Detailed agent card showing status, confidence, latency,
 * current task, memory, and reasoning chain length.
 */
export function AgentCard({
  name,
  description,
  status,
  icon: Icon,
  confidence,
  latencyMs,
  currentTask,
  memoryUsage = "12 MB",
  reasoningSteps = 0,
  className,
}: AgentCardProps) {
  const isActive = status === "running" || status === "thinking";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "glass-card p-5 group relative overflow-hidden",
        isActive && "border-[rgba(59,130,246,0.2)]",
        className
      )}
    >
      {/* Active pulse border */}
      {isActive && (
        <div className="absolute inset-0 rounded-xl border border-[rgba(59,130,246,0.15)] animate-pulse pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
              status === "running"
                ? "bg-[#3B82F6]/15 text-[#3B82F6] shadow-[0_0_16px_rgba(59,130,246,0.15)]"
                : status === "success"
                ? "bg-[#10B981]/15 text-[#10B981]"
                : status === "error"
                ? "bg-[#EF4444]/15 text-[#EF4444]"
                : status === "thinking"
                ? "bg-[#F59E0B]/15 text-[#F59E0B]"
                : "bg-[rgba(255,255,255,0.06)] text-[#6B7280]"
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[14px] font-semibold text-[#F9FAFB]">{name}</h4>
            <p className="text-[11px] text-[#6B7280]">{description}</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Current Task */}
      {currentTask && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]">
          <p className="text-[11px] text-[#6B7280] mb-0.5">Current Task</p>
          <p className="text-[12px] text-[#9CA3AF] line-clamp-2">{currentTask}</p>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-[#4B5563] uppercase tracking-wider mb-0.5">Confidence</p>
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${confidence * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full",
                  confidence >= 0.8
                    ? "bg-[#10B981]"
                    : confidence >= 0.5
                    ? "bg-[#F59E0B]"
                    : "bg-[#EF4444]"
                )}
              />
            </div>
            <span className="text-[11px] font-semibold text-[#F9FAFB]">
              {(confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-[#4B5563] uppercase tracking-wider mb-0.5">Latency</p>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#6B7280]" />
            <span className="text-[11px] font-semibold text-[#F9FAFB]">{latencyMs}ms</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-[#4B5563] uppercase tracking-wider mb-0.5">Memory</p>
          <div className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-[#6B7280]" />
            <span className="text-[11px] font-semibold text-[#F9FAFB]">{memoryUsage}</span>
          </div>
        </div>
      </div>

      {/* Reasoning chain */}
      {reasoningSteps > 0 && (
        <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Brain className="w-3 h-3 text-[#8B5CF6]" />
              <span className="text-[11px] text-[#9CA3AF]">
                {reasoningSteps} reasoning steps
              </span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#4B5563] group-hover:text-[#9CA3AF] transition-colors" />
          </div>
        </div>
      )}
    </motion.div>
  );
}
