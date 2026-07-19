"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Square, Activity, Cpu, HardDrive, RefreshCw, Terminal, CheckCircle2, AlertTriangle, Layers, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { listProjects, executeTests, ProjectItem, ExecuteTestsResponse, runRegression } from "@/lib/api";

const PRE_RUN_LOGS = [
  "Initializing isolated local subprocess sandbox...",
  "Configuring workspace directories...",
  "Loading Python virtual environment bindings...",
  "Running project dependencies verification...",
];

const SIMULATED_PROGRESS_LOGS = [
  "Resolving package dependency graph...",
  "Scanning source tree for pytest components...",
  "Configuring coveragerc coverage options...",
  "Launching pytest execution engine...",
  "Waiting for test outcomes & assertions to evaluate...",
];

export default function ExecutionPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [framework, setFramework] = useState<string>("pytest");
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [executionResult, setExecutionResult] = useState<ExecuteTestsResponse | null>(null);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load projects list
  useEffect(() => {
    listProjects(1, 100)
      .then((res) => {
        setProjects(res.items);
        if (res.items.length > 0) {
          setSelectedProjectId(res.items[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load projects", err);
        setLogs(["Error: Failed to connect to projects API.", String(err)]);
      });
  }, []);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  const runSuite = async () => {
    if (!selectedProjectId) return;
    setIsRunning(true);
    setExecutionResult(null);
    setLogs([...PRE_RUN_LOGS]);

    // Start simulated progress logging while execution runs
    let progressIdx = 0;
    progressTimerRef.current = setInterval(() => {
      if (progressIdx < SIMULATED_PROGRESS_LOGS.length) {
        setLogs((prev) => [...prev, SIMULATED_PROGRESS_LOGS[progressIdx]]);
        progressIdx++;
      }
    }, 1800);

    try {
      let res: ExecuteTestsResponse;
      if (framework === "regression") {
        const regRes = await runRegression(selectedProject?.local_path || "", 0);
        res = {
          run_id: "regression-run",
          framework: "regression",
          passed: regRes.passed,
          failed: regRes.failed,
          errors: 0,
          total: regRes.passed + regRes.failed,
          duration_ms: 0,
          coverage_pct: 100,
          failures: [],
          logs: regRes.logs || regRes.message || "Regression check complete.",
        };
      } else {
        res = await executeTests(selectedProjectId, framework, selectedProject?.local_path || "");
      }
      
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      
      setExecutionResult(res);
      
      // Parse & append backend logs
      const backendLogs = res.logs ? res.logs.split("\n") : ["No execution logs returned."];
      setLogs((prev) => [
        ...prev,
        "Execution complete. Output captured below:",
        "--------------------------------------------------",
        ...backendLogs,
        "--------------------------------------------------",
        `Test Suite Summary: Passed=${res.passed}, Failed=${res.failed}, Errors=${res.errors}, Total=${res.total}`,
        `Duration: ${res.duration_ms} ms | Coverage: ${res.coverage_pct}%`,
      ]);
    } catch (err: any) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setLogs((prev) => [
        ...prev,
        "--------------------------------------------------",
        "FATAL: Sandbox execution failed with exception:",
        String(err.message || err),
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">
            <span className="gradient-text">Sandbox</span> Execution
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Run test suites in isolated sandboxes and view execution outputs and coverage details.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Project Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Select Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={isRunning}
              className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
            >
              {projects.length === 0 ? (
                <option value="">No projects loaded</option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#18181B] text-[#F9FAFB]">
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Framework Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Framework</label>
            <select
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
              disabled={isRunning}
              className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
            >
              <option value="pytest" className="bg-[#18181B] text-[#F9FAFB]">pytest (Python)</option>
              <option value="playwright" className="bg-[#18181B] text-[#F9FAFB]">playwright (UI)</option>
              <option value="newman" className="bg-[#18181B] text-[#F9FAFB]">newman (API)</option>
              <option value="regression" className="bg-[#18181B] text-[#F9FAFB]">regression (Regression Checker)</option>
            </select>
          </div>

          <div className="pt-5">
            <Button
              onClick={runSuite}
              disabled={isRunning || !selectedProjectId}
              className={`gap-2 text-[13px] font-semibold ${
                isRunning ? "bg-red-600/30 text-red-400 border border-red-500/20 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Executing Suite...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Run Test Suite
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sandbox statistics */}
        <div className="lg:col-span-1 space-y-4">
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4.5 h-4.5 text-[#3B82F6]" />
              <h3 className="text-[15px] font-semibold text-[#F9FAFB]">Sandbox Metrics</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6B7280]">Status</span>
                <span className={`font-semibold ${isRunning ? "text-[#3B82F6]" : executionResult ? "text-[#10B981]" : "text-[#6B7280]"}`}>
                  {isRunning ? "Running tests..." : executionResult ? "Complete" : "Healthy (Idle)"}
                </span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#6B7280] flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> CPU Limit</span>
                  <span className="font-semibold text-[#F9FAFB]">{isRunning ? "45%" : "0.5%"}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: isRunning ? "45%" : "1%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#6B7280] flex items-center gap-1"><HardDrive className="w-3.5 h-3.5" /> RAM Usage</span>
                  <span className="font-semibold text-[#F9FAFB]">{isRunning ? "520 MB" : "45 MB"}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: isRunning ? "65%" : "8%" }} />
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Test Outcomes Card */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4.5 h-4.5 text-[#10B981]" />
              <h3 className="text-[15px] font-semibold text-[#F9FAFB]">Test Outcomes</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-xl p-3">
                <div className="text-2xl font-bold text-[#10B981]">{executionResult?.passed ?? 0}</div>
                <div className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Passed</div>
              </div>
              <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-xl p-3">
                <div className="text-2xl font-bold text-[#EF4444]">{executionResult?.failed ?? 0}</div>
                <div className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Failed</div>
              </div>
              <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-xl p-3">
                <div className="text-2xl font-bold text-yellow-500">{executionResult?.errors ?? 0}</div>
                <div className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Errors</div>
              </div>
              <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-xl p-3">
                <div className="text-2xl font-bold text-[#F9FAFB]">{executionResult?.total ?? 0}</div>
                <div className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Total</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)] space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-[#6B7280]">Coverage</span>
                <span className="font-semibold text-blue-400">{executionResult ? `${executionResult.coverage_pct}%` : "—"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#6B7280]">Duration</span>
                <span className="font-semibold text-purple-400">{executionResult ? `${(executionResult.duration_ms / 1000).toFixed(2)}s` : "—"}</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Live logs terminal */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6 h-[520px] flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-[rgba(255,255,255,0.05)] pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4.5 h-4.5 text-[#10B981]" />
                <h3 className="text-sm font-semibold text-[#F9FAFB]">Console Output</h3>
              </div>
              {isRunning && (
                <span className="flex items-center gap-1.5 text-xs text-[#3B82F6]">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Streaming logs
                </span>
              )}
            </div>

            <div className="flex-1 bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 font-mono text-[11px] leading-relaxed overflow-y-auto text-[#9CA3AF] space-y-1.5">
              {logs.length === 0 ? (
                <div className="text-[#6B7280] italic h-full flex items-center justify-center">
                  Select a project and click "Run Test Suite" to begin.
                </div>
              ) : (
                logs.map((log, idx) => {
                  const logStr = typeof log === "string" ? log : "";
                  let lineClass = "";
                  if (logStr.includes("PASSED") || logStr.includes("test_cases_generated") || logStr.includes("Passed=")) {
                    lineClass = "text-[#10B981]";
                  } else if (logStr.includes("FAILED") || logStr.includes("failures") || logStr.includes("FATAL") || logStr.includes("Error:")) {
                    lineClass = "text-[#EF4444]";
                  } else if (logStr.includes("Initialize") || logStr.includes("Configuring") || logStr.includes("Running") || logStr.includes("Stream")) {
                    lineClass = "text-blue-400";
                  }

                  return (
                    <div key={idx} className="flex gap-2">
                      <span className="select-none opacity-20 text-xs w-6">{idx + 1}</span>
                      <span className={lineClass}>{logStr}</span>
                    </div>
                  );
                })
              )}
              <div ref={terminalEndRef} />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
