"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { AgentStatus } from "@/types";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Brain,
  ClipboardCheck,
  Code2,
  FileSearch,
  FlaskConical,
  GitCompare,
  Microscope,
  Network,
  Play,
  Search,
  ShieldCheck,
  Target,
  Wrench,
} from "lucide-react";

interface AgentInfo {
  id: string;
  name: string;
  icon: React.ElementType;
  status: AgentStatus;
  confidence: number;
  description: string;
}

const agents: AgentInfo[] = [
  { id: "planner", name: "Planner", icon: Brain, status: "success", confidence: 0.95, description: "Workflow orchestration" },
  { id: "requirement", name: "Requirement", icon: ClipboardCheck, status: "success", confidence: 0.92, description: "SRS analysis" },
  { id: "architecture", name: "Architecture", icon: Network, status: "success", confidence: 0.88, description: "Dependency mapping" },
  { id: "retriever", name: "Retriever", icon: Search, status: "running", confidence: 0.91, description: "Context retrieval" },
  { id: "test-strategy", name: "Test Strategy", icon: Target, status: "waiting", confidence: 0.0, description: "Strategy selection" },
  { id: "test-gen", name: "Test Generator", icon: Code2, status: "idle", confidence: 0.0, description: "Code generation" },
  { id: "verification", name: "Verification", icon: ShieldCheck, status: "idle", confidence: 0.0, description: "Hallucination check" },
  { id: "execution", name: "Execution", icon: Play, status: "idle", confidence: 0.0, description: "Sandbox runner" },
  { id: "bug-loc", name: "Bug Localization", icon: Microscope, status: "idle", confidence: 0.0, description: "Fault localization" },
  { id: "root-cause", name: "Root Cause", icon: FileSearch, status: "idle", confidence: 0.0, description: "Causal analysis" },
  { id: "repair", name: "Program Repair", icon: Wrench, status: "idle", confidence: 0.0, description: "Patch generation" },
  { id: "patch-val", name: "Patch Validation", icon: GitCompare, status: "idle", confidence: 0.0, description: "Regression testing" },
  { id: "learning", name: "Learning", icon: FlaskConical, status: "idle", confidence: 0.0, description: "Memory update" },
];

/**
 * Agent pipeline visualization — shows all 13 agents as a connected workflow.
 */
export function AgentWorkflow() {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[15px] font-semibold text-[#F9FAFB]">Agent Pipeline</h3>
          <p className="text-xs text-[#6B7280] mt-0.5">13 agents • Real-time orchestration</p>
        </div>
        <StatusBadge status="running" />
      </div>

      <div className="grid grid-cols-1 gap-1.5">
        {agents.map((agent, i) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          >
            <div
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200",
                "border border-transparent",
                agent.status === "running" && "bg-[rgba(59,130,246,0.08)] border-[rgba(59,130,246,0.15)]",
                agent.status === "success" && "bg-[rgba(16,185,129,0.05)]",
                agent.status === "thinking" && "bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.15)]",
                agent.status === "error" && "bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.15)]",
                (agent.status === "idle" || agent.status === "waiting") && "bg-[rgba(255,255,255,0.02)]"
              )}
            >
              {/* Connection line */}
              <div className="relative flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    agent.status === "running" ? "bg-[#3B82F6]/20 text-[#3B82F6]" :
                    agent.status === "success" ? "bg-[#10B981]/20 text-[#10B981]" :
                    agent.status === "thinking" ? "bg-[#F59E0B]/20 text-[#F59E0B]" :
                    agent.status === "error" ? "bg-[#EF4444]/20 text-[#EF4444]" :
                    "bg-[rgba(255,255,255,0.06)] text-[#6B7280]"
                  )}
                >
                  <agent.icon className="w-4 h-4" />
                </div>
              </div>

              {/* Agent info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-[#F9FAFB] truncate">{agent.name}</p>
                  <StatusBadge status={agent.status} />
                </div>
                <p className="text-[11px] text-[#6B7280] mt-0.5">{agent.description}</p>
              </div>

              {/* Confidence */}
              {agent.confidence > 0 && (
                <div className="text-right">
                  <p className="text-xs font-semibold text-[#F9FAFB]">{(agent.confidence * 100).toFixed(0)}%</p>
                  <p className="text-[10px] text-[#6B7280]">confidence</p>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
