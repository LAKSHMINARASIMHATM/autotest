"use client";

import { useState, useEffect, useCallback } from "react";
import {
  GitBranch, Globe, Check, Edit2, Play, GitPullRequest, Code,
  RefreshCw, CheckCircle2, AlertCircle, Clock, Activity,
} from "lucide-react";
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
    complete: "bg-emerald-500/15 text-emerald-400",
    running:  "bg-blue-500/15 text-blue-400",
    error:    "bg-red-500/15 text-red-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg[status] ?? "bg-[rgba(255,255,255,0.06)] text-[#6B7280]"}`}>
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
          <h1 className="text-[28px] font-bold tracking-tight">
            <span className="gradient-text">CI/CD</span> Integrations
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Automate security scans, requirement checking, and test runs during pull requests.
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {triggerMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {triggerMsg}
        </div>
      )}

      {/* Pipeline KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Sessions", value: sessions.length, color: "text-white" },
          { label: "Completed",      value: completed,        color: "text-emerald-400" },
          { label: "Tests Generated",value: totalTests,       color: "text-blue-400"    },
          { label: "Bugs / Patches", value: `${totalBugs} / ${totalPatches}`, color: "text-amber-400" },
        ].map(({ label, value, color }) => (
          <GlassCard key={label} className="p-4 text-center">
            <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Integrations + Webhook + Trigger */}
        <div className="lg:col-span-1 space-y-6">
          {/* Trigger button */}
          <GlassCard className="p-5">
            <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Run Pipeline</h3>
            <p className="text-[11px] text-[#9CA3AF] mb-4">
              Trigger the full 13-agent pipeline against the first available project.
            </p>
            <Button
              onClick={handleTrigger}
              disabled={triggering}
              className="w-full gap-2 text-xs"
            >
              {triggering
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Starting…</>
                : <><Play className="w-3.5 h-3.5" /> Trigger Pipeline</>
              }
            </Button>
          </GlassCard>

          {/* Active integrations */}
          <GlassCard className="p-5">
            <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Integrations</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#F9FAFB]">
                    <GitPullRequest className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">GitHub Actions</h4>
                    <span className="text-[10px] text-[#10B981] font-medium">Connected</span>
                  </div>
                </div>
                <Button variant="secondary" className="text-[10px] h-7 px-2.5 rounded-lg">Config</Button>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#6B7280]">
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">GitLab CI</h4>
                    <span className="text-[10px] text-[#6B7280] font-medium">Inactive</span>
                  </div>
                </div>
                <Button variant="secondary" className="text-[10px] h-7 px-2.5 rounded-lg">Connect</Button>
              </div>
            </div>
          </GlassCard>

          {/* Webhook */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-[#3B82F6]" />
              <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Webhook Endpoint</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-[#6B7280] uppercase tracking-wider block mb-1">Payload URL</label>
                <input
                  type="text"
                  readOnly
                  value="http://localhost:8000/api/v1/agents/trigger"
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-1.5 text-xs text-[#9CA3AF] focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#6B7280] uppercase tracking-wider block mb-1">Method</label>
                <input
                  type="text"
                  readOnly
                  value="POST — Bearer token required"
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-1.5 text-xs text-[#9CA3AF] focus:outline-none font-mono"
                />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right: YAML + sessions */}
        <div className="lg:col-span-2 space-y-6">
          {/* YAML editor */}
          <GlassCard className="p-6 flex flex-col">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.05)] pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-[#3B82F6]" />
                <h3 className="text-sm font-semibold text-[#F9FAFB]">GitHub Actions Workflow File</h3>
              </div>
              <Button onClick={copyToClipboard} size="sm" className="text-xs gap-1">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy YAML"}
              </Button>
            </div>

            <textarea
              value={yamlCode}
              onChange={(e) => setYamlCode(e.target.value)}
              className="bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 font-mono text-[12px] leading-relaxed text-[#9CA3AF] resize-none h-[280px] focus:outline-none focus:border-[#3B82F6]"
            />
          </GlassCard>

          {/* Session history */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-[#10B981]" />
              <h3 className="text-sm font-semibold text-[#F9FAFB]">Pipeline Run History</h3>
              <span className="ml-auto text-[10px] text-[#6B7280]">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
            </div>

            {loading ? (
              <p className="text-xs text-[#6B7280] text-center py-6">Loading sessions…</p>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-[#6B7280] text-center py-6">No pipeline runs yet. Trigger your first run above.</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {sessions.map((s) => (
                  <div
                    key={s.session_id}
                    className="flex items-start justify-between p-3.5 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] text-[#9CA3AF]">
                          {s.session_id.slice(0, 12)}…
                        </span>
                        <StatusBadge status={s.status} />
                        {s.status === "running" && (
                          <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
                        )}
                      </div>
                      {s.agents_run.length > 0 && (
                        <p className="text-[10px] text-[#6B7280] truncate">
                          Agents: {s.agents_run.join(" → ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-[#9CA3AF] shrink-0 pl-4">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        {s.test_cases_generated} tests
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-400" />
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
