"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Bug, CheckCircle2, Code2, FlaskConical,
  GitPullRequest, RefreshCw, ShieldCheck, Timer, TrendingUp,
} from "lucide-react";
import { MetricTile } from "@/components/ui/metric-tile";
import { AgentWorkflow } from "@/components/dashboard/agent-workflow";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { CoverageChart, BugSeverityChart, PatchStatusChart } from "@/components/dashboard/charts";
import {
  getDashboardMetrics, getCoverageTrend, getBugSeverityDist,
  getPatchStrategyBreakdown, listProjects,
  type DashboardMetrics, type CoveragePoint, type ProjectItem,
  type BugSeverityDist, type PatchStrategyBreakdown,
} from "@/lib/api";

const ALL_PROJECTS_ID = "__all__";
const stagger = { animate: { transition: { staggerChildren: 0.06 } } };

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(ALL_PROJECTS_ID);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [coverage, setCoverage] = useState<CoveragePoint[]>([]);
  const [bugDist, setBugDist] = useState<BugSeverityDist | null>(null);
  const [patchBreakdown, setPatchBreakdown] = useState<PatchStrategyBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load projects list once
  useEffect(() => {
    listProjects(1, 100).then((res) => {
      setProjects(res.items);
    }).catch(console.error);
  }, []);

  /** Merge metrics from multiple projects for the "All Projects" aggregate view */
  const buildAllMetrics = useCallback((items: ProjectItem[]): DashboardMetrics => ({
    project_id: ALL_PROJECTS_ID,
    total_test_cases: items.reduce((s, p) => s + (p.total_test_cases || 0), 0),
    total_runs: 0,
    latest_run: { passed: 0, failed: 0, total: 0, pass_rate: 0, coverage_pct: 0 },
    total_bugs: items.reduce((s, p) => s + (p.total_bugs_found || 0), 0),
    total_patches: items.reduce((s, p) => s + (p.total_patches_applied || 0), 0),
    patch_success_rate: 0,
    agents_executed: 13,
  }), []);

  const fetchMetrics = useCallback(async (pid: string, silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      if (pid === ALL_PROJECTS_ID) {
        // ── Aggregate across all projects ────────────────────────
        const res = await listProjects(1, 100);
        const allItems = res.items;

        // Use the most active project for charts
        const representative = allItems.length > 0
          ? allItems.reduce((a, b) =>
              (a.total_bugs_found + a.total_patches_applied) >= (b.total_bugs_found + b.total_patches_applied) ? a : b
            )
          : null;

        setMetrics(buildAllMetrics(allItems));

        if (representative) {
          const [cov, bugs, patches] = await Promise.all([
            getCoverageTrend(representative.id, 10),
            getBugSeverityDist(representative.id),
            getPatchStrategyBreakdown(representative.id),
          ]);
          setCoverage(cov);
          setBugDist(bugs);
          setPatchBreakdown(patches);
        }
      } else {
        // ── Single project ────────────────────────────────────────
        const [m, cov, bugs, patches] = await Promise.all([
          getDashboardMetrics(pid),
          getCoverageTrend(pid, 10),
          getBugSeverityDist(pid),
          getPatchStrategyBreakdown(pid),
        ]);
        setMetrics(m);
        setCoverage(cov);
        setBugDist(bugs);
        setPatchBreakdown(patches);
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildAllMetrics]);

  // Fetch whenever project selection changes
  useEffect(() => {
    fetchMetrics(selectedProjectId);
  }, [selectedProjectId, fetchMetrics]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchMetrics(selectedProjectId, true), 30_000);
    return () => clearInterval(interval);
  }, [selectedProjectId, fetchMetrics]);

  const isAll = selectedProjectId === ALL_PROJECTS_ID;
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <motion.div
      variants={stagger}
      initial="initial"
      animate="animate"
      className="space-y-6 max-w-[1600px] mx-auto"
    >
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-[28px] font-bold tracking-tight"
          >
            <span className="gradient-text">AI Quality</span> Dashboard
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="text-sm text-[#6B7280] mt-1"
          >
            {loading
              ? "Loading live metrics…"
              : isAll
                ? `All ${projects.length} projects · ${metrics?.agents_executed ?? 0} agents executed`
                : `${selectedProject?.name ?? ""} · ${metrics?.agents_executed ?? 0} agents executed`}
          </motion.p>
        </div>

        {/* Project selector + refresh */}
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {/* ── All Projects aggregate option ── */}
              <option value={ALL_PROJECTS_ID} className="bg-[#18181B] text-[#F9FAFB] font-semibold">
                ✦ All Projects ({projects.reduce((s, p) => s + p.total_bugs_found, 0)}B / {projects.reduce((s, p) => s + p.total_patches_applied, 0)}P)
              </option>
              {/* ── Divider ── */}
              <option disabled className="bg-[#18181B] text-[#374151]">──────────────</option>
              {/* ── Individual projects ── */}
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#18181B] text-[#F9FAFB]">
                  {p.name} ({p.total_bugs_found}B / {p.total_patches_applied}P)
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => fetchMetrics(selectedProjectId, true)}
            disabled={refreshing || loading}
            className="mb-0.5 p-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[#6B7280] hover:text-white transition-all disabled:opacity-40"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── KPI Tiles row 1 ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile
          label="Test Cases"
          value={loading ? "—" : String(metrics?.total_test_cases ?? 0)}
          icon={FlaskConical}
          color="blue"
        />
        <MetricTile
          label="Coverage"
          value={loading ? "—" : `${metrics?.latest_run?.coverage_pct?.toFixed(1) ?? 0}%`}
          icon={ShieldCheck}
          color="success"
        />
        <MetricTile
          label="Bugs Found"
          value={loading ? "—" : String(metrics?.total_bugs ?? 0)}
          icon={Bug}
          color="danger"
        />
        <MetricTile
          label="Patches Applied"
          value={loading ? "—" : String(metrics?.total_patches ?? 0)}
          icon={GitPullRequest}
          color="purple"
        />
      </div>

      {/* ── KPI Tiles row 2 ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile
          label="Pass Rate"
          value={loading ? "—" : `${metrics?.latest_run?.pass_rate?.toFixed(1) ?? 0}%`}
          icon={CheckCircle2}
          color="success"
        />
        <MetricTile
          label="Total Runs"
          value={loading ? "—" : String(metrics?.total_runs ?? 0)}
          icon={Timer}
          color="cyan"
        />
        <MetricTile
          label="Tests Passed"
          value={loading ? "—" : String(metrics?.latest_run?.passed ?? 0)}
          icon={Code2}
          color="blue"
        />
        <MetricTile
          label="Repair Success"
          value={loading ? "—" : `${metrics?.patch_success_rate?.toFixed(1) ?? 0}%`}
          icon={TrendingUp}
          color="warning"
        />
      </div>

      {/* ── Charts Row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CoverageChart data={coverage} loading={loading} />
        <BugSeverityChart data={bugDist} loading={loading} />
        <PatchStatusChart data={patchBreakdown} loading={loading} />
      </div>

      {/* ── Agent Pipeline + Activity Feed ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AgentWorkflow />
        <ActivityFeed />
      </div>
    </motion.div>
  );
}
