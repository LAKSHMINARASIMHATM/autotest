"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical, FileCode, Code2, RefreshCw, Zap,
  CheckCircle2, AlertCircle, Loader2, Brain, ClipboardCheck,
  Network, Target, Play, Bug, Wrench, Shield, BookOpen,
  Search, Cpu, TestTube, ChevronRight, X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  getProjectTestCases, getDefaultProjectId, triggerAgentPipeline,
  getPipelineStatus, type TestCaseItem,
} from "@/lib/api";

// ── All 13 agents in the full pipeline ───────────────────────────────────────
const ALL_AGENTS = [
  { key: "planner",        label: "Planner",          icon: Brain,         phase: "analyze" },
  { key: "requirement",    label: "Requirement",       icon: ClipboardCheck, phase: "analyze" },
  { key: "architecture",   label: "Architecture",      icon: Network,       phase: "analyze" },
  { key: "retriever",      label: "Retriever",         icon: Search,        phase: "analyze" },
  { key: "test_strategy",  label: "Test Strategy",     icon: Target,        phase: "generate" },
  { key: "test_generation",label: "Test Generator",    icon: Code2,         phase: "generate" },
  { key: "verification",   label: "Verification",      icon: Shield,        phase: "generate" },
  { key: "execution",      label: "Execution",         icon: Play,          phase: "execute" },
  { key: "bug_localization",label: "Bug Localization",  icon: Bug,           phase: "repair" },
  { key: "root_cause",     label: "Root Cause",        icon: Search,        phase: "repair" },
  { key: "program_repair", label: "Program Repair",    icon: Wrench,        phase: "repair" },
  { key: "patch_validation",label: "Patch Validation", icon: TestTube,      phase: "repair" },
  { key: "learning",       label: "Learning",          icon: BookOpen,      phase: "learn"  },
];

const PHASE_COLORS: Record<string, string> = {
  analyze:  "text-[#3B82F6]",
  generate: "text-[#8B5CF6]",
  execute:  "text-[#F59E0B]",
  repair:   "text-[#EF4444]",
  learn:    "text-[#10B981]",
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
          <h1 className="text-[28px] font-bold tracking-tight">
            <span className="gradient-text">Test</span> Suites
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
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
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={handleRunPipeline}
            disabled={genStatus === "running"}
            className="gap-2 text-[13px] font-semibold shadow-[0_0_20px_rgba(59,130,246,0.2)]"
          >
            {genStatus === "running"
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Running Pipeline…</>
              : <><Zap className="w-4 h-4" /> Run 13-Agent Pipeline</>
            }
          </Button>
        </div>
      </div>

      {/* ── Fetch error ────────────────────────────────────────────────────── */}
      {fetchError && (
        <div className="bg-red-900/20 border border-red-700/30 text-red-400 text-sm px-4 py-3 rounded-xl">
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
                  {genStatus === "running"  && <Loader2 className="w-4 h-4 text-[#3B82F6] animate-spin" />}
                  {genStatus === "complete" && <CheckCircle2 className="w-4 h-4 text-[#10B981]" />}
                  {genStatus === "error"    && <AlertCircle className="w-4 h-4 text-[#EF4444]" />}
                  <span className="text-sm font-semibold text-[#F9FAFB]">
                    {genStatus === "running"  && `Running 13-agent pipeline… (${agentsRun.length}/${ALL_AGENTS.length} agents done)`}
                    {genStatus === "complete" && "Pipeline complete"}
                    {genStatus === "error"    && "Pipeline failed"}
                  </span>
                  {genSessionId && (
                    <span className="text-[10px] font-mono text-[#4B5563]">
                      #{genSessionId.slice(0, 8)}
                    </span>
                  )}
                </div>
                <button
                  onClick={dismissPanel}
                  className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4 text-[#6B7280]" />
                </button>
              </div>

              {genError && (
                <p className="text-xs text-[#EF4444] mb-3 px-1">{genError}</p>
              )}

              {/* Results row — visible after completion */}
              {genStatus === "complete" && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap items-center gap-4 mb-4 p-3.5 rounded-xl bg-[#10B981]/5 border border-[#10B981]/15"
                >
                  <div className="flex items-center gap-1.5 text-sm">
                    <FlaskConical className="w-4 h-4 text-[#3B82F6]" />
                    <span className="font-bold text-[#3B82F6]">{genTestCount}</span>
                    <span className="text-[#6B7280] text-xs">tests generated</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Bug className="w-4 h-4 text-[#EF4444]" />
                    <span className="font-bold text-[#EF4444]">{bugsFound}</span>
                    <span className="text-[#6B7280] text-xs">bugs reported</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Wrench className="w-4 h-4 text-[#8B5CF6]" />
                    <span className="font-bold text-[#8B5CF6]">{patchesGen}</span>
                    <span className="text-[#6B7280] text-xs">patches generated</span>
                  </div>
                  {bugsFound > 0 && (
                    <Button
                      onClick={() => router.push("/dashboard/bugs")}
                      className="ml-auto gap-1.5 text-xs bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/20"
                      variant="secondary"
                    >
                      <Bug className="w-3.5 h-3.5" />
                      View in Bug Tracker
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </motion.div>
              )}

              {/* 13 agent steps — grouped by phase */}
              <div className="space-y-2">
                {/* Phase labels + agent pills */}
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
                                done    ? "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20"  :
                                active  ? `bg-white/5 ${PHASE_COLORS[phase]} border border-current/20` :
                                "bg-white/3 text-[#4B5563] border border-white/5"
                              }`}
                            >
                              {active
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <Icon className="w-3 h-3" />
                              }
                              {agent.label}
                              {done && <CheckCircle2 className="w-3 h-3" />}
                            </div>
                            {i < phaseAgents.length - 1 && (
                              <div className={`w-3 h-px ${done ? "bg-[#10B981]/30" : "bg-white/8"}`} />
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
                <div className="mt-4 h-1 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#3B82F6] via-[#8B5CF6] to-[#10B981] rounded-full"
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
              <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                Generated Tests
              </h3>
              {testCases.length > 0 && (
                <span className="text-[10px] font-semibold text-[#3B82F6] bg-[#3B82F6]/10 px-2 py-0.5 rounded-md">
                  {testCases.length}
                </span>
              )}
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : testCases.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <FlaskConical className="w-8 h-8 text-[#374151] mx-auto" />
                <p className="text-xs text-[#6B7280]">No test cases yet.</p>
                <button
                  onClick={handleRunPipeline}
                  disabled={genStatus === "running"}
                  className="text-xs text-[#3B82F6] hover:text-[#60A5FA] font-semibold transition-colors"
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
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                      selectedCase?.id === tc.id
                        ? "bg-[rgba(59,130,246,0.12)] border-[rgba(59,130,246,0.2)] text-[#3B82F6]"
                        : "bg-transparent border-transparent text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[rgba(255,255,255,0.03)]"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        selectedCase?.id === tc.id
                          ? "bg-[#3B82F6]/15 text-[#3B82F6]"
                          : "bg-[rgba(255,255,255,0.06)] text-[#6B7280]"
                      }`}
                    >
                      <FileCode className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate">{tc.name}</p>
                      <p className="text-[11px] text-[#6B7280] font-mono truncate">{tc.file}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Stats card */}
          {selectedCase && (
            <GlassCard className="p-5 space-y-3">
              <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                Suite Overview
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Assertions", value: selectedCase.assertions,                               color: "text-[#F9FAFB]" },
                  { label: "Confidence", value: `${(selectedCase.confidence * 100).toFixed(0)}%`,     color: "text-[#F9FAFB]" },
                  { label: "Pass Rate",  value: `${selectedCase.pass_rate}%`,                          color: "text-[#10B981]" },
                  { label: "Framework",  value: selectedCase.framework.toUpperCase(),                  color: "text-[#F59E0B] font-mono" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <span className="text-[10px] text-[#6B7280] block">{label}</span>
                    <span className={`text-lg font-bold ${color}`}>{value}</span>
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
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
                  <div>
                    <h3 className="text-base font-semibold text-[#F9FAFB]">{selectedCase.name}</h3>
                    <span className="text-xs font-mono text-[#6B7280]">{selectedCase.file}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded-md border border-[#10B981]/20">
                      {selectedCase.framework}
                    </span>
                    <span className="text-xs bg-[#3B82F6]/10 text-[#3B82F6] px-2 py-0.5 rounded-md border border-[#3B82F6]/20">
                      {(selectedCase.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                </div>
                <div className="flex-1 bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 font-mono text-[12px] leading-relaxed overflow-auto text-[#9CA3AF]">
                  {(selectedCase.code || "# No code available").split("\n").map((line, idx) => (
                    <div key={idx} className="table-row">
                      <span className="table-cell text-right pr-4 select-none opacity-20 text-xs w-8">{idx + 1}</span>
                      <span className="table-cell whitespace-pre">{line || " "}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : !loading && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.1)] flex items-center justify-center">
                  <Cpu className="w-8 h-8 text-[#3B82F6]/40" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#F9FAFB] mb-1">No test cases yet</p>
                  <p className="text-xs text-[#6B7280] max-w-xs">
                    Click <strong className="text-[#3B82F6]">Run 13-Agent Pipeline</strong> to generate tests,
                    execute them, and auto-report failures to the Bug Tracker.
                  </p>
                </div>
                <Button onClick={handleRunPipeline} disabled={genStatus === "running"} className="gap-2">
                  <Zap className="w-4 h-4" /> Run 13-Agent Pipeline
                </Button>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
