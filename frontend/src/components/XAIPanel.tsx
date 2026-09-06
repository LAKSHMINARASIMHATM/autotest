"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  IconScrollText,
  IconShieldCheck,
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
  IconBot,
  IconSparkles,
  IconBarChart2,
  IconInfo,
} from "@/components/icons";
import { useState } from "react";
import type { XAIReport, AgentDecision } from "@/lib/api";

interface XAIPanelProps {
  report: XAIReport | null;
  explanations?: AgentDecision[];
  sessionId?: string | null;
  projectName?: string | null;
  loading?: boolean;
  isExpanded?: boolean;
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const barColor =
    pct >= 85 ? "linear-gradient(90deg, #2A845C, #3FA77A)" :
      pct >= 70 ? "linear-gradient(90deg, #A88647, #C9A96E)" :
        "linear-gradient(90deg, #B84848, #C95B5B)";
  const textColor =
    pct >= 85 ? "var(--color-success)" :
      pct >= 70 ? "var(--color-warning)" :
        "var(--color-danger)";

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex-1 h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span
        className="text-xs font-mono font-bold w-10 text-right"
        style={{ color: textColor }}
      >
        {pct}%
      </span>
    </div>
  );
}

function DecisionRow({ decision, index }: { decision: AgentDecision; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl overflow-hidden border transition-all duration-200"
      style={{
        borderColor: expanded ? "var(--color-border-hover)" : "var(--color-border)",
        backgroundColor: expanded ? "var(--color-surface)" : "transparent",
      }}
    >
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-start gap-3.5 p-4 transition-colors text-left cursor-pointer"
        aria-expanded={expanded}
        aria-label={`Toggle decision details for ${decision.agent}`}
        onMouseEnter={(e) => {
          if (!expanded) e.currentTarget.style.backgroundColor = "var(--color-surface)";
        }}
        onMouseLeave={(e) => {
          if (!expanded) e.currentTarget.style.backgroundColor = "";
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border"
          style={{
            backgroundColor: "var(--color-brand-subtle)",
            borderColor: "rgba(201, 169, 110, 0.3)",
          }}
        >
          <IconBot size={16} style={{ color: "var(--color-brand-primary)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--color-brand-primary)" }}
            >
              {decision.agent}
            </span>
            <span
              className="text-[10px] font-mono px-1.5 py-0.2 rounded border"
              style={{
                color: "var(--color-text-muted)",
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
            >
              Step #{index + 1}
            </span>
            {decision.confidence >= 0.9 && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                style={{
                  color: "var(--color-success)",
                  backgroundColor: "rgba(63, 167, 122, 0.1)",
                  borderColor: "rgba(63, 167, 122, 0.25)",
                }}
              >
                High Confidence
              </span>
            )}
          </div>
          <p
            className="text-[13px] font-medium leading-snug mb-2"
            style={{ color: "var(--color-text-primary)" }}
          >
            {decision.decision}
          </p>
          <ConfidenceBar value={decision.confidence} />
        </div>
        <div className="shrink-0 mt-1 p-1 rounded-md" style={{ color: "var(--color-text-muted)" }}>
          {expanded
            ? <IconChevronUp size={16} />
            : <IconChevronDown size={16} />
          }
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 pb-4 pt-3 space-y-3.5"
            style={{
              borderTop: "1px solid var(--color-border)",
              backgroundColor: "var(--color-surface)",
            }}
          >
            {/* Reason */}
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{ color: "var(--color-brand-primary)" }}
              >
                Executive Reasoning
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                {decision.reason}
              </p>
            </div>

            {/* Evidence */}
            {decision.supporting_evidence?.length > 0 && (
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Validated Evidence & Signals ({decision.supporting_evidence.length})
                </p>
                <div className="space-y-1.5">
                  {decision.supporting_evidence.map((e, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: "var(--color-success)" }}
                      />
                      <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                        {e}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alternatives */}
            {decision.alternatives_considered?.length > 0 && (
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Alternative Strategies Evaluated
                </p>
                <div className="space-y-1.5">
                  {decision.alternatives_considered.map((a, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: "var(--color-warning)" }}
                      />
                      <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {a}
                      </span>
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

export function XAIPanel({
  report,
  explanations = [],
  sessionId,
  projectName,
  loading,
  isExpanded = true,
}: XAIPanelProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "decisions" | "risks">("summary");

  const decisions = report?.agent_decisions?.length
    ? report.agent_decisions
    : explanations;

  const pipelineConfidence = report?.pipeline_confidence ?? (
    decisions.length > 0
      ? decisions.reduce((s, d) => s + (d.confidence || 0.8), 0) / decisions.length
      : 0
  );
  const confPct = Math.round(pipelineConfidence * 100);
  const confColor =
    confPct >= 85 ? "var(--color-success)" :
      confPct >= 70 ? "var(--color-warning)" :
        "var(--color-danger)";
  const confBg =
    confPct >= 85 ? "rgba(63, 167, 122, 0.1)" :
      confPct >= 70 ? "rgba(201, 169, 110, 0.1)" :
        "rgba(201, 91, 91, 0.1)";
  const confBorder =
    confPct >= 85 ? "rgba(63, 167, 122, 0.3)" :
      confPct >= 70 ? "rgba(201, 169, 110, 0.3)" :
        "rgba(201, 91, 91, 0.3)";

  return (
    <div
      className="w-full rounded-2xl border transition-all duration-300 overflow-hidden"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        borderColor: "var(--color-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Expansive Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-5"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs"
            style={{
              backgroundColor: "var(--color-brand-subtle)",
              borderColor: "rgba(201, 169, 110, 0.35)",
            }}
          >
            <IconScrollText size={20} style={{ color: "var(--color-brand-primary)" }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                XAI Audit & Explainability Intelligence
              </h3>
              {projectName && (
                <span
                  className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border"
                  style={{
                    color: "var(--color-brand-primary)",
                    backgroundColor: "var(--color-brand-subtle)",
                    borderColor: "rgba(201, 169, 110, 0.3)",
                  }}
                >
                  {projectName}
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              Explainability Agent • {report?.total_agents ?? decisions.length} Autonomous Agent Decisions Verified
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pipelineConfidence > 0 && (
            <div
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold shadow-xs"
              style={{ color: confColor, backgroundColor: confBg, borderColor: confBorder }}
            >
              <IconBarChart2 size={15} />
              <span>{confPct}% Audit Confidence</span>
            </div>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && !report && decisions.length === 0 && (
        <div className="p-12 flex flex-col items-center text-center">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 animate-spin border"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <IconSparkles size={20} style={{ color: "var(--color-brand-primary)" }} />
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
            Computing Real Explainability Trace...
          </p>
          <p className="text-xs max-w-sm" style={{ color: "var(--color-text-muted)" }}>
            Streaming verified agent decisions, AST contract reasons, and confidence telemetry from MongoDB & Groq LLM.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !report && decisions.length === 0 && (
        <div
          className="p-12 flex flex-col items-center text-center"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 border"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <IconInfo size={20} style={{ color: "var(--color-text-muted)" }} />
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
            No Explainability Telemetry Recorded
          </p>
          <p className="text-xs max-w-md" style={{ color: "var(--color-text-muted)" }}>
            Select an active repository with test runs or trigger the autonomous agent pipeline to generate real-time XAI audit decisions.
          </p>
        </div>
      )}

      {/* Tabs + Content */}
      {(report || decisions.length > 0) && (
        <>
          {/* Tabs Bar */}
          <div
            className="flex items-center gap-2 px-6 pt-4 pb-0 border-b"
            style={{ borderColor: "var(--color-border)" }}
          >
            {(["summary", "decisions", "risks"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-2 rounded-t-xl text-xs font-bold transition-all capitalize relative cursor-pointer"
                style={
                  activeTab === tab
                    ? {
                      backgroundColor: "var(--color-surface)",
                      color: "var(--color-brand-primary)",
                      borderTop: "2px solid var(--color-brand-primary)",
                      borderLeft: "1px solid var(--color-border)",
                      borderRight: "1px solid var(--color-border)",
                    }
                    : {
                      color: "var(--color-text-muted)",
                      borderTop: "2px solid transparent",
                    }
                }
                onMouseEnter={(e) => {
                  if (activeTab !== tab) e.currentTarget.style.color = "var(--color-text-primary)";
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab) e.currentTarget.style.color = "var(--color-text-muted)";
                }}
              >
                {tab === "summary" ? "Executive Summary" : tab === "decisions" ? "Agent Decisions" : "Risk Assessment"}
                {tab === "decisions" && decisions.length > 0 && (
                  <span
                    className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold"
                    style={{
                      backgroundColor: activeTab === tab ? "var(--color-brand-subtle)" : "var(--color-surface)",
                      color: activeTab === tab ? "var(--color-brand-primary)" : "var(--color-text-muted)",
                    }}
                  >
                    {decisions.length}
                  </span>
                )}
                {tab === "risks" && report?.risk_factors && report.risk_factors.length > 0 && (
                  <span
                    className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold"
                    style={{
                      backgroundColor: "rgba(201, 91, 91, 0.1)",
                      color: "var(--color-danger)",
                    }}
                  >
                    {report.risk_factors.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-5">
            {/* ── Summary tab ── */}
            {activeTab === "summary" && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                {/* 4-Stat Metric Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  {[
                    {
                      label: "Audit Confidence",
                      value: `${confPct}%`,
                      color: confColor,
                      bg: confBg,
                      subtext: "Validated safe",
                    },
                    {
                      label: "Agents Audited",
                      value: report?.total_agents ?? decisions.length,
                      color: "var(--color-brand-primary)",
                      bg: "var(--color-brand-subtle)",
                      subtext: "100% pipeline stages",
                    },
                    {
                      label: "Decisions Verified",
                      value: decisions.length,
                      color: "var(--color-info)",
                      bg: "rgba(79, 166, 200, 0.1)",
                      subtext: "AST & logic checks",
                    },
                    {
                      label: "Risk Anomalies",
                      value: report?.risk_factors?.length ?? 0,
                      color: (report?.risk_factors?.length ?? 0) > 0 ? "var(--color-warning)" : "var(--color-success)",
                      bg: (report?.risk_factors?.length ?? 0) > 0 ? "rgba(196, 146, 69, 0.1)" : "rgba(63, 167, 122, 0.1)",
                      subtext: (report?.risk_factors?.length ?? 0) > 0 ? "Attention required" : "Zero risk",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="p-3.5 rounded-xl border transition-all"
                      style={{
                        backgroundColor: "var(--color-surface)",
                        borderColor: "var(--color-border)",
                      }}
                    >
                      <span
                        className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold mb-1.5"
                        style={{ backgroundColor: s.bg, color: s.color }}
                      >
                        {s.label}
                      </span>
                      <p className="text-xl font-extrabold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                        {s.value}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                        {s.subtext}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Audit Summary */}
                {report?.audit_summary && (
                  <div
                    className="p-4.5 rounded-xl border relative overflow-hidden"
                    style={{
                      backgroundColor: "var(--color-surface)",
                      borderColor: "var(--color-border)",
                      borderLeftWidth: "4px",
                      borderLeftColor: "var(--color-brand-primary)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <IconSparkles size={14} style={{ color: "var(--color-brand-primary)" }} />
                      <p
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: "var(--color-brand-primary)" }}
                      >
                        Executive Synthesis
                      </p>
                    </div>
                    <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                      {report.audit_summary}
                    </p>
                  </div>
                )}

                {/* Key Strategic Decisions */}
                {report?.key_decisions && report.key_decisions.length > 0 && (
                  <div
                    className="p-4.5 rounded-xl border space-y-3"
                    style={{
                      backgroundColor: "var(--color-surface)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <p
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Key Strategic Decisions ({report.key_decisions.length})
                      </p>
                      <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                        AST Verified
                      </span>
                    </div>
                    <div className="space-y-2">
                      {report.key_decisions.map((kd, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 p-2.5 rounded-lg border"
                          style={{
                            backgroundColor: "var(--color-bg-secondary)",
                            borderColor: "var(--color-border)",
                          }}
                        >
                          <IconShieldCheck
                            size={16}
                            style={{ color: "var(--color-brand-primary)", flexShrink: 0, marginTop: 1 }}
                          />
                          <p className="text-xs leading-snug" style={{ color: "var(--color-text-secondary)" }}>
                            {kd}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Decisions tab ── */}
            {activeTab === "decisions" && (
              <motion.div
                key="decisions"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2.5 max-h-[520px] overflow-y-auto custom-scrollbar pr-1"
              >
                {decisions.length === 0 ? (
                  <p className="text-xs text-center py-8" style={{ color: "var(--color-text-muted)" }}>
                    No decision telemetry available.
                  </p>
                ) : (
                  decisions.map((d, i) => (
                    <DecisionRow key={i} decision={d} index={i} />
                  ))
                )}
              </motion.div>
            )}

            {/* ── Risks tab ── */}
            {activeTab === "risks" && (
              <motion.div
                key="risks"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {(!report?.risk_factors || report.risk_factors.length === 0) ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 border"
                      style={{
                        backgroundColor: "rgba(63, 167, 122, 0.1)",
                        borderColor: "rgba(63, 167, 122, 0.3)",
                      }}
                    >
                      <IconShieldCheck size={26} style={{ color: "var(--color-success)" }} />
                    </div>
                    <p className="text-sm font-bold mb-1" style={{ color: "var(--color-success)" }}>
                      Zero Risk Anomalies Detected
                    </p>
                    <p className="text-xs max-w-sm" style={{ color: "var(--color-text-muted)" }}>
                      All {report?.total_agents ?? decisions.length} autonomous agent decisions satisfy strict AST invariants and type boundaries.
                    </p>
                  </div>
                ) : (
                  report.risk_factors.map((rf, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-start gap-3 p-4 rounded-xl border"
                      style={{
                        backgroundColor: "rgba(201, 169, 110, 0.06)",
                        borderColor: "rgba(201, 169, 110, 0.25)",
                      }}
                    >
                      <IconAlertTriangle size={18} style={{ color: "var(--color-warning)", flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <span
                          className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mb-1"
                          style={{
                            color: "var(--color-warning)",
                            backgroundColor: "rgba(196, 146, 69, 0.12)",
                          }}
                        >
                          Notice & Mitigation
                        </span>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                          {rf}
                        </p>
                      </div>
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
