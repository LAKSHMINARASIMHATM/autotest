"use client";

import { useState, useEffect, useRef } from "react";
import { Activity, Database, Server, RefreshCw, Layers } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

const initialLogs = [
  "[2026-07-16 15:40:02] INFO: Neo4j client connection initialized",
  "[2026-07-16 15:40:05] INFO: ChromaDB collection 'project_embeddings' resolved",
  "[2026-07-16 15:41:12] DEBUG: Redis cluster memory: 12.4 MB allocated",
  "[2026-07-16 15:41:20] INFO: Agent queue broker listening on amqp://localhost",
];

const appendLogs = [
  "[2026-07-16 15:42:01] INFO: Agent [planner] state updated to success",
  "[2026-07-16 15:42:15] DEBUG: Neo4j transaction succeeded (took 24ms)",
  "[2026-07-16 15:42:32] INFO: Agent [retriever] querying vector database",
  "[2026-07-16 15:43:08] DEBUG: Ingested 4 search result chunks into short-term memory",
  "[2026-07-16 15:43:40] INFO: CPU load spiked to 24% during test suite parsing",
  "[2026-07-16 15:44:11] INFO: Memory cleanup triggered. Released 12MB cache",
];

export default function MonitoringPage() {
  const [logs, setLogs] = useState<string[]>(initialLogs);
  const [logIndex, setLogIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      if (logIndex < appendLogs.length) {
        setLogs((prev) => [...prev, appendLogs[logIndex]]);
        setLogIndex((prev) => prev + 1);
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [logIndex]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen pb-12">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">
          <span className="gradient-text">System</span> Telemetry
        </h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Monitor host performance, Neo4j connection pools, ChromaDB indexing, and agent queue sizes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance metrics */}
        <div className="lg:col-span-1 space-y-4">
          {/* Host stats */}
          <GlassCard className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Server className="w-4.5 h-4.5 text-[#3B82F6]" />
              <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Host Infrastructure</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#9CA3AF]">Host CPU Load</span>
                  <span className="font-semibold text-white">14%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: "14%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#9CA3AF]">Host RAM Ingestion</span>
                  <span className="font-semibold text-white">2.3 GB / 8 GB</span>
                </div>
                <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: "28.7%" }} />
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Database stats */}
          <GlassCard className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Database className="w-4.5 h-4.5 text-[#8B5CF6]" />
              <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Database Pools</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#9CA3AF]">Neo4j Connection Pool</span>
                  <span className="font-semibold text-white">8 open / 32 max</span>
                </div>
                <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "25%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#9CA3AF]">ChromaDB Collection Nodes</span>
                  <span className="font-semibold text-white">892 vectors</span>
                </div>
                <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full" style={{ width: "45%" }} />
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Console */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6 h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-[rgba(255,255,255,0.05)] pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4.5 h-4.5 text-[#10B981]" />
                <h3 className="text-sm font-semibold text-[#F9FAFB]">Streaming Telemetry Log</h3>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Live feed
              </span>
            </div>

            <div className="flex-1 bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 font-mono text-[11px] leading-relaxed overflow-y-auto text-[#6B7280] space-y-1">
              {logs.map((log, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="select-none opacity-20 text-xs w-6">{idx + 1}</span>
                  <span className={log.includes("ERROR") ? "text-[#EF4444]" : log.includes("success") ? "text-[#10B981]" : "text-[#9CA3AF]"}>{log}</span>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
