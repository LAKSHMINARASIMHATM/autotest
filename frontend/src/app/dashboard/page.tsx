"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bug, CheckCircle2, Code2, FlaskConical,
  GitPullRequest, ShieldCheck, Timer, TrendingUp,
} from "lucide-react";
import { MetricTile } from "@/components/ui/metric-tile";
import { AgentWorkflow } from "@/components/dashboard/agent-workflow";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { CoverageChart, BugSeverityChart, PatchStatusChart } from "@/components/dashboard/charts";
import {
  getDashboardMetrics, getCoverageTrend, getBugSeverityDist,
  getPatchStrategyBreakdown, getDefaultProjectId,
  type DashboardMetrics, type CoveragePoint,
  type BugSeverityDist, type PatchStrategyBreakdown,
} from "@/lib/api";

const stagger = { animate: { transition: { staggerChildren: 0.06 } } };

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [coverage, setCoverage] = useState<CoveragePoint[]>([]);
  const [bugDist, setBugDist] = useState<BugSeverityDist | null>(null);
  const [patchBreakdown, setPatchBreakdown] = useState<PatchStrategyBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const pid = await getDefaultProjectId();
        if (!pid) return;
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
      } catch (e) {
        console.error("Dashboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <motion.div
      variants={stagger}
      initial="initial"
      animate="animate"
      className="space-y-6 max-w-[1600px] mx-auto"
    >
      {/* ── Page Header ─────────────────────────────────────────── */}
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
            : `Autonomous software quality engineering • ${metrics?.agents_executed ?? 0} agents executed`}
        </motion.p>
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
