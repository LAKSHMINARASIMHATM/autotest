"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ScrollText, ShieldCheck, AlertTriangle, ChevronDown,
  ChevronUp, Bot, Sparkles, BarChart2, Info,
} from "lucide-react";
import { useState } from "react";
import type { XAIReport, AgentDecision } from "@/lib/api";

interface XAIPanelProps {
  report: XAIReport | null;
  explanations?: AgentDecision[];
  sessionId?: string | null;
  loading?: boolean;
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 85 ? "from-emerald-500 to-emerald-400" :
    pct >= 70 ? "from-amber-500 to-amber-400" :
                "from-red-500 to-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#27272A] rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className={`text-[11px] font-mono font-bold w-8 text-right ${
        pct >= 85 ? "text-emerald-400" : pct >= 70 ? "text-amber-400" : "text-red-400"
      }`}>{pct}%</span>
    </div>
  );
}

function DecisionRow({ decision, index }: { decision: AgentDecision; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="border border-[#27272A] rounded-xl overflow-hidden"
    >
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-start gap-3 p-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors text-left"
      >
        <div className="w-6 h-6 rounded-lg bg-[rgba(139,92,246,0.12)] border border-[rgba(139,92,246,0.2)] flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-violet-400 uppercase tracking-wide">
              {decision.agent}
            </span>
            <span className="text-[9px] text-[#6B7280]">#{index + 1}</span>
          </div>
          <p className="text-[12px] text-[#E4E4E7] font-medium leading-snug truncate">
            {decision.decision}
          </p>
          <ConfidenceBar value={decision.confidence} />
        </div>
        <div className="shrink-0 mt-1">
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5 text-[#6B7280]" />
            : <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-[#27272A] px-3 pb-3 pt-2.5 bg-[#0D0D10] space-y-2.5"
          >
            {/* Reason */}
            <div>
              <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Reasoning</p>
              <p className="text-[11px] text-[#9CA3AF] leading-relaxed">{decision.reason}</p>
            </div>

            {/* Evidence */}
            {decision.supporting_evidence?.length > 0 && (
              <div>
                <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1.5">Evidence</p>
                <div className="space-y-1">
                  {decision.supporting_evidence.map((e, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-[11px] text-[#9CA3AF]">{e}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alternatives */}
            {decision.alternatives_considered?.length > 0 && (
              <div>
                <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1.5">Alternatives Considered</p>
                <div className="space-y-1">
                  {decision.alternatives_considered.map((a, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-[11px] text-[#9CA3AF]">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function XAIPanel({ report, explanations = [], sessionId, loading }: XAIPanelProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "decisions" | "risks">("summary");

  const decisions = report?.agent_decisions?.length
    ? report.agent_decisions
    : explanations;

  const pipelineConfidence = report?.pipeline_confidence ?? 0;
  const confPct = Math.round(pipelineConfidence * 100);

  return (
    <div className="w-full bg-[#121318] border border-[#27272A] rounded-xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272A]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <ScrollText className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#F9FAFB]">XAI Audit Report</h3>
            <p className="text-xs text-[#6B7280]">
              Explainability Agent · {report?.total_agents ?? decisions.length} agent decisions
            </p>
          </div>
        </div>

        {/* Pipeline confidence badge */}
        {pipelineConfidence > 0 && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${
            confPct >= 85
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : confPct >= 70
              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            <BarChart2 className="w-3.5 h-3.5" />
            {confPct}% confidence
          </div>
        )}
      </div>

      {loading && !report && (
        <div className="p-10 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-center mb-3 animate-pulse">
            <Sparkles className="w-5 h-5 text-violet-400" />
          </div>
          <p className="text-xs text-[#6B7280]">
            XAI report will be generated by the Explainability agent after the pipeline completes.
          </p>
        </div>
      )}

      {!loading && !report && decisions.length === 0 && (
        <div className="p-10 flex flex-col items-center text-center border-t border-[#27272A]">
          <div className="w-10 h-10 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-center mb-3">
            <Info className="w-5 h-5 text-[#6B7280]" />
          </div>
          <p className="text-xs font-semibold text-[#E4E4E7] mb-1">No XAI Data Available</p>
          <p className="text-[11px] text-[#6B7280] max-w-xs">
            Run a complete pipeline to generate the Explainability Agent's structured audit report.
          </p>
        </div>
      )}

      {(report || decisions.length > 0) && (
        <>
          {/* Tabs */}
          <div className="flex items-center gap-1 px-5 pt-3 pb-0">
            {(["summary", "decisions", "risks"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                  activeTab === tab
                    ? "bg-[rgba(139,92,246,0.12)] text-violet-400"
                    : "text-[#6B7280] hover:text-[#9CA3AF]"
                }`}
              >
                {tab}
                {tab === "decisions" && decisions.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-[#27272A] text-[9px] font-bold text-[#9CA3AF]">
                    {decisions.length}
                  </span>
                )}
                {tab === "risks" && report?.risk_factors && report.risk_factors.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-red-500/20 text-[9px] font-bold text-red-400">
                    {report.risk_factors.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-4">
            {/* ── Summary tab ────────────────────────────────────────────── */}
            {activeTab === "summary" && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Pipeline confidence */}
                {pipelineConfidence > 0 && (
                  <div className="glass-card p-4 space-y-2">
                    <p className="text-[11px] text-[#6B7280] uppercase tracking-wider font-semibold">
                      Pipeline Confidence
                    </p>
                    <ConfidenceBar value={pipelineConfidence} />
                  </div>
                )}

                {/* Audit summary */}
                {report?.audit_summary && (
                  <div className="glass-card p-4">
                    <p className="text-[11px] text-[#6B7280] uppercase tracking-wider font-semibold mb-2">
                      Audit Summary
                    </p>
                    <p className="text-[12px] text-[#9CA3AF] leading-relaxed">
                      {report.audit_summary}
                    </p>
                  </div>
                )}

                {/* Key decisions */}
                {report?.key_decisions && report.key_decisions.length > 0 && (
                  <div className="glass-card p-4">
                    <p className="text-[11px] text-[#6B7280] uppercase tracking-wider font-semibold mb-2.5">
                      Key Decisions
                    </p>
                    <div className="space-y-2">
                      {report.key_decisions.map((kd, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-[#9CA3AF] leading-snug">{kd}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Agents",      value: report?.total_agents ?? decisions.length,   color: "text-violet-400" },
                    { label: "Decisions",   value: decisions.length,                            color: "text-blue-400"   },
                    { label: "Risk Flags",  value: report?.risk_factors?.length ?? 0,           color: "text-amber-400"  },
                  ].map((s) => (
                    <div key={s.label} className="glass-card p-3 text-center">
                      <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-[#6B7280]">{s.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Decisions tab ───────────────────────────────────────────── */}
            {activeTab === "decisions" && (
              <motion.div
                key="decisions"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2 max-h-[480px] overflow-y-auto pr-1"
              >
                {decisions.length === 0 ? (
                  <p className="text-[12px] text-[#6B7280] text-center py-8">No decision data available.</p>
                ) : (
                  decisions.map((d, i) => (
                    <DecisionRow key={i} decision={d} index={i} />
                  ))
                )}
              </motion.div>
            )}

            {/* ── Risks tab ───────────────────────────────────────────────── */}
            {activeTab === "risks" && (
              <motion.div
                key="risks"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                {(!report?.risk_factors || report.risk_factors.length === 0) ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <ShieldCheck className="w-8 h-8 text-emerald-400 mb-2" />
                    <p className="text-[12px] font-semibold text-emerald-400 mb-1">No Risk Factors Detected</p>
                    <p className="text-[11px] text-[#6B7280]">All agent decisions had acceptable confidence levels.</p>
                  </div>
                ) : (
                  report.risk_factors.map((rf, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-[#D1D5DB] leading-snug">{rf}</p>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
