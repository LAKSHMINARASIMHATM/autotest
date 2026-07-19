"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical, FileCode, Code2, RefreshCw, Zap,
  CheckCircle2, AlertCircle, Loader2, Brain, ClipboardCheck,
  Network, Target, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  getProjectTestCases, getDefaultProjectId, generateTests,
  getPipelineStatus, type TestCaseItem,
} from "@/lib/api";

// The 5 agents in the fast test-generation pipeline
const GEN_AGENTS = [
  { key: "planner",        label: "Planner",        icon: Brain,         desc: "Analyzing project structure" },
  { key: "requirement",    label: "Requirement",     icon: ClipboardCheck, desc: "Extracting requirements" },
  { key: "architecture",   label: "Architecture",    icon: Network,       desc: "Mapping dependencies & APIs" },
  { key: "test_strategy",  label: "Test Strategy",   icon: Target,        desc: "Selecting test types" },
  { key: "test_generation",label: "Test Generator",  icon: Code2,         desc: "Generating test code" },
];

type GenStatus = "idle" | "running" | "complete" | "error";

export default function TestsPage() {
  const [testCases, setTestCases]       = useState<TestCaseItem[]>([]);
  const [selectedCase, setSelectedCase] = useState<TestCaseItem | null>(null);
  const [loading, setLoading]           = useState(true);
  const [fetchError, setFetchError]     = useState<string | null>(null);

  // Generation state
  const [genStatus, setGenStatus]       = useState<GenStatus>("idle");
  const [genSessionId, setGenSessionId] = useState<string | null>(null);
  const [agentsRun, setAgentsRun]       = useState<string[]>([]);
  const [genTestCount, setGenTestCount] = useState(0);
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

  // ── Trigger generation ─────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setGenStatus("running");
    setGenError(null);
    setAgentsRun([]);
    setGenTestCount(0);
    try {
      const pid = projectId ?? await getDefaultProjectId();
      if (!pid) throw new Error("No project found.");
      setProjectId(pid);
      const resp = await generateTests(pid);
      setGenSessionId(resp.session_id);
      startPolling(resp.session_id);
    } catch (e: any) {
      setGenStatus("error");
      setGenError(e.message ?? "Failed to trigger generation");
    }
  }, [projectId, startPolling]);

  const dismissGenPanel = () => {
    setGenStatus("idle");
    setGenSessionId(null);
    setAgentsRun([]);
    setGenTestCount(0);
    setGenError(null);
    if (pollRef.current) clearInterval(pollRef.current);
  };

  // ── Compute per-agent status ───────────────────────────────────────────────
  const ranSet = new Set(agentsRun);
  const lastDoneIdx = GEN_AGENTS.reduce((acc, a, i) => ranSet.has(a.key) ? i : acc, -1);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen pb-12">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">
            <span className="gradient-text">Test</span> Suites
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            {testCases.length > 0
              ? `${testCases.length} test case${testCases.length !== 1 ? "s" : ""} generated`
              : "Generate AI test cases from your project"}
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
            onClick={handleGenerate}
            disabled={genStatus === "running"}
            className="gap-2 text-[13px] font-semibold shadow-[0_0_20px_rgba(59,130,246,0.2)]"
          >
            {genStatus === "running"
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              : <><Zap className="w-4 h-4" /> Generate Tests</>
            }
          </Button>
        </div>
      </div>

      {/* ── Fetch error ──────────────────────────────────────────────────────── */}
      {fetchError && (
        <div className="bg-red-900/20 border border-red-700/30 text-red-400 text-sm px-4 py-3 rounded-xl">
          {fetchError}
        </div>
      )}

      {/* ── Generation progress panel ─────────────────────────────────────── */}
      <AnimatePresence>
        {genStatus !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  {genStatus === "running" && <Loader2 className="w-4 h-4 text-[#3B82F6] animate-spin" />}
                  {genStatus === "complete" && <CheckCircle2 className="w-4 h-4 text-[#10B981]" />}
                  {genStatus === "error" && <AlertCircle className="w-4 h-4 text-[#EF4444]" />}
                  <span className="text-sm font-semibold text-[#F9FAFB]">
                    {genStatus === "running"  && "Generating test cases with AI…"}
                    {genStatus === "complete" && `Generated ${genTestCount} test case${genTestCount !== 1 ? "s" : ""} successfully`}
                    {genStatus === "error"    && "Generation failed"}
                  </span>
                  {genSessionId && (
                    <span className="text-[10px] font-mono text-[#4B5563]">
                      #{genSessionId.slice(0, 8)}
                    </span>
                  )}
                </div>
                <button
                  onClick={dismissGenPanel}
                  className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4 text-[#6B7280]" />
                </button>
              </div>

              {genError && (
                <p className="text-xs text-[#EF4444] mb-3 px-1">{genError}</p>
              )}

              {/* Agent progress steps */}
              <div className="flex items-center gap-1 flex-wrap">
                {GEN_AGENTS.map((agent, i) => {
                  const done    = ranSet.has(agent.key);
                  const active  = !done && i === lastDoneIdx + 1 && genStatus === "running";
                  const pending = !done && !active;
                  const Icon = agent.icon;

                  return (
                    <div key={agent.key} className="flex items-center gap-1">
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-300 ${
                          done    ? "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20"  :
                          active  ? "bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20" :
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
                      {i < GEN_AGENTS.length - 1 && (
                        <div className={`w-4 h-px ${done ? "bg-[#10B981]/30" : "bg-white/8"}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Progress bar */}
              {genStatus === "running" && (
                <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${Math.max(4, (agentsRun.length / GEN_AGENTS.length) * 100)}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content grid ────────────────────────────────────────────────── */}
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
                  onClick={handleGenerate}
                  disabled={genStatus === "running"}
                  className="text-xs text-[#3B82F6] hover:text-[#60A5FA] font-semibold transition-colors"
                >
                  Generate now →
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
                  { label: "Assertions", value: selectedCase.assertions, color: "text-[#F9FAFB]" },
                  { label: "Confidence", value: `${(selectedCase.confidence * 100).toFixed(0)}%`, color: "text-[#F9FAFB]" },
                  { label: "Pass Rate",  value: `${selectedCase.pass_rate}%`, color: "text-[#10B981]" },
                  { label: "Framework", value: selectedCase.framework.toUpperCase(), color: "text-[#F59E0B] font-mono" },
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
                  <Code2 className="w-8 h-8 text-[#3B82F6]/40" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#F9FAFB] mb-1">No test cases yet</p>
                  <p className="text-xs text-[#6B7280]">
                    Click <strong className="text-[#3B82F6]">Generate Tests</strong> to run the AI pipeline
                  </p>
                </div>
                <Button onClick={handleGenerate} disabled={genStatus === "running"} className="gap-2">
                  <Zap className="w-4 h-4" /> Generate Tests
                </Button>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
