"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { StatusBadge } from "@/components/ui/status-badge";
import { usePipelineStatus } from "@/hooks/usePipelineStatus";
import {
  IconBrain,
  IconClipboardCheck,
  IconCode,
  IconFileSearch,
  IconFlask,
  IconGitCompare,
  IconMicroscope,
  IconNetwork,
  IconPlay,
  IconShieldCheck,
  IconTarget,
  IconWrench,
  IconLoader,
  IconRefreshCw,
  IconSparkles,
  IconArrowUpRight,
} from "@/components/icons";
import Link from "next/link";

const AGENT_ICONS: Record<string, React.ElementType> = {
  planner:         IconBrain,
  requirement:     IconClipboardCheck,
  architecture:    IconNetwork,
  "test-strategy": IconTarget,
  "test-gen":      IconCode,
  verification:    IconShieldCheck,
  execution:       IconPlay,
  "bug-loc":       IconMicroscope,
  "root-cause":    IconFileSearch,
  repair:          IconWrench,
  "patch-val":     IconGitCompare,
  learning:        IconFlask,
  explainability:  IconSparkles,
};

interface AgentWorkflowProps {
  compact?: boolean;
}

/**
 * Agent pipeline visualization — polls the real backend pipeline API every 3s.
 * Shows all 13 agents with their live statuses from the most recent session.
 * Supports compact mode for space-efficient executive dashboard layouts.
 */
export function AgentWorkflow({ compact = true }: AgentWorkflowProps) {
  const { state, refresh, isPolling } = usePipelineStatus(null, 3000);
  const { agents, pipelineStatus, testCasesGenerated, bugsFound, agentsRun } = state;

  const completedCount = agentsRun.length;
  const overallStatus =
    pipelineStatus === "running"  ? "running"  :
    pipelineStatus === "complete" ? "success"  :
    pipelineStatus === "error"    ? "error"    : "idle";

  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-300",
        compact ? "p-4 sm:p-5" : "p-6"
      )}
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        borderColor: "var(--color-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              Agents Pipeline
            </h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-navy-subtle)] text-[var(--color-navy-accent)] border border-[var(--color-navy-border)]">
              13 Agents
            </span>
            {pipelineStatus === "running" && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "var(--color-brand-primary)" }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "var(--color-brand-primary)" }} />
              </span>
            )}
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {pipelineStatus === "running"
              ? `${completedCount}/13 agents active • streaming`
              : pipelineStatus === "complete"
              ? `Complete • ${testCasesGenerated} tests, ${bugsFound} bugs`
              : "13 autonomous agents • real-time"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href="/dashboard/agents"
            className="p-1.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-maroon-border)] text-[var(--color-text-muted)] hover:text-[var(--color-maroon-primary)] transition-all cursor-pointer"
            title="Open Agents Command Center"
          >
            <IconArrowUpRight size={13} />
          </Link>
          {pipelineStatus === "running" && (
            <IconLoader size={13} className="animate-spin" style={{ color: "var(--color-brand-primary)" }} />
          )}
          <button
            onClick={refresh}
            title="Refresh pipeline status"
            aria-label="Refresh pipeline status"
            className="p-1.5 rounded-lg border transition-all duration-200 cursor-pointer"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
              color: "var(--color-text-muted)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border-hover)";
              e.currentTarget.style.color = "var(--color-text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border)";
              e.currentTarget.style.color = "var(--color-text-muted)";
            }}
          >
            <IconRefreshCw size={13} className={isPolling ? "animate-spin" : ""} />
          </button>
          <StatusBadge status={overallStatus as any} />
        </div>
      </div>

      {/* Agent list - compact scrollable container */}
      <div
        className={cn(
          "grid grid-cols-1 gap-1.5 overflow-y-auto pr-1",
          compact ? "max-h-[520px] custom-scrollbar" : ""
        )}
      >
        {agents.map((agent, i) => {
          const Icon = AGENT_ICONS[agent.id] ?? IconBrain;

          // Compute background + border for each agent row using luxury tokens
          const isRun = agent.status === "running";
          const isSuccess = agent.status === "success" || (agent.status as string) === "completed";
          const isThinking = agent.status === "thinking";
          const isError = agent.status === "error";

          const rowBg = isRun
            ? "var(--color-brand-subtle)"
            : isSuccess
            ? "rgba(63, 167, 122, 0.08)"
            : isThinking
            ? "rgba(201, 169, 110, 0.08)"
            : isError
            ? "rgba(201, 91, 91, 0.08)"
            : "var(--color-surface)";

          const rowBorder = isRun
            ? "rgba(201, 169, 110, 0.35)"
            : isSuccess
            ? "rgba(63, 167, 122, 0.25)"
            : isThinking
            ? "rgba(201, 169, 110, 0.2)"
            : isError
            ? "rgba(201, 91, 91, 0.25)"
            : "var(--color-border)";

          const iconColor = isRun
            ? "var(--color-brand-primary)"
            : isSuccess
            ? "var(--color-success)"
            : isThinking
            ? "var(--color-brand-primary)"
            : isError
            ? "var(--color-danger)"
            : "var(--color-text-muted)";

          const iconBg = isRun
            ? "rgba(201, 169, 110, 0.16)"
            : isSuccess
            ? "rgba(63, 167, 122, 0.16)"
            : isThinking
            ? "rgba(201, 169, 110, 0.12)"
            : isError
            ? "rgba(201, 91, 91, 0.16)"
            : "var(--color-bg-secondary)";

          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.025, duration: 0.25 }}
            >
              <div
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border transition-all duration-200",
                  compact ? "px-2.5 py-2" : "px-3.5 py-2.5"
                )}
                style={{
                  backgroundColor: rowBg,
                  borderColor: rowBorder,
                }}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "rounded-lg flex items-center justify-center shrink-0 border",
                    compact ? "w-7 h-7" : "w-8 h-8"
                  )}
                  style={{
                    backgroundColor: iconBg,
                    borderColor: "var(--color-border)",
                  }}
                >
                  {isRun ? (
                    <IconLoader size={14} className="animate-spin" style={{ color: iconColor }} />
                  ) : (
                    <Icon size={14} style={{ color: iconColor }} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p
                      className="text-xs font-semibold truncate leading-none"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {agent.name}
                    </p>
                    <StatusBadge status={agent.status} />
                  </div>
                  <p
                    className="text-[10px] truncate mt-0.5 leading-tight"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {agent.description}
                  </p>
                </div>

                {/* Confidence */}
                {agent.confidence > 0 && (
                  <div className="text-right shrink-0">
                    <span
                      className="text-[11px] font-mono font-bold"
                      style={{ color: "var(--color-brand-primary)" }}
                    >
                      {(agent.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Session footer */}
      {!state.sessionId && pipelineStatus === "idle" && (
        <p className="text-[10px] text-center mt-3" style={{ color: "var(--color-text-muted)" }}>
          Ready for orchestrator trigger.
        </p>
      )}
    </div>
  );
}
