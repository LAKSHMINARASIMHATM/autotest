"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Activity, Database, Server, RefreshCw, Cpu, BarChart2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { getMonitoringHealth, type MonitoringHealth } from "@/lib/api";

function StatBar({ label, value, max, color }: { label: string; value: string; pct: number; max?: string; color: string }) {
  const pct = parseFloat(value);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#9CA3AF]">{label}</span>
        <span className="font-semibold text-white">{value}{max ? ` / ${max}` : "%"}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%`, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function formatUptime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${m}m ${sec}s` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function sessionToLog(s: { session_id: string; status: string; agents_run: string[]; test_cases_generated: number; bugs_found: number; patches_generated: number }, ts: string): string {
  const icon = s.status === "complete" ? "INFO" : s.status === "error" ? "ERROR" : "DEBUG";
  return `[${ts}] ${icon}: Session ${s.session_id.slice(0, 8)} | status=${s.status} agents=[${s.agents_run.join(",")}] tests=${s.test_cases_generated} bugs=${s.bugs_found} patches=${s.patches_generated}`;
}

export default function MonitoringPage() {
  const [health, setHealth] = useState<MonitoringHealth | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenSessions = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await getMonitoringHealth();
      setHealth(data);

      // Append new session logs
      const now = new Date().toISOString().replace("T", " ").slice(0, 19);
      const newLines: string[] = [];
      for (const s of data.pipeline.recent_sessions) {
        if (!seenSessions.current.has(s.session_id)) {
          seenSessions.current.add(s.session_id);
          newLines.push(sessionToLog(s, now));
        }
      }
      if (newLines.length > 0) {
        setLogs((prev) => [...prev, ...newLines].slice(-100));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial seed + status log
  useEffect(() => {
    const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
    setLogs([
      `[${ts}] INFO: AutoTestAI monitoring telemetry stream started`,
      `[${ts}] INFO: Connecting to MongoDB and Neo4j...`,
    ]);
    refresh();
  }, [refresh]);

  // Auto-refresh every 10s
  useEffect(() => {
    const t = setInterval(refresh, 10_000);
    return () => clearInterval(t);
  }, [refresh]);

  // Scroll to bottom when logs grow
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Add status log when health changes
  useEffect(() => {
    if (!health) return;
    const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
    setLogs((prev) => [
      ...prev,
      `[${ts}] INFO: CPU=${health.host.cpu_pct}% RAM=${health.host.ram_used_mb}MB/${health.host.ram_total_mb}MB Neo4j=${health.database.neo4j_status}`,
    ].slice(-100));
  }, [health]);

  const mongo = health?.database.mongodb ?? {};
  const totalMongoDocuments = Object.values(mongo).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">
            <span className="gradient-text">System</span> Telemetry
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Monitor host performance, Neo4j connection pools, MongoDB collections, and agent pipeline activity.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-white transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Uptime",
            value: health ? formatUptime(health.uptime_seconds) : "—",
            sub: "API server",
            icon: <Server className="w-4 h-4 text-[#3B82F6]" />,
          },
          {
            label: "Pipeline Sessions",
            value: health ? String(health.pipeline.total_sessions) : "—",
            sub: "all time",
            icon: <Activity className="w-4 h-4 text-[#10B981]" />,
          },
          {
            label: "MongoDB Docs",
            value: health ? totalMongoDocuments.toLocaleString() : "—",
            sub: "across all collections",
            icon: <Database className="w-4 h-4 text-[#8B5CF6]" />,
          },
          {
            label: "Neo4j Nodes",
            value: health ? health.database.neo4j_nodes.toLocaleString() : "—",
            sub: health?.database.neo4j_status ?? "—",
            icon: <BarChart2 className="w-4 h-4 text-[#F59E0B]" />,
          },
        ].map(({ label, value, sub, icon }) => (
          <GlassCard key={label} className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center shrink-0">
              {icon}
            </div>
            <div>
              <p className="text-[10px] text-[#6B7280] uppercase tracking-wider">{label}</p>
              <p className="text-lg font-bold text-white">{value}</p>
              <p className="text-[10px] text-[#6B7280]">{sub}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Host + DB metrics */}
        <div className="lg:col-span-1 space-y-4">
          {/* Host stats */}
          <GlassCard className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#3B82F6]" />
              <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Host Infrastructure</h3>
            </div>
            {health ? (
              <div className="space-y-3">
                <StatBar
                  label="CPU Load"
                  value={`${health.host.cpu_pct}`}
                  pct={health.host.cpu_pct}
                  color="bg-blue-500"
                />
                <StatBar
                  label="RAM"
                  value={`${health.host.ram_used_mb} MB`}
                  max={`${health.host.ram_total_mb} MB`}
                  pct={health.host.ram_pct}
                  color="bg-purple-500"
                />
              </div>
            ) : (
              <p className="text-xs text-[#6B7280]">{loading ? "Loading…" : "No data"}</p>
            )}
          </GlassCard>

          {/* MongoDB collection counts */}
          <GlassCard className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#8B5CF6]" />
              <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">MongoDB Collections</h3>
            </div>
            {health ? (
              <div className="space-y-2">
                {Object.entries(mongo).map(([col, count]) => (
                  <div key={col} className="flex justify-between text-xs">
                    <span className="text-[#9CA3AF] capitalize">{col.replace("_", " ")}</span>
                    <span className="font-semibold text-white">{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#6B7280]">{loading ? "Loading…" : "No data"}</p>
            )}
          </GlassCard>
        </div>

        {/* Right: Live log stream */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6 h-[480px] flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-[rgba(255,255,255,0.05)] pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#10B981]" />
                <h3 className="text-sm font-semibold text-[#F9FAFB]">Streaming Telemetry Log</h3>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Live feed · refreshes every 10s
              </span>
            </div>

            <div className="flex-1 bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 font-mono text-[11px] leading-relaxed overflow-y-auto text-[#6B7280] space-y-1">
              {logs.map((log, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="select-none opacity-20 text-xs w-6">{idx + 1}</span>
                  <span
                    className={
                      log.includes("ERROR")
                        ? "text-[#EF4444]"
                        : log.includes("INFO")
                        ? "text-[#10B981]"
                        : "text-[#9CA3AF]"
                    }
                  >
                    {log}
                  </span>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Recent pipeline sessions table */}
      {health && health.pipeline.recent_sessions.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="text-sm font-semibold text-[#F9FAFB] mb-4">Recent Pipeline Sessions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#6B7280] border-b border-[rgba(255,255,255,0.05)]">
                  <th className="text-left pb-2 font-medium">Session ID</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                  <th className="text-left pb-2 font-medium">Agents Run</th>
                  <th className="text-right pb-2 font-medium">Tests</th>
                  <th className="text-right pb-2 font-medium">Bugs</th>
                  <th className="text-right pb-2 font-medium">Patches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                {health.pipeline.recent_sessions.slice(0, 10).map((s) => (
                  <tr key={s.session_id} className="py-2">
                    <td className="py-2 font-mono text-[#9CA3AF]">{s.session_id.slice(0, 12)}…</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        s.status === "complete" ? "bg-emerald-500/15 text-emerald-400" :
                        s.status === "running"  ? "bg-blue-500/15 text-blue-400" :
                        s.status === "error"    ? "bg-red-500/15 text-red-400" :
                                                  "bg-[rgba(255,255,255,0.06)] text-[#6B7280]"
                      }`}>{s.status}</span>
                    </td>
                    <td className="py-2 text-[#6B7280]">{s.agents_run.join(", ") || "—"}</td>
                    <td className="py-2 text-right text-white font-semibold">{s.test_cases_generated}</td>
                    <td className="py-2 text-right text-white font-semibold">{s.bugs_found}</td>
                    <td className="py-2 text-right text-white font-semibold">{s.patches_generated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
