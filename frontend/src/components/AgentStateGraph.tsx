"use client";

import React from "react";
import { motion } from "framer-motion";
import { Bot, CheckCircle2, AlertTriangle, RefreshCw, Cpu, Layers } from "lucide-react";

export interface AgentNodeState {
  id: string;
  name: string;
  role: string;
  status: "idle" | "running" | "completed" | "failed" | "reflecting";
  latency_ms?: number;
  confidence?: number;
}

export function AgentStateGraph({
  nodes = [],
  activeStateLabel = "Idle",
}: {
  nodes?: AgentNodeState[];
  activeStateLabel?: string;
}) {
  const hasNodes = nodes && nodes.length > 0;

  return (
    <div className="w-full bg-[#121318] border border-[#27272A] rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#F9FAFB]">Agent State Graph</h3>
            <p className="text-xs text-[#6B7280]">LangGraph dynamic routing & state transitions</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#9CA3AF] bg-[#18181B] px-3 py-1.5 rounded-lg border border-[#27272A]">
          <RefreshCw className={`w-3.5 h-3.5 ${hasNodes ? "text-blue-400 animate-spin" : "text-[#6B7280]"}`} />
          <span>Active State: {activeStateLabel}</span>
        </div>
      </div>

      {!hasNodes ? (
        <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-[#27272A] rounded-xl bg-[#09090B]">
          <div className="w-10 h-10 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-center mb-3 text-[#6B7280]">
            <Layers className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-semibold text-[#E4E4E7] mb-1">No Active Agent Execution Session</h4>
          <p className="text-[11px] text-[#6B7280] max-w-sm">
            Trigger an autonomous testing pipeline or select a project run to stream live agent graph transitions.
          </p>
        </div>
      ) : (
        /* Nodes Pipeline Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 relative">
          {nodes.map((node, index) => {
            const isCompleted = node.status === "completed";
            const isRunning = node.status === "running";
            const isReflecting = node.status === "reflecting";

            return (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
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
                  <div className="flex items-center gap-1.5 truncate">
                    <Bot className={`w-4 h-4 shrink-0 ${isRunning ? "text-blue-400" : isCompleted ? "text-emerald-400" : "text-[#6B7280]"}`} />
                    <span className="text-xs font-semibold text-[#F9FAFB] truncate">{node.name}</span>
                  </div>
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  {isRunning && <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />}
                  {isReflecting && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                </div>

                <p className="text-[11px] text-[#9CA3AF] mb-3 leading-tight truncate">{node.role}</p>

                <div className="flex items-center justify-between text-[10px] text-[#6B7280] pt-2 border-t border-[#27272A]">
                  <span>{node.latency_ms ? `${node.latency_ms}ms` : "—"}</span>
                  <span className="font-mono text-emerald-400">{node.confidence ? `${(node.confidence * 100).toFixed(0)}% C` : ""}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
