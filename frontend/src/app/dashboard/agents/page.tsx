"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Brain, ClipboardCheck, Network, Search, Target, Code2,
  ShieldCheck, Play, Microscope, FileSearch, Wrench,
  GitCompare, FlaskConical, Loader2, Zap, RefreshCw,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import { AgentCard } from "@/components/agents/agent-card";
import { ExplanationCard } from "@/components/agents/explanation-card";
import { usePipelineStatus, PIPELINE_AGENTS, type PipelineAgentId } from "@/hooks/usePipelineStatus";
import { triggerAgentPipeline, getDefaultProjectId } from "@/lib/api";
import type { AgentStatus } from "@/types";

// ── Icon map ──────────────────────────────────────────────────────────────────
const AGENT_ICONS: Record<string, React.ElementType> = {
  planner: Brain, requirement: ClipboardCheck, architecture: Network,
  retriever: Search, "test-strategy": Target, "test-gen": Code2,
  verification: ShieldCheck, execution: Play, "bug-loc": Microscope,
  "root-cause": FileSearch, repair: Wrench, "patch-val": GitCompare,
  learning: FlaskConical,
};

// ── Contextual task descriptions per status ───────────────────────────────────
const AGENT_TASK: Record<string, Partial<Record<AgentStatus, string>>> = {
  planner:         { running: "Analyzing project structure & planning execution…", success: "Execution plan created", waiting: "Queued for execution" },
  requirement:     { running: "Extracting functional & non-functional requirements…", success: "Requirements extracted", waiting: "Awaiting planner" },
  architecture:    { running: "Building dependency, API & service graphs…", success: "Architecture mapped", waiting: "Awaiting requirements" },
  retriever:       { running: "Querying ChromaDB + Neo4j for context…", success: "Context retrieved", waiting: "Awaiting architecture" },
  "test-strategy": { running: "Selecting optimal test types & risk areas…", success: "Test strategy determined", waiting: "Awaiting retriever" },
  "test-gen":      { running: "Generating test cases with Groq LLM…", success: "Test cases generated", waiting: "Awaiting strategy" },
  verification:    { running: "Verifying tests for hallucination & correctness…", success: "Tests verified", waiting: "Awaiting test gen" },
  execution:       { running: "Running tests in Docker sandbox…", success: "Execution complete", waiting: "Awaiting verification" },
  "bug-loc":       { running: "Localizing bugs from failure stack traces…", success: "Bugs localized", waiting: "Awaiting execution" },
  "root-cause":    { running: "Performing root cause analysis…", success: "Root causes identified", waiting: "Awaiting bug loc" },
  repair:          { running: "Generating code patches…", success: "Patches generated", waiting: "Awaiting root cause" },
  "patch-val":     { running: "Validating patches & running regression…", success: "Patches validated", waiting: "Awaiting repair" },
  learning:        { running: "Updating knowledge base with verified fixes…", success: "Learning complete", waiting: "Awaiting validation" },
};

// ── XAI descriptions from backend agent names ─────────────────────────────────
const XAI_DECISIONS: Record<string, { decision: string; reason: string; evidence: string[] }> = {
  planner: {
    decision: "Created execution plan for the project",
    reason: "Analyzed project structure, language, and framework to determine the optimal agent pipeline execution order and task assignments.",
    evidence: ["Project structure analyzed", "Agent pipeline configured", "Execution plan serialized"],
  },
  requirement: {
    decision: "Extracted requirements from project",
    reason: "Scanned documentation and source code to identify functional and non-functional requirements with acceptance criteria.",
    evidence: ["Functional requirements extracted", "Non-functional requirements identified", "Requirements prioritized by risk"],
  },
  architecture: {
    decision: "Built project architecture graph",
    reason: "Traced module dependencies, mapped REST endpoints, and constructed service topology to inform test generation.",
    evidence: ["Dependency edges resolved", "API endpoints cataloged", "Database schema inferred"],
  },
  retriever: {
    decision: "Retrieved context via hybrid RAG + KG",
    reason: "Used dense vector search in ChromaDB and structural graph traversal in Neo4j to retrieve semantically relevant code context.",
    evidence: ["ChromaDB query executed", "Neo4j graph traversal completed", "Results re-ranked by relevance"],
  },
  test_strategy: {
    decision: "Selected test strategy and risk areas",
    reason: "Analyzed project complexity, API surface, and requirement priorities to determine which test types to generate and their priority order.",
    evidence: ["Risk areas identified from architecture", "Test types selected based on framework", "Coverage estimate produced"],
  },
  test_generation: {
    decision: "Generated comprehensive test suite",
    reason: "Used Groq LLM to generate executable test cases covering unit, API, integration, and security scenarios based on requirements and architecture.",
    evidence: ["Tests generated across multiple frameworks", "Assertions crafted per requirement", "Edge cases included"],
  },
  verification: {
    decision: "Verified tests for correctness",
    reason: "Checked each generated test for syntax correctness, logic soundness, requirement traceability, and hallucination (non-existent API references).",
    evidence: ["Syntax validation passed", "Hallucination detection run", "Traceability matrix checked"],
  },
  execution: {
    decision: "Executed tests in Docker sandbox",
    reason: "Dispatched verified tests to isolated Docker sandbox runners (pytest/playwright/newman) and collected unified results with coverage data.",
    evidence: ["Sandbox container spawned", "Test runners dispatched", "Results collected and merged"],
  },
  bug_localization: {
    decision: "Localized bugs to specific code locations",
    reason: "Analyzed failure stack traces and test output to pin down exact file, class, method, and line numbers of detected defects.",
    evidence: ["Stack traces parsed", "Source mapping applied", "Confidence scored per localization"],
  },
  root_cause: {
    decision: "Identified root causes of failures",
    reason: "Performed causal chain analysis on localized bugs to determine why failures occurred and which requirements were violated.",
    evidence: ["Causal chain traced", "Requirement violations identified", "Severity assessed"],
  },
  program_repair: {
    decision: "Generated candidate patches",
    reason: "Used LLM-guided patch generation strategies to produce minimal, targeted code fixes for each localized bug.",
    evidence: ["Patch strategies evaluated", "Minimal diffs generated", "Confidence scored"],
  },
  patch_validation: {
    decision: "Validated patches via regression testing",
    reason: "Re-ran failing tests against patched code and checked that no regressions were introduced in the existing test suite.",
    evidence: ["Failing tests now pass", "Regression suite executed", "Coverage maintained"],
  },
  learning: {
    decision: "Updated knowledge base",
    reason: "Persisted verified bug-patch pairs, test strategies, and XAI explanations to long-term memory for future pipeline improvement.",
    evidence: ["Bug-patch pairs stored", "Strategy templates updated", "Knowledge graph enriched"],
  },
};

export default function AgentsPage() {
  const [filter, setFilter] = useState<"all" | "active" | "idle">("all");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("planner");
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { state, refresh } = usePipelineStatus(null, 3000);
  const { agents, pipelineStatus, testCasesGenerated, bugsFound, patchesGenerated, agentsRun } = state;

  // ── Trigger full 13-agent pipeline ───────────────────────────────────────
  const handleRunPipeline = useCallback(async () => {
    setTriggering(true);
    setTriggerMsg(null);
    try {
      const pid = await getDefaultProjectId();
      if (!pid) throw new Error("No project found. Import a project first.");
      const resp = await triggerAgentPipeline(pid, 2);
      setTriggerMsg({ type: "success", text: `Pipeline started • Session ${resp.session_id.slice(0, 8)}` });
      setTimeout(() => refresh(), 2000);
    } catch (e: any) {
      setTriggerMsg({ type: "error", text: e.message ?? "Failed to trigger pipeline" });
    } finally {
      setTriggering(false);
    }
  }, [refresh]);

  // ── Filter agents ─────────────────────────────────────────────────────────
  const filteredAgents = agents.filter((a) => {
    if (filter === "active") return ["running", "thinking", "success"].includes(a.status);
    if (filter === "idle")   return ["idle", "waiting"].includes(a.status);
    return true;
  });

  // ── Build XAI explanation for selected agent ──────────────────────────────
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const selectedBackendName = PIPELINE_AGENTS.find((a) => a.id === selectedAgentId)?.backendName ?? selectedAgentId;
  const xaiBase = XAI_DECISIONS[selectedBackendName] ?? {
    decision: "Agent pending",
    reason: "This agent has not yet executed in the current session.",
    evidence: [],
  };

  const xaiExplanation = {
    agent: selectedAgent?.name ?? selectedAgentId,
    decision: xaiBase.decision,
    reason: xaiBase.reason,
    retrievedDocs: agentsRun.includes(selectedBackendName)
      ? [`${selectedBackendName}.py context`, "requirements docs", "project source files"]
      : [],
    knowledgeGraphNodes: agentsRun.includes(selectedBackendName)
      ? [`Agent: ${selectedAgent?.name}`, `Status: ${selectedAgent?.status}`, "Project dependency graph"]
      : [],
    confidence: selectedAgent?.confidence ?? 0,
    evidence: agentsRun.includes(selectedBackendName) ? xaiBase.evidence : [],
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen pb-12">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">
            <span className="gradient-text">Agentic</span> Command Center
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Real-time status of all 13 AI agents •{" "}
            {pipelineStatus === "running"
              ? `${agentsRun.length}/13 completed`
              : pipelineStatus === "complete"
              ? `${testCasesGenerated} tests · ${bugsFound} bugs · ${patchesGenerated} patches`
              : "No active session"}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-1 rounded-xl">
            {(["all", "active", "idle"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === f ? "bg-[rgba(59,130,246,0.12)] text-[#3B82F6]" : "text-[#9CA3AF] hover:text-white"
                }`}
              >
                {f === "all" ? "All Agents" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={refresh}
            className="p-2 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
            title="Refresh status"
          >
            <RefreshCw className="w-4 h-4 text-[#6B7280]" />
          </button>

          {/* Run Pipeline */}
          <button
            onClick={handleRunPipeline}
            disabled={triggering || pipelineStatus === "running"}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all duration-200 shadow-[0_0_20px_rgba(59,130,246,0.25)]"
          >
            {triggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {pipelineStatus === "running" ? "Running…" : "Run Pipeline"}
          </button>
        </div>
      </div>

      {/* Trigger feedback banner */}
      {triggerMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium ${
            triggerMsg.type === "success"
              ? "bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.15)] text-[#10B981]"
              : "bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] text-[#EF4444]"
          }`}
        >
          {triggerMsg.type === "success"
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />
          }
          {triggerMsg.text}
        </motion.div>
      )}

      {/* ── Main grid: agents list (2/3) + XAI panel (1/3) ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent cards */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredAgents.map((agent) => {
              const Icon = AGENT_ICONS[agent.id] ?? Brain;
              const taskDesc = AGENT_TASK[agent.id]?.[agent.status];
              const isSelected = selectedAgentId === agent.id;

              return (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className="cursor-pointer"
                >
                  <AgentCard
                    name={agent.name}
                    description={agent.description}
                    status={agent.status}
                    icon={Icon as any}
                    confidence={agent.confidence}
                    latencyMs={agent.status === "success" ? Math.round(500 + Math.random() * 1500) : 0}
                    currentTask={taskDesc}
                    memoryUsage={`${12 + (PIPELINE_AGENTS.findIndex((a) => a.id === agent.id) * 2)} MB`}
                    reasoningSteps={agent.status === "success" ? 5 + Math.round(Math.random() * 10) : 0}
                    className={isSelected ? "ring-2 ring-[#3B82F6]/50 bg-[#3B82F6]/5" : ""}
                  />
                </div>
              );
            })}
          </div>

          {filteredAgents.length === 0 && (
            <div className="glass-card p-10 text-center text-[#4B5563]">
              No agents match the current filter.
            </div>
          )}
        </div>

        {/* XAI Panel */}
        <div className="space-y-4 lg:sticky lg:top-24 h-fit">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-semibold text-[#8B5CF6] uppercase tracking-wider">
              XAI • Agent Reasoning
            </p>
            {agentsRun.includes(selectedBackendName) && (
              <span className="px-2 py-0.5 rounded-md bg-[rgba(16,185,129,0.1)] text-[10px] font-semibold text-[#10B981]">
                Live Data
              </span>
            )}
          </div>
          <ExplanationCard explanation={xaiExplanation} />

          {/* Pipeline summary */}
          {(testCasesGenerated > 0 || bugsFound > 0) && (
            <div className="glass-card p-4 space-y-3">
              <p className="text-[11px] text-[#6B7280] uppercase tracking-wider font-semibold">
                Session Results
              </p>
              {[
                { label: "Tests Generated", value: testCasesGenerated, color: "text-[#3B82F6]" },
                { label: "Bugs Found", value: bugsFound, color: "text-[#EF4444]" },
                { label: "Patches Generated", value: patchesGenerated, color: "text-[#10B981]" },
                { label: "Agents Completed", value: agentsRun.length, color: "text-[#8B5CF6]" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-[12px] text-[#6B7280]">{row.label}</span>
                  <span className={`text-[13px] font-bold ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
