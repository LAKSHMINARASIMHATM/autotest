"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { ChevronRight, ExternalLink, Eye } from "lucide-react";

interface XAIExplanation {
  agent: string;
  decision: string;
  reason: string;
  retrievedDocs: string[];
  knowledgeGraphNodes: string[];
  confidence: number;
  evidence: string[];
}

interface ExplanationCardProps {
  explanation: XAIExplanation;
  className?: string;
}

/**
 * Explainable AI card — shows why an agent made a particular decision,
 * with retrieved context, KG nodes, confidence, and supporting evidence.
 */
export function ExplanationCard({ explanation, className }: ExplanationCardProps) {
  const {
    agent,
    decision,
    reason,
    retrievedDocs,
    knowledgeGraphNodes,
    confidence,
    evidence,
  } = explanation;

  return (
    <GlassCard className={cn("p-5", className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] text-[#8B5CF6] font-semibold uppercase tracking-wider mb-1">
            XAI • {agent}
          </p>
          <h4 className="text-[14px] font-semibold text-[#F9FAFB]">{decision}</h4>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[rgba(139,92,246,0.1)]">
          <Eye className="w-3 h-3 text-[#8B5CF6]" />
          <span className="text-[11px] font-semibold text-[#8B5CF6]">
            {(confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Reason */}
      <div className="mb-4 px-3 py-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]">
        <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Reasoning</p>
        <p className="text-[12px] text-[#9CA3AF] leading-relaxed">{reason}</p>
      </div>

      {/* Retrieved Context */}
      {retrievedDocs.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1.5">
            Retrieved Context ({retrievedDocs.length})
          </p>
          <div className="space-y-1">
            {retrievedDocs.map((doc, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] text-[#9CA3AF]">
                <ExternalLink className="w-3 h-3 text-[#3B82F6] shrink-0" />
                <span className="truncate">{doc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KG Nodes */}
      {knowledgeGraphNodes.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1.5">
            Knowledge Graph Nodes ({knowledgeGraphNodes.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {knowledgeGraphNodes.map((node, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-[rgba(6,182,212,0.1)] text-[10px] text-[#06B6D4] font-medium"
              >
                {node}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Supporting Evidence */}
      {evidence.length > 0 && (
        <div>
          <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1.5">
            Supporting Evidence
          </p>
          <div className="space-y-1.5">
            {evidence.map((ev, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-2 text-[11px]"
              >
                <ChevronRight className="w-3 h-3 text-[#10B981] shrink-0 mt-0.5" />
                <span className="text-[#9CA3AF] leading-relaxed">{ev}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
