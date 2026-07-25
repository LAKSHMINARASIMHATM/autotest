"use client";

import React from "react";
import { motion } from "framer-motion";
import { Bot, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, Cpu } from "lucide-react";

export interface AgentNodeState {
  id: string;
  name: string;
  role: string;
  status: "idle" | "running" | "completed" | "failed" | "reflecting";
  latency_ms?: number;
  confidence?: number;
}

const defaultNodes: AgentNodeState[] = [
  { id: "1", name: "Planner", role: "Test Planning", status: "completed", latency_ms: 120, confidence: 0.95 },
  { id: "2", name: "Requirement", role: "Contract Extraction", status: "completed", latency_ms: 240, confidence: 0.92 },
  { id: "3", name: "Architecture", role: "CFG & AST Analysis", status: "completed", latency_ms: 180, confidence: 0.98 },
  { id: "4", name: "Test Strategy", role: "Scenario Formulation", status: "completed", latency_ms: 310, confidence: 0.90 },
  { id: "5", name: "Test Gen", role: "PyTest / Jest Synthesis", status: "completed", latency_ms: 1450, confidence: 0.88 },
  { id: "6", name: "Verification", role: "Static AST Check", status: "completed", latency_ms: 95, confidence: 1.0 },
  { id: "7", name: "Execution", role: "Sandboxed Runner", status: "running", latency_ms: 450, confidence: 0.85 },
];

export function AgentStateGraph({ nodes = defaultNodes }: { nodes?: AgentNodeState[] }) {
  return (
    <div className="w-full bg-[#121318] border border-[#27272A] rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#F9FAFB]">Agent State Graph</h3>
            <p className="text-xs text-[#6B7280]">LangGraph dynamic routing & execution pipeline</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#9CA3AF] bg-[#18181B] px-3 py-1.5 rounded-lg border border-[#27272A]">
          <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
          <span>Active State: Execution Node</span>
        </div>
      </div>

      {/* Nodes Pipeline Row */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3 relative">
        {nodes.map((node, index) => {
          const isCompleted = node.status === "completed";
          const isRunning = node.status === "running";
          const isReflecting = node.status === "reflecting";

          return (
            <React.Fragment key={node.id}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex flex-col justify-between p-3.5 rounded-xl border relative transition-all ${
                  isRunning
                    ? "bg-blue-500/10 border-blue-500/40 shadow-lg shadow-blue-500/10"
                    : isCompleted
                    ? "bg-[#18181B] border-emerald-500/30"
                    : isReflecting
                    ? "bg-amber-500/10 border-amber-500/40"
                    : "bg-[#18181B]/50 border-[#27272A]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Bot className={`w-4 h-4 ${isRunning ? "text-blue-400" : isCompleted ? "text-emerald-400" : "text-[#6B7280]"}`} />
                    <span className="text-xs font-semibold text-[#F9FAFB] truncate">{node.name}</span>
                  </div>
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {isRunning && <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
                  {isReflecting && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                </div>

                <p className="text-[11px] text-[#9CA3AF] mb-3 leading-tight truncate">{node.role}</p>

                <div className="flex items-center justify-between text-[10px] text-[#6B7280] pt-2 border-t border-[#27272A]">
                  <span>{node.latency_ms ? `${node.latency_ms}ms` : "—"}</span>
                  <span className="font-mono text-emerald-400">{node.confidence ? `${(node.confidence * 100).toFixed(0)}% C` : ""}</span>
                </div>
              </motion.div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
