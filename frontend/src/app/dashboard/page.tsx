"use client";

import { motion } from "framer-motion";
import {
  Bug,
  CheckCircle2,
  Code2,
  FlaskConical,
  GitPullRequest,
  ShieldCheck,
  Timer,
  TrendingUp,
} from "lucide-react";

import { MetricTile } from "@/components/ui/metric-tile";
import { AgentWorkflow } from "@/components/dashboard/agent-workflow";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import {
  CoverageChart,
  BugSeverityChart,
  PatchStatusChart,
} from "@/components/dashboard/charts";

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

export default function DashboardPage() {
  return (
    <motion.div
      variants={stagger}
      initial="initial"
      animate="animate"
      className="space-y-6 max-w-[1600px] mx-auto"
    >
      {/* ── Page Header ───────────────────────────────────────── */}
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
          Autonomous software quality engineering • 13 agents active
        </motion.p>
      </div>

      {/* ── Metric Tiles ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile
          label="Test Cases"
          value="1,247"
          change={12.5}
          icon={FlaskConical}
          color="blue"
        />
        <MetricTile
          label="Coverage"
          value="85.3%"
          change={8.2}
          icon={ShieldCheck}
          color="success"
        />
        <MetricTile
          label="Bugs Found"
          value="32"
          change={-15.4}
          icon={Bug}
          color="danger"
        />
        <MetricTile
          label="Patches Applied"
          value="18"
          change={22.1}
          icon={GitPullRequest}
          color="purple"
        />
      </div>

      {/* ── Second Row: More metrics ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile
          label="Pass Rate"
          value="94.2%"
          change={3.1}
          icon={CheckCircle2}
          color="success"
        />
        <MetricTile
          label="Avg Latency"
          value="2.4s"
          change={-8.7}
          icon={Timer}
          color="cyan"
        />
        <MetricTile
          label="Code Analyzed"
          value="156"
          icon={Code2}
          color="blue"
        />
        <MetricTile
          label="Repair Success"
          value="69.2%"
          change={5.3}
          icon={TrendingUp}
          color="warning"
        />
      </div>

      {/* ── Charts Row ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CoverageChart />
        <BugSeverityChart />
        <PatchStatusChart />
      </div>

      {/* ── Agent Pipeline + Activity Feed ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AgentWorkflow />
        <ActivityFeed />
      </div>
    </motion.div>
  );
}
