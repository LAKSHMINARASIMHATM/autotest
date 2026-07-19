"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { StatusBadge } from "@/components/ui/status-badge";
import { usePipelineStatus } from "@/hooks/usePipelineStatus";
import {
  Brain, ClipboardCheck, Code2, FileSearch, FlaskConical,
  GitCompare, Microscope, Network, Play, Search, ShieldCheck,
  Target, Wrench, Loader2, RefreshCw,
} from "lucide-react";

const AGENT_ICONS: Record<string, React.ElementType> = {
  planner:         Brain,
  requirement:     ClipboardCheck,
  architecture:    Network,
  retriever:       Search,
  "test-strategy": Target,
  "test-gen":      Code2,
  verification:    ShieldCheck,
  execution:       Play,
  "bug-loc":       Microscope,
  "root-cause":    FileSearch,
  repair:          Wrench,
  "patch-val":     GitCompare,
  learning:        FlaskConical,
};

/**
 * Agent pipeline visualization — polls the real backend pipeline API every 3s.
 * Shows all 13 agents with their live statuses from the most recent session.
 */
export function AgentWorkflow() {
  const { state, refresh, isPolling } = usePipelineStatus(null, 3000);
  const { agents, pipelineStatus, testCasesGenerated, bugsFound, agentsRun } = state;

  const completedCount = agentsRun.length;
  const overallStatus =
    pipelineStatus === "running" ? "running"
    : pipelineStatus === "complete" ? "success"
    : pipelineStatus === "error" ? "error"
    : "idle";

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-semibold text-[#F9FAFB]">Agent Pipeline</h3>
          <p className="text-xs text-[#6B7280] mt-0.5">
            {pipelineStatus === "running"
              ? `${completedCount}/13 agents completed`
              : pipelineStatus === "complete"
              ? `Complete — ${testCasesGenerated} tests, ${bugsFound} bugs`
              : "13 agents • Real-time orchestration"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pipelineStatus === "running" && (
            <Loader2 className="w-3.5 h-3.5 text-[#3B82F6] animate-spin" />
          )}
          <button
            onClick={refresh}
            title="Refresh"
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#6B7280]" />
          </button>
          <StatusBadge status={overallStatus as any} />
        </div>
      </div>

      {/* Agent list */}
      <div className="grid grid-cols-1 gap-1.5">
        {agents.map((agent, i) => {
          const Icon = AGENT_ICONS[agent.id] ?? Brain;
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            >
              <div
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-300",
                  "border border-transparent",
                  agent.status === "running"  && "bg-[rgba(59,130,246,0.08)] border-[rgba(59,130,246,0.15)]",
                  agent.status === "success"  && "bg-[rgba(16,185,129,0.05)]",
                  agent.status === "thinking" && "bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.15)]",
                  agent.status === "waiting"  && "bg-[rgba(245,158,11,0.04)] border-[rgba(245,158,11,0.08)]",
                  agent.status === "error"    && "bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.15)]",
                  (agent.status === "idle")   && "bg-[rgba(255,255,255,0.02)]",
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    agent.status === "running"  ? "bg-[#3B82F6]/20 text-[#3B82F6]"  :
                    agent.status === "success"  ? "bg-[#10B981]/20 text-[#10B981]"  :
                    agent.status === "thinking" ? "bg-[#F59E0B]/20 text-[#F59E0B]"  :
                    agent.status === "waiting"  ? "bg-[#F59E0B]/10 text-[#F59E0B]"  :
                    agent.status === "error"    ? "bg-[#EF4444]/20 text-[#EF4444]"  :
                    "bg-[rgba(255,255,255,0.06)] text-[#6B7280]"
                  )}
                >
                  {agent.status === "running"
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Icon className="w-4 h-4" />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-[#F9FAFB] truncate">{agent.name}</p>
                    <StatusBadge status={agent.status} />
                  </div>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">{agent.description}</p>
                </div>

                {/* Confidence */}
                {agent.confidence > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-[#F9FAFB]">
                      {(agent.confidence * 100).toFixed(0)}%
                    </p>
                    <p className="text-[10px] text-[#6B7280]">confidence</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* No session footer */}
      {!state.sessionId && pipelineStatus === "idle" && (
        <p className="text-[11px] text-[#4B5563] text-center mt-4">
          No active pipeline session. Import a project and trigger the pipeline.
        </p>
      )}
    </div>
  );
}
