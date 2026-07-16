"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Square, Activity, Cpu, HardDrive, RefreshCw, Terminal, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

const initialLogs = [
  "Initializing isolated Docker sandbox container...",
  "Mounting workspace volume d:/autotest/backend ...",
  "Checking requirements and python dependencies...",
  "Starting Pytest execution engine on port 3000...",
  "collected 3 items",
];

const appendLogs = [
  "tests/unit/test_auth.py::test_jwt_login_successful PASSED [ 33%]",
  "tests/unit/test_auth.py::test_jwt_token_expiration PASSED [ 66%]",
  "tests/integration/test_projects.py::test_create_project_invalid_url PASSED [100%]",
  "================ 3 passed, 0 failures in 2.41s ================",
  "Coverage report collected: 85.3%",
  "Container resources released. Exit code: 0",
];

export default function ExecutionPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>(initialLogs);
  const [logIndex, setLogIndex] = useState(0);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isRunning || logIndex >= appendLogs.length) return;

    const timer = setTimeout(() => {
      setLogs((prev) => [...prev, appendLogs[logIndex]]);
      setLogIndex((prev) => prev + 1);
    }, 800);

    return () => clearTimeout(timer);
  }, [isRunning, logIndex]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const toggleExecution = () => {
    if (isRunning) {
      setIsRunning(false);
    } else {
      setLogs(initialLogs);
      setLogIndex(0);
      setIsRunning(true);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">
            <span className="gradient-text">Sandbox</span> Execution
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Run generated test cases in isolated Docker-in-Docker environments and view stream logs.
          </p>
        </div>
        <Button
          onClick={toggleExecution}
          className={`gap-2 text-[13px] font-semibold ${
            isRunning ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {isRunning ? (
            <>
              <Square className="w-4 h-4" /> Stop execution
            </>
          ) : (
            <>
              <Play className="w-4 h-4" /> Run Test Suite
            </>
          )}
        </Button>
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
                <span className={`font-semibold ${isRunning ? "text-[#3B82F6]" : "text-[#10B981]"}`}>
                  {isRunning ? "Running tests..." : "Healthy (Idle)"}
                </span>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#6B7280] flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> CPU Limit</span>
                  <span className="font-semibold text-[#F9FAFB]">{isRunning ? "12%" : "0.5%"}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: isRunning ? "12%" : "1%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#6B7280] flex items-center gap-1"><HardDrive className="w-3.5 h-3.5" /> RAM Usage</span>
                  <span className="font-semibold text-[#F9FAFB]">{isRunning ? "240 MB" : "45 MB"}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: isRunning ? "35%" : "8%" }} />
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Live logs terminal */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6 h-[400px] flex flex-col">
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
              {logs.map((log, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="select-none opacity-20 text-xs w-6">{idx + 1}</span>
                  <span className={log.includes("PASSED") ? "text-[#10B981]" : log.includes("failures") ? "text-[#EF4444]" : ""}>{log}</span>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
