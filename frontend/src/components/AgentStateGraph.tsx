"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  IconBot,
  IconCheckCircle,
  IconAlertTriangle,
  IconRefreshCw,
  IconCpu,
  IconLayers,
  IconSparkles,
} from "@/components/icons";

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
  selectedNodeId,
  onSelectNode,
}: {
  nodes?: AgentNodeState[];
  activeStateLabel?: string;
  selectedNodeId?: string;
  onSelectNode?: (id: string) => void;
}) {
  const hasNodes = nodes && nodes.length > 0;

  return (
    <div
      className="w-full rounded-2xl p-5 shadow-lg border"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center border"
            style={{
              backgroundColor: "var(--color-maroon-glass)",
              borderColor: "var(--color-maroon-border)",
            }}
          >
            <IconCpu size={16} style={{ color: "var(--color-maroon-primary)" }} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              Agent State Graph <span className="text-[11px] font-medium ml-1.5 px-2 py-0.5 rounded-full bg-[var(--color-navy-subtle)] text-[var(--color-navy-accent)] border border-[var(--color-navy-border)]">LangGraph Mesh</span>
            </h3>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Autonomous dynamic routing & state transitions across all 13 agents
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl border self-start sm:self-auto"
          style={{
            color: "var(--color-text-secondary)",
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <IconRefreshCw
            size={13}
            className={hasNodes ? "animate-spin" : ""}
            style={{ color: hasNodes ? "var(--color-maroon-primary)" : "var(--color-text-muted)" }}
          />
          <span>Active State: <strong className="text-[var(--color-text-primary)]">{activeStateLabel}</strong></span>
        </div>
      </div>

      {!hasNodes ? (
        <div
          className="flex flex-col items-center justify-center py-10 text-center border border-dashed rounded-2xl"
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-surface)",
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 border"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              borderColor: "var(--color-border)",
              color: "var(--color-text-muted)",
            }}
          >
            <IconLayers size={20} />
          </div>
          <h4 className="text-xs font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
            No Active Agent Execution Session
          </h4>
          <p className="text-[11px] max-w-sm" style={{ color: "var(--color-text-muted)" }}>
            Trigger an autonomous testing pipeline or select a project run to stream live agent graph transitions.
          </p>
        </div>
      ) : (
        /* Nodes Pipeline Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {nodes.map((node, index) => {
            const isCompleted = node.status === "completed";
            const isRunning = node.status === "running";
            const isReflecting = node.status === "reflecting";
            const isFailed = node.status === "failed";
            const isSelected = selectedNodeId === node.id;

            const nodeStyle: React.CSSProperties = isSelected
              ? {
                  backgroundColor: "var(--color-maroon-glass)",
                  borderColor: "var(--color-maroon-primary)",
                  boxShadow: "0 0 16px var(--color-maroon-glow)",
                }
              : isRunning
              ? {
                  backgroundColor: "var(--color-brand-subtle)",
                  borderColor: "rgba(201,169,110,0.45)",
                  boxShadow: "0 4px 16px rgba(201,169,110,0.15)",
                }
              : isCompleted
              ? {
                  backgroundColor: "rgba(63, 167, 122, 0.08)",
                  borderColor: "rgba(63, 167, 122, 0.28)",
                }
              : isReflecting
              ? {
                  backgroundColor: "rgba(234, 179, 8, 0.08)",
                  borderColor: "rgba(234, 179, 8, 0.3)",
                }
              : isFailed
              ? {
                  backgroundColor: "rgba(239, 68, 68, 0.08)",
                  borderColor: "rgba(239, 68, 68, 0.3)",
                }
              : {
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                };

            const botColor = isSelected
              ? "var(--color-maroon-primary)"
              : isRunning
              ? "var(--color-brand-primary)"
              : isCompleted
              ? "var(--color-success)"
              : isReflecting
              ? "var(--color-warning)"
              : isFailed
              ? "var(--color-danger)"
              : "var(--color-text-placeholder)";

            return (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.025 }}
                onClick={() => onSelectNode?.(node.id)}
                className={`flex flex-col justify-between p-3 rounded-xl border relative transition-all duration-200 cursor-pointer hover:border-[var(--color-maroon-border)] hover:scale-[1.02] ${
                  isSelected ? "maroon-glass-box" : ""
                }`}
                style={nodeStyle}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <IconBot size={13} className="shrink-0" style={{ color: botColor }} />
                    <span
                      className="text-xs font-semibold truncate"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {node.name}
                    </span>
                  </div>
                  {isCompleted && <IconCheckCircle size={13} style={{ color: "var(--color-success)", flexShrink: 0 }} />}
                  {isRunning && <IconRefreshCw size={13} className="animate-spin shrink-0" style={{ color: "var(--color-brand-primary)" }} />}
                  {isReflecting && <IconAlertTriangle size={13} className="shrink-0" style={{ color: "var(--color-warning)" }} />}
                  {isFailed && <IconAlertTriangle size={13} className="shrink-0" style={{ color: "var(--color-danger)" }} />}
                </div>

                <p
                  className="text-[10px] mb-2.5 leading-tight truncate"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {node.role}
                </p>

                <div
                  className="flex items-center justify-between text-[10px] pt-1.5"
                  style={{
                    borderTop: "1px solid var(--color-border)",
                    color: "var(--color-text-placeholder)",
                  }}
                >
                  <span>{node.latency_ms ? `${node.latency_ms}ms` : "—"}</span>
                  <span
                    className="font-mono font-semibold"
                    style={{ color: node.confidence ? "var(--color-success)" : "var(--color-text-placeholder)" }}
                  >
                    {node.confidence ? `${(node.confidence * 100).toFixed(0)}%` : ""}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
