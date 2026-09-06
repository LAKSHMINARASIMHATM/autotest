"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconFlask, IconFileCode, IconCode, IconRefreshCw, IconZap,
  IconCheckCircle, IconAlertCircle, IconLoader, IconBrain, IconClipboardCheck,
  IconNetwork, IconTarget, IconPlay, IconBug, IconWrench, IconShield,
  IconSearch, IconCpu, IconChevronRight, IconClose,
} from "@/components/icons";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  getProjectTestCases, getDefaultProjectId, triggerAgentPipeline,
  getPipelineStatus, type TestCaseItem,
} from "@/lib/api";

// ── All 12 agents in the full pipeline ───────────────────────────────────────
const ALL_AGENTS = [
  { key: "planner",        label: "Planner",          icon: IconBrain,         phase: "analyze" },
  { key: "requirement",    label: "Requirement",       icon: IconClipboardCheck, phase: "analyze" },
  { key: "architecture",   label: "Architecture",      icon: IconNetwork,       phase: "analyze" },
  { key: "test_strategy",  label: "Test Strategy",     icon: IconTarget,        phase: "generate" },
  { key: "test_generation",label: "Test Generator",    icon: IconCode,          phase: "generate" },
  { key: "verification",   label: "Verification",      icon: IconShield,        phase: "generate" },
  { key: "execution",      label: "Execution",         icon: IconPlay,          phase: "execute" },
  { key: "bug_localization",label: "Bug Localization",  icon: IconBug,           phase: "repair" },
  { key: "root_cause",     label: "Root Cause",        icon: IconSearch,        phase: "repair" },
  { key: "program_repair", label: "Program Repair",    icon: IconWrench,        phase: "repair" },
  { key: "patch_validation",label: "Patch Validation", icon: IconShield,        phase: "repair" },
  { key: "learning",       label: "Learning",          icon: IconFlask,         phase: "learn"  },
];

const PHASE_COLORS: Record<string, string> = {
  analyze:  "text-[var(--color-brown-primary)]",
  generate: "text-[var(--color-brown-secondary)]",
  execute:  "text-[var(--color-warning)]",
  repair:   "text-[var(--color-danger)]",
  learn:    "text-[var(--color-success)]",
};

type GenStatus = "idle" | "running" | "complete" | "error";

export default function TestsPage() {
  const router = useRouter();

  const [testCases, setTestCases]       = useState<TestCaseItem[]>([]);
  const [selectedCase, setSelectedCase] = useState<TestCaseItem | null>(null);
  const [loading, setLoading]           = useState(true);
  const [fetchError, setFetchError]     = useState<string | null>(null);

  // Pipeline state
  const [genStatus, setGenStatus]       = useState<GenStatus>("idle");
  const [genSessionId, setGenSessionId] = useState<string | null>(null);
  const [agentsRun, setAgentsRun]       = useState<string[]>([]);
  const [genTestCount, setGenTestCount] = useState(0);
  const [bugsFound, setBugsFound]       = useState(0);
  const [patchesGen, setPatchesGen]     = useState(0);
  const [genError, setGenError]         = useState<string | null>(null);
  const [projectId, setProjectId]       = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load test cases ────────────────────────────────────────────────────────
  const fetchTestCases = useCallback(async (pid?: string | null) => {
    setLoading(true);
    setFetchError(null);
    try {
      const id = pid ?? projectId ?? await getDefaultProjectId();
      if (!id) throw new Error("No projects found. Import a GitHub repository first.");
      if (!projectId) setProjectId(id);
      const cases = await getProjectTestCases(id);
      setTestCases(cases);
      if (cases.length > 0 && !selectedCase) setSelectedCase(cases[0]);
    } catch (e: unknown) {
      setFetchError(e instanceof Error ? e.message : "Failed to load test cases");
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedCase]);

  useEffect(() => { fetchTestCases(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Poll session until done ────────────────────────────────────────────────
  const startPolling = useCallback((sid: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const resp = await getPipelineStatus(sid);
        setAgentsRun(resp.agents_run ?? []);
        if (resp.status === "complete") {
          clearInterval(pollRef.current!);
          setGenStatus("complete");
          setGenTestCount(resp.test_cases_generated ?? 0);
          setBugsFound(resp.bugs_found ?? 0);
          setPatchesGen(resp.patches_generated ?? 0);
          // Refresh the test list after a short delay
          setTimeout(() => fetchTestCases(), 1500);
        } else if (resp.status === "error") {
          clearInterval(pollRef.current!);
          setGenStatus("error");
          setGenError((resp as any).error ?? "Pipeline failed");
        }
      } catch { /* keep polling */ }
    }, 2500);
  }, [fetchTestCases]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── Trigger full 13-agent pipeline ────────────────────────────────────────
  const handleRunPipeline = useCallback(async () => {
    setGenStatus("running");
    setGenError(null);
    setAgentsRun([]);
    setGenTestCount(0);
    setBugsFound(0);
    setPatchesGen(0);
    try {
      const pid = projectId ?? await getDefaultProjectId();
      if (!pid) throw new Error("No project found. Import a GitHub repository first.");
      setProjectId(pid);
      const resp = await triggerAgentPipeline(pid, 2);
      setGenSessionId(resp.session_id);
      startPolling(resp.session_id);
    } catch (e: any) {
      setGenStatus("error");
      setGenError(e.message ?? "Failed to trigger pipeline");
    }
  }, [projectId, startPolling]);

  const dismissPanel = () => {
    setGenStatus("idle");
    setGenSessionId(null);
    setAgentsRun([]);
    setGenTestCount(0);
    setBugsFound(0);
    setPatchesGen(0);
    setGenError(null);
    if (pollRef.current) clearInterval(pollRef.current);
  };

  // ── Compute per-agent status ───────────────────────────────────────────────
  const ranSet = new Set(agentsRun);
  const lastDoneIdx = ALL_AGENTS.reduce((acc, a, i) => ranSet.has(a.key) ? i : acc, -1);
  const progressPct = Math.max(4, (agentsRun.length / ALL_AGENTS.length) * 100);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen pb-12">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            <span className="gradient-text">Test</span> Suites
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            {testCases.length > 0
              ? `${testCases.length} test case${testCases.length !== 1 ? "s" : ""} generated`
              : "Run the 13-agent pipeline to generate & execute test cases"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => fetchTestCases()}
            disabled={loading}
            className="gap-2 text-xs"
          >
            <IconRefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button
            onClick={handleRunPipeline}
            disabled={genStatus === "running"}
            className="gap-2 text-[13px] font-semibold shadow-md"
          >
            {genStatus === "running"
              ? <><IconLoader size={16} className="animate-spin" /> Running Pipeline…</>
              : <><IconZap size={16} /> Run 13-Agent Pipeline</>
            }
          </Button>
        </div>
      </div>

      {/* ── Fetch error ────────────────────────────────────────────────────── */}
      {fetchError && (
        <div className="bg-[rgba(139,26,26,0.1)] border border-[rgba(139,26,26,0.3)] text-[var(--color-danger)] text-sm px-4 py-3 rounded-xl">
          {fetchError}
        </div>
      )}

      {/* ── Pipeline progress panel ───────────────────────────────────────── */}
      <AnimatePresence>
        {genStatus !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard className="p-5">
              {/* Panel header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  {genStatus === "running"  && <IconLoader size={16} className="text-[var(--color-brown-primary)] animate-spin" />}
                  {genStatus === "complete" && <IconCheckCircle size={16} className="text-[var(--color-success)]" />}
                  {genStatus === "error"    && <IconAlertCircle size={16} className="text-[var(--color-danger)]" />}
                  <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {genStatus === "running"  && `Running 13-agent pipeline… (${agentsRun.length}/${ALL_AGENTS.length} agents done)`}
                    {genStatus === "complete" && "Pipeline complete"}
                    {genStatus === "error"    && "Pipeline failed"}
                  </span>
                  {genSessionId && (
                    <span className="text-[10px] font-mono" style={{ color: "var(--color-text-muted)" }}>
                      #{genSessionId.slice(0, 8)}
                    </span>
                  )}
                </div>
                <button
                  onClick={dismissPanel}
                  className="p-1 rounded-lg hover:bg-[rgba(107,79,47,0.1)] transition-colors cursor-pointer"
                >
                  <IconClose size={16} style={{ color: "var(--color-text-muted)" }} />
                </button>
              </div>

              {genError && (
                <p className="text-xs text-[var(--color-danger)] mb-3 px-1">{genError}</p>
              )}

              {/* Results row — visible after completion */}
              {genStatus === "complete" && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap items-center gap-4 mb-4 p-3.5 rounded-xl bg-[rgba(46,107,62,0.06)] border border-[rgba(46,107,62,0.2)]"
                >
                  <div className="flex items-center gap-1.5 text-sm">
                    <IconFlask size={16} className="text-[var(--color-brown-primary)]" />
                    <span className="font-bold text-[var(--color-brown-primary)]">{genTestCount}</span>
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>tests generated</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <IconBug size={16} className="text-[var(--color-danger)]" />
                    <span className="font-bold text-[var(--color-danger)]">{bugsFound}</span>
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>bugs reported</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <IconWrench size={16} className="text-[var(--color-brown-secondary)]" />
                    <span className="font-bold text-[var(--color-brown-secondary)]">{patchesGen}</span>
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>patches generated</span>
                  </div>
                  {bugsFound > 0 && (
                    <Button
                      onClick={() => router.push("/dashboard/bugs")}
                      className="ml-auto gap-1.5 text-xs bg-[rgba(139,26,26,0.1)] hover:bg-[rgba(139,26,26,0.2)] text-[var(--color-danger)] border border-[rgba(139,26,26,0.2)]"
                      variant="secondary"
                    >
                      <IconBug size={14} />
                      View in Bug Tracker
                      <IconChevronRight size={14} />
                    </Button>
                  )}
                </motion.div>
              )}

              {/* 13 agent steps — grouped by phase */}
              <div className="space-y-2">
                {(["analyze", "generate", "execute", "repair", "learn"] as const).map((phase) => {
                  const phaseAgents = ALL_AGENTS.filter(a => a.phase === phase);
                  const phaseLabels: Record<string, string> = {
                    analyze:  "① Analyze",
                    generate: "② Generate",
                    execute:  "③ Execute",
                    repair:   "④ Repair",
                    learn:    "⑤ Learn",
                  };
                  return (
                    <div key={phase} className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-widest w-16 shrink-0 ${PHASE_COLORS[phase]}`}>
                        {phaseLabels[phase]}
                      </span>
                      {phaseAgents.map((agent, i) => {
                        const globalIdx = ALL_AGENTS.findIndex(a => a.key === agent.key);
                        const done    = ranSet.has(agent.key);
                        const active  = !done && globalIdx === lastDoneIdx + 1 && genStatus === "running";
                        const Icon    = agent.icon;

                        return (
                          <div key={agent.key} className="flex items-center gap-1">
                            <div
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-300 ${
                                done    ? "bg-[rgba(46,107,62,0.1)] text-[var(--color-success)] border border-[rgba(46,107,62,0.3)]"  :
                                active  ? `bg-[rgba(107,79,47,0.1)] ${PHASE_COLORS[phase]} border border-[rgba(107,79,47,0.3)]` :
                                "bg-[rgba(107,79,47,0.03)] text-[var(--color-text-muted)] border border-[var(--color-border)]"
                              }`}
                            >
                              {active
                                ? <IconLoader size={12} className="animate-spin" />
                                : <Icon size={12} />
                              }
                              {agent.label}
                              {done && <IconCheckCircle size={12} />}
                            </div>
                            {i < phaseAgents.length - 1 && (
                              <div className={`w-3 h-px ${done ? "bg-[rgba(46,107,62,0.3)]" : "bg-[var(--color-border)]"}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Progress bar */}
              {genStatus === "running" && (
                <div className="mt-4 h-1 rounded-full bg-[var(--color-border)] overflow-hidden">
                  <motion.div
                    className="h-full bg-[var(--color-brown-primary)] rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: test list */}
        <div className="lg:col-span-1 space-y-4">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                Generated Tests
              </h3>
              {testCases.length > 0 && (
                <span className="text-[10px] font-semibold text-[var(--color-brown-primary)] bg-[rgba(107,79,47,0.1)] px-2 py-0.5 rounded-md">
                  {testCases.length}
                </span>
              )}
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-[rgba(107,79,47,0.06)] animate-pulse" />
                ))}
              </div>
            ) : testCases.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <IconFlask size={32} className="mx-auto text-[var(--color-brown-primary)] opacity-40" />
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>No test cases yet.</p>
                <button
                  onClick={handleRunPipeline}
                  disabled={genStatus === "running"}
                  className="text-xs font-semibold text-[var(--color-brown-primary)] hover:underline cursor-pointer"
                >
                  Run pipeline now →
                </button>
              </div>
            ) : (
              <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
                {testCases.map((tc) => (
                  <button
                    key={tc.id}
                    onClick={() => setSelectedCase(tc)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                      selectedCase?.id === tc.id
                        ? "bg-[rgba(107,79,47,0.12)] border-[rgba(107,79,47,0.3)] text-[var(--color-brown-primary)]"
                        : "bg-transparent border-transparent text-[var(--color-text-secondary)] hover:bg-[rgba(107,79,47,0.04)]"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        selectedCase?.id === tc.id
                          ? "bg-[rgba(107,79,47,0.15)] text-[var(--color-brown-primary)]"
                          : "bg-[rgba(107,79,47,0.06)] text-[var(--color-text-muted)]"
                      }`}
                    >
                      <IconFileCode size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>{tc.name}</p>
                      <p className="text-[11px] font-mono truncate" style={{ color: "var(--color-text-muted)" }}>{tc.file}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Stats card */}
          {selectedCase && (
            <GlassCard className="p-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                Suite Overview
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Assertions", value: selectedCase.assertions,                               color: "var(--color-text-primary)" },
                  { label: "Confidence", value: `${(selectedCase.confidence * 100).toFixed(0)}%`,     color: "var(--color-text-primary)" },
                  { label: "Pass Rate",  value: `${selectedCase.pass_rate}%`,                          color: "var(--color-success)" },
                  { label: "Framework",  value: selectedCase.framework.toUpperCase(),                  color: "var(--color-warning)" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <span className="text-[10px] block" style={{ color: "var(--color-text-muted)" }}>{label}</span>
                    <span className="text-lg font-bold" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>

        {/* Right column: code viewer */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6 h-full flex flex-col min-h-[400px]">
            {selectedCase ? (
              <>
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--color-border)]">
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>{selectedCase.name}</h3>
                    <span className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>{selectedCase.file}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-[rgba(46,107,62,0.1)] text-[var(--color-success)] px-2 py-0.5 rounded-md border border-[rgba(46,107,62,0.2)]">
                      {selectedCase.framework}
                    </span>
                    <span className="text-xs bg-[rgba(107,79,47,0.1)] text-[var(--color-brown-primary)] px-2 py-0.5 rounded-md border border-[rgba(107,79,47,0.2)]">
                      {(selectedCase.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                </div>
                <div className="flex-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-4 font-mono text-[12px] leading-relaxed overflow-auto" style={{ color: "var(--color-text-secondary)" }}>
                  {(selectedCase.code || "# No code available").split("\n").map((line, idx) => (
                    <div key={idx} className="table-row">
                      <span className="table-cell text-right pr-4 select-none opacity-40 text-xs w-8" style={{ color: "var(--color-text-muted)" }}>{idx + 1}</span>
                      <span className="table-cell whitespace-pre">{line || " "}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : !loading && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[rgba(107,79,47,0.08)] border border-[rgba(107,79,47,0.15)] flex items-center justify-center">
                  <IconCpu size={32} className="text-[var(--color-brown-primary)] opacity-60" />
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>No test cases yet</p>
                  <p className="text-xs max-w-xs" style={{ color: "var(--color-text-muted)" }}>
                    Click <strong className="text-[var(--color-brown-primary)]">Run 13-Agent Pipeline</strong> to generate tests,
                    execute them, and auto-report failures to the Bug Tracker.
                  </p>
                </div>
                <Button onClick={handleRunPipeline} disabled={genStatus === "running"} className="gap-2">
                  <IconZap size={16} /> Run 13-Agent Pipeline
                </Button>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
