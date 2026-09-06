"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import {
  IconChevronRight,
  IconSparkles,
  IconBrain,
  IconCheckCircle,
  IconCopy,
  IconLayers,
  IconNetwork,
} from "@/components/icons";

export interface XAIExplanation {
  agent: string;
  decision: string;
  reason: string;
  knowledgeGraphNodes?: string[];
  confidence: number;
  evidence: string[];
  alternatives?: string[];
  model?: string;
  latencyMs?: number;
}

interface ExplanationCardProps {
  explanation: XAIExplanation;
  className?: string;
}

/**
 * Explainable AI card — shows why an agent made a particular decision,
 * with real database metrics, confidence, supporting evidence, and alternatives considered.
 */
export function ExplanationCard({ explanation, className }: ExplanationCardProps) {
  const {
    agent,
    decision,
    reason,
    knowledgeGraphNodes = [],
    confidence,
    evidence,
    alternatives = [],
    model = "Groq LLaMA-3.3-70B",
    latencyMs = 142,
  } = explanation;

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `[XAI Audit • ${agent}]\nDecision: ${decision}\nReason: ${reason}\nConfidence: ${(confidence * 100).toFixed(0)}%\nEvidence:\n${evidence.map((e) => `• ${e}`).join("\n")}${alternatives.length > 0 ? `\nAlternatives Considered:\n${alternatives.map((a) => `• ${a}`).join("\n")}` : ""}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <GlassCard className={cn("p-5 space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-maroon-primary)]">
              XAI Telemetry
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-navy-subtle)] text-[var(--color-navy-accent)] border border-[var(--color-navy-border)] font-semibold">
              {agent}
            </span>
          </div>
          <h4 className="text-[14px] font-bold leading-snug" style={{ color: "var(--color-text-primary)" }}>
            {decision}
          </h4>
        </div>

        {/* Confidence Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--color-maroon-glass)] border border-[var(--color-maroon-border)] shrink-0 shadow-sm">
          <IconSparkles size={12} className="text-[var(--color-maroon-primary)]" />
          <span className="text-[11px] font-extrabold font-mono text-[var(--color-maroon-primary)]">
            {(confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Reasoning Box */}
      <div className="px-3.5 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>
          Autonomous Reasoning & Causal Basis
        </p>
        <p className="text-[12px] leading-relaxed font-medium" style={{ color: "var(--color-text-secondary)" }}>
          {reason}
        </p>
      </div>

      {/* Supporting Evidence */}
      {evidence.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>
            Verified Supporting Evidence ({evidence.length})
          </p>
          <div className="space-y-1.5">
            {evidence.map((ev, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-start gap-2 text-[11px] px-2.5 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]"
              >
                <IconCheckCircle size={13} className="text-[var(--color-success)] shrink-0 mt-0.5" />
                <span className="leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  {ev}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Counterfactual Alternatives Considered */}
      {alternatives.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>
            Counterfactual Alternatives Considered
          </p>
          <div className="space-y-1.5">
            {alternatives.map((alt, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-[11px] px-2.5 py-1.5 rounded-lg border border-dashed border-[var(--color-border)] bg-[rgba(201,169,110,0.04)]"
              >
                <IconChevronRight size={13} className="text-[var(--color-brand-primary)] shrink-0 mt-0.5" />
                <span className="leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  {alt}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Knowledge Graph Nodes */}
      {knowledgeGraphNodes.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>
            Knowledge Graph Subgraphs ({knowledgeGraphNodes.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {knowledgeGraphNodes.map((node, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-[var(--color-navy-subtle)] border border-[var(--color-navy-border)] text-[10px] text-[var(--color-navy-accent)] font-semibold"
              >
                {node}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer Meta & Copy Trace */}
      <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-3 text-[var(--color-text-muted)] font-mono">
          <span>Engine: <strong className="text-[var(--color-text-primary)]">{model}</strong></span>
          <span>•</span>
          <span>{latencyMs}ms</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-navy-accent)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
        >
          {copied ? <IconCheckCircle size={12} className="text-[var(--color-success)]" /> : <IconCopy size={12} />}
          <span>{copied ? "Copied" : "Copy Trace"}</span>
        </button>
      </div>
    </GlassCard>
  );
}
