"use client";

import { useState, useEffect, useCallback } from "react";
import {
  IconGitBranch, IconGlobe, IconCheck, IconPlay, IconGitPullRequest, IconCode,
  IconRefreshCw, IconCheckCircle, IconAlertCircle, IconClock, IconActivity,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  listPipelineSessions,
  triggerAgentPipeline,
  getDefaultProjectId,
  type PipelineStatusResponse,
} from "@/lib/api";

const YAML_TEMPLATE = `name: AutoTestAI Quality Gate

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Trigger AutoTestAI Pipeline
        run: |
          curl -X POST \\
            -H "Authorization: Bearer \${{ secrets.AUTOTEST_API_KEY }}" \\
            -H "Content-Type: application/json" \\
            -d '{"branch": "\${{ github.ref_name }}"}' \\
            http://localhost:8000/api/v1/agents/trigger
`;

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    complete: "bg-[rgba(46,107,62,0.15)] text-[var(--color-success)]",
    running:  "bg-[rgba(107,79,47,0.15)] text-[var(--color-brown-primary)]",
    error:    "bg-[rgba(139,26,26,0.15)] text-[var(--color-danger)]",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg[status] ?? "bg-[rgba(107,79,47,0.06)] text-[var(--color-text-muted)]"}`}>
      {status}
    </span>
  );
}

export default function PipelinePage() {
  const [yamlCode, setYamlCode] = useState(YAML_TEMPLATE);
  const [copied, setCopied] = useState(false);
  const [sessions, setSessions] = useState<PipelineStatusResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await listPipelineSessions();
      setSessions(data.slice().reverse()); // newest first
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-refresh if any session is running
  useEffect(() => {
    const hasRunning = sessions.some((s) => s.status === "running");
    if (!hasRunning) return;
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [sessions, refresh]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(yamlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTrigger = async () => {
    setTriggering(true);
    setTriggerMsg(null);
    try {
      const projectId = await getDefaultProjectId();
      if (!projectId) throw new Error("No project found. Import a project first.");
      const res = await triggerAgentPipeline(projectId);
      setTriggerMsg(`Pipeline started — session ${res.session_id.slice(0, 8)}`);
      setTimeout(refresh, 1000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTriggering(false);
    }
  };

  // Aggregate stats from sessions
  const totalTests    = sessions.reduce((a, s) => a + s.test_cases_generated, 0);
  const totalBugs     = sessions.reduce((a, s) => a + s.bugs_found, 0);
  const totalPatches  = sessions.reduce((a, s) => a + s.patches_generated, 0);
  const completed     = sessions.filter((s) => s.status === "complete").length;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            <span className="gradient-text">CI/CD</span> Integrations
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Automate security scans, requirement checking, and test runs during pull requests.
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
          style={{ color: "var(--color-text-muted)" }}
        >
          <IconRefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[rgba(139,26,26,0.1)] border border-[rgba(139,26,26,0.3)] text-[var(--color-danger)] text-xs">
          <IconAlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}
      {triggerMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[rgba(46,107,62,0.1)] border border-[rgba(46,107,62,0.3)] text-[var(--color-success)] text-xs">
          <IconCheckCircle size={16} className="shrink-0" /> {triggerMsg}
        </div>
      )}

      {/* Pipeline KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Sessions", value: sessions.length, color: "var(--color-text-primary)" },
          { label: "Completed",      value: completed,        color: "var(--color-success)" },
          { label: "Tests Generated",value: totalTests,       color: "var(--color-brown-primary)" },
          { label: "Bugs / Patches", value: `${totalBugs} / ${totalPatches}`, color: "var(--color-warning)" },
        ].map(({ label, value, color }) => (
          <GlassCard key={label} className="p-4 text-center">
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Integrations + Webhook + Trigger */}
        <div className="lg:col-span-1 space-y-6">
          {/* Trigger button */}
          <GlassCard className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>Run Pipeline</h3>
            <p className="text-[11px] mb-4" style={{ color: "var(--color-text-secondary)" }}>
              Trigger the full 13-agent pipeline against the first available project.
            </p>
            <Button
              onClick={handleTrigger}
              disabled={triggering}
              className="w-full gap-2 text-xs"
            >
              {triggering
                ? <><IconRefreshCw size={14} className="animate-spin" /> Starting…</>
                : <><IconPlay size={14} /> Trigger Pipeline</>
              }
            </Button>
          </GlassCard>

          {/* Active integrations */}
          <GlassCard className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>Integrations</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[rgba(107,79,47,0.1)] flex items-center justify-center text-[var(--color-brown-primary)] border border-[rgba(107,79,47,0.15)]">
                    <IconGitPullRequest size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>GitHub Actions</h4>
                    <span className="text-[10px] font-medium text-[var(--color-success)]">Connected</span>
                  </div>
                </div>
                <Button variant="secondary" className="text-[10px] h-7 px-2.5 rounded-lg">Config</Button>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[rgba(107,79,47,0.06)] flex items-center justify-center" style={{ color: "var(--color-text-muted)" }}>
                    <IconGitBranch size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>GitLab CI</h4>
                    <span className="text-[10px] font-medium" style={{ color: "var(--color-text-muted)" }}>Inactive</span>
                  </div>
                </div>
                <Button variant="secondary" className="text-[10px] h-7 px-2.5 rounded-lg">Connect</Button>
              </div>
            </div>
          </GlassCard>

          {/* Webhook */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <IconGlobe size={16} className="text-[var(--color-brown-primary)]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Webhook Endpoint</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "var(--color-text-muted)" }}>Payload URL</label>
                <input
                  type="text"
                  readOnly
                  value="http://localhost:8000/api/v1/agents/trigger"
                  className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs focus:outline-none font-mono"
                  style={{ color: "var(--color-text-secondary)" }}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "var(--color-text-muted)" }}>Method</label>
                <input
                  type="text"
                  readOnly
                  value="POST — Bearer token required"
                  className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs focus:outline-none font-mono"
                  style={{ color: "var(--color-text-secondary)" }}
                />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right: YAML + sessions */}
        <div className="lg:col-span-2 space-y-6">
          {/* YAML editor */}
          <GlassCard className="p-6 flex flex-col">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4 mb-4">
              <div className="flex items-center gap-2">
                <IconCode size={16} className="text-[var(--color-brown-primary)]" />
                <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>GitHub Actions Workflow File</h3>
              </div>
              <Button onClick={copyToClipboard} size="sm" className="text-xs gap-1">
                {copied ? <IconCheck size={14} /> : <IconCode size={14} />}
                {copied ? "Copied" : "Copy YAML"}
              </Button>
            </div>

            <textarea
              value={yamlCode}
              onChange={(e) => setYamlCode(e.target.value)}
              className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-5 font-mono text-[12px] leading-relaxed resize-none h-[280px] focus:outline-none focus:border-[var(--color-brown-primary)]"
              style={{ color: "var(--color-text-secondary)" }}
            />
          </GlassCard>

          {/* Session history */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <IconActivity size={16} className="text-[var(--color-success)]" />
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Pipeline Run History</h3>
              <span className="ml-auto text-[10px]" style={{ color: "var(--color-text-muted)" }}>{sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
            </div>

            {loading ? (
              <p className="text-xs text-center py-6" style={{ color: "var(--color-text-muted)" }}>Loading sessions…</p>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: "var(--color-text-muted)" }}>No pipeline runs yet. Trigger your first run above.</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {sessions.map((s) => (
                  <div
                    key={s.session_id}
                    className="flex items-start justify-between p-3.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                          {s.session_id.slice(0, 12)}…
                        </span>
                        <StatusBadge status={s.status} />
                        {s.status === "running" && (
                          <IconRefreshCw size={12} className="text-[var(--color-brown-primary)] animate-spin" />
                        )}
                      </div>
                      {s.agents_run.length > 0 && (
                        <p className="text-[10px] truncate" style={{ color: "var(--color-text-muted)" }}>
                          Agents: {s.agents_run.join(" → ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-[11px] shrink-0 pl-4" style={{ color: "var(--color-text-secondary)" }}>
                      <span className="flex items-center gap-1">
                        <IconCheckCircle size={12} className="text-[var(--color-success)]" />
                        {s.test_cases_generated} tests
                      </span>
                      <span className="flex items-center gap-1">
                        <IconAlertCircle size={12} className="text-[var(--color-warning)]" />
                        {s.bugs_found} bugs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
