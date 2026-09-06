"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { IconActivity, IconDatabase, IconServer, IconRefreshCw, IconCpu, IconBarChart2 } from "@/components/icons";
import { GlassCard } from "@/components/ui/glass-card";
import { getMonitoringHealth, type MonitoringHealth } from "@/lib/api";

function StatBar({ label, value, max, color }: { label: string; value: string; pct: number; max?: string; color: string }) {
  const pct = parseFloat(value);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: "var(--color-text-muted)" }}>{label}</span>
        <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{value}{max ? ` / ${max}` : "%"}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[rgba(107,79,47,0.1)] overflow-hidden">
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
          <h1 className="text-[28px] font-extrabold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            <span className="gradient-text">System</span> Telemetry
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Monitor host performance, Neo4j connection pools, MongoDB collections, and agent pipeline activity.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
          style={{ color: "var(--color-text-muted)" }}
        >
          <IconRefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-[rgba(139,26,26,0.1)] border border-[rgba(139,26,26,0.3)] text-[var(--color-danger)] text-xs">
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
            icon: <IconServer size={18} className="text-[var(--color-brown-primary)]" />,
          },
          {
            label: "Pipeline Sessions",
            value: health ? String(health.pipeline.total_sessions) : "—",
            sub: "all time",
            icon: <IconActivity size={18} className="text-[var(--color-success)]" />,
          },
          {
            label: "MongoDB Docs",
            value: health ? totalMongoDocuments.toLocaleString() : "—",
            sub: "across all collections",
            icon: <IconDatabase size={18} className="text-[var(--color-brown-secondary)]" />,
          },
          {
            label: "Neo4j Nodes",
            value: health ? health.database.neo4j_nodes.toLocaleString() : "—",
            sub: health?.database.neo4j_status ?? "—",
            icon: <IconBarChart2 size={18} className="text-[var(--color-warning)]" />,
          },
        ].map(({ label, value, sub, icon }) => (
          <GlassCard key={label} className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[rgba(107,79,47,0.08)] border border-[rgba(107,79,47,0.15)] flex items-center justify-center shrink-0">
              {icon}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--color-text-muted)" }}>{label}</p>
              <p className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>{value}</p>
              <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{sub}</p>
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
              <IconCpu size={16} className="text-[var(--color-brown-primary)]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Host Infrastructure</h3>
            </div>
            {health ? (
              <div className="space-y-3">
                <StatBar
                  label="CPU Load"
                  value={`${health.host.cpu_pct}`}
                  pct={health.host.cpu_pct}
                  color="bg-[var(--color-brown-primary)]"
                />
                <StatBar
                  label="RAM"
                  value={`${health.host.ram_used_mb} MB`}
                  max={`${health.host.ram_total_mb} MB`}
                  pct={health.host.ram_pct}
                  color="bg-[var(--color-brown-secondary)]"
                />
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{loading ? "Loading…" : "No data"}</p>
            )}
          </GlassCard>

          {/* MongoDB collection counts */}
          <GlassCard className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <IconDatabase size={16} className="text-[var(--color-brown-primary)]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>MongoDB Collections</h3>
            </div>
            {health ? (
              <div className="space-y-2">
                {Object.entries(mongo).map(([col, count]) => (
                  <div key={col} className="flex justify-between text-xs">
                    <span className="capitalize" style={{ color: "var(--color-text-secondary)" }}>{col.replace("_", " ")}</span>
                    <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{loading ? "Loading…" : "No data"}</p>
            )}
          </GlassCard>
        </div>

        {/* Right: Live log stream */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6 h-[480px] flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <IconActivity size={16} className="text-[var(--color-success)]" />
                <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Streaming Telemetry Log</h3>
              </div>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                <IconRefreshCw size={12} className="animate-spin" /> Live feed · refreshes every 10s
              </span>
            </div>

            <div className="flex-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-5 font-mono text-[11px] leading-relaxed overflow-y-auto space-y-1" style={{ color: "var(--color-text-secondary)" }}>
              {logs.map((log, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="select-none opacity-40 text-xs w-6" style={{ color: "var(--color-text-muted)" }}>{idx + 1}</span>
                  <span
                    style={{
                      color: log.includes("ERROR")
                        ? "var(--color-danger)"
                        : log.includes("INFO")
                        ? "var(--color-success)"
                        : "var(--color-text-secondary)",
                      fontWeight: log.includes("ERROR") || log.includes("INFO") ? 600 : 400,
                    }}
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
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>Recent Pipeline Sessions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)]" style={{ color: "var(--color-text-muted)" }}>
                  <th className="text-left pb-2 font-medium">Session ID</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                  <th className="text-left pb-2 font-medium">Agents Run</th>
                  <th className="text-right pb-2 font-medium">Tests</th>
                  <th className="text-right pb-2 font-medium">Bugs</th>
                  <th className="text-right pb-2 font-medium">Patches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {health.pipeline.recent_sessions.slice(0, 10).map((s) => (
                  <tr key={s.session_id} className="py-2">
                    <td className="py-2 font-mono" style={{ color: "var(--color-text-muted)" }}>{s.session_id.slice(0, 12)}…</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        s.status === "complete" ? "bg-[rgba(46,107,62,0.15)] text-[var(--color-success)]" :
                        s.status === "running"  ? "bg-[rgba(107,79,47,0.15)] text-[var(--color-brown-primary)]" :
                        s.status === "error"    ? "bg-[rgba(139,26,26,0.15)] text-[var(--color-danger)]" :
                                                  "bg-[rgba(107,79,47,0.06)] text-[var(--color-text-muted)]"
                      }`}>{s.status}</span>
                    </td>
                    <td className="py-2" style={{ color: "var(--color-text-muted)" }}>{s.agents_run.join(", ") || "—"}</td>
                    <td className="py-2 text-right font-semibold" style={{ color: "var(--color-text-primary)" }}>{s.test_cases_generated}</td>
                    <td className="py-2 text-right font-semibold" style={{ color: "var(--color-text-primary)" }}>{s.bugs_found}</td>
                    <td className="py-2 text-right font-semibold" style={{ color: "var(--color-text-primary)" }}>{s.patches_generated}</td>
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
