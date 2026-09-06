"use client";

import { GlassCard } from "@/components/ui/glass-card";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { CoveragePoint, BugSeverityDist, PatchStrategyBreakdown } from "@/lib/api";

/* Warm cream tooltip style — WCAG AA text contrast */
const tooltipStyle = {
  contentStyle: {
    background:    "rgba(250, 248, 244, 0.97)",
    border:        "1px solid rgba(139, 115, 85, 0.25)",
    borderRadius:  "12px",
    fontSize:      "12px",
    color:         "#1C1208",
    backdropFilter: "blur(12px)",
    boxShadow:     "0 8px 24px rgba(61, 43, 26, 0.12)",
  },
  labelStyle: {
    color: "#4A3728",
    fontWeight: 600,
  },
  cursor: {
    fill: "rgba(139, 115, 85, 0.06)",
  },
};

/* ── Coverage Over Time ────────────────────────────────────────── */

interface CoverageChartProps {
  data: CoveragePoint[];
  loading?: boolean;
}

export function CoverageChart({ data, loading }: CoverageChartProps) {
  const chartData = data.map((d, i) => ({ run: d.run_id || `R${i + 1}`, coverage: d.coverage }));

  return (
    <GlassCard className="p-6">
      <h3 className="text-[15px] font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
        Coverage Trend
      </h3>
      <p className="text-xs mb-5" style={{ color: "var(--color-text-muted)" }}>
        Test coverage progression across runs
      </p>
      <div className="h-[200px]">
        {loading ? (
          <div
            className="h-full flex items-center justify-center text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            Loading…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="coverageGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#059669" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#1E3A8A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(139,115,85,0.12)" strokeDasharray="4 4" />
              <XAxis
                dataKey="run"
                tick={{ fill: "#7D6352", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#7D6352", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
              />
              <Tooltip {...tooltipStyle} />
              <Area
                type="monotone"
                dataKey="coverage"
                stroke="#059669"
                strokeWidth={2.5}
                fill="url(#coverageGrad)"
                dot={{ fill: "#059669", r: 3.5, stroke: "#FFFFFF", strokeWidth: 2 }}
                activeDot={{ r: 6, stroke: "#0F294A", strokeWidth: 2, fill: "#059669" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </GlassCard>
  );
}

/* ── Bug Severity Distribution ──────────────────────────────────── */

interface BugSeverityChartProps {
  data: BugSeverityDist | null;
  loading?: boolean;
}

/** Palette — all distinct, accessible on white/cream bg */
const SEVERITY_COLORS: Record<string, string> = {
  Critical: "#8B1A1A",   // deep crimson
  High:     "#7A5100",   // deep amber
  Medium:   "#0F294A",   // dark navy blue
  Low:      "#059669",   // emerald green
};

export function BugSeverityChart({ data, loading }: BugSeverityChartProps) {
  const chartData = data
    ? [
        { severity: "Critical", count: data.critical, color: SEVERITY_COLORS.Critical },
        { severity: "High",     count: data.high,     color: SEVERITY_COLORS.High },
        { severity: "Medium",   count: data.medium,   color: SEVERITY_COLORS.Medium },
        { severity: "Low",      count: data.low,      color: SEVERITY_COLORS.Low },
      ]
    : [];

  return (
    <GlassCard className="p-6">
      <h3 className="text-[15px] font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
        Bug Severity
      </h3>
      <p className="text-xs mb-5" style={{ color: "var(--color-text-muted)" }}>
        Distribution by severity level
      </p>
      <div className="h-[200px]">
        {loading ? (
          <div
            className="h-full flex items-center justify-center text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            Loading…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={32}>
              <CartesianGrid stroke="rgba(139,115,85,0.12)" strokeDasharray="4 4" />
              <XAxis
                dataKey="severity"
                tick={{ fill: "#7D6352", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#7D6352", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.severity} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </GlassCard>
  );
}

/* ── Patch Status Donut ──────────────────────────────────────────── */

interface PatchStatusChartProps {
  data: PatchStrategyBreakdown | null;
  loading?: boolean;
}

/** Donut palette — featuring emerald green, dark navy, deep forest, and warm accents */
const STRATEGY_COLORS = ["#059669", "#0F294A", "#1E3A8A", "#10B981", "#6B4F2F"];

export function PatchStatusChart({ data, loading }: PatchStatusChartProps) {
  const chartData = data
    ? Object.entries(data).map(([name, value], i) => ({
        name,
        value,
        color: STRATEGY_COLORS[i % STRATEGY_COLORS.length],
      }))
    : [];

  return (
    <GlassCard className="p-6">
      <h3 className="text-[15px] font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
        Patch Strategies
      </h3>
      <p className="text-xs mb-5" style={{ color: "var(--color-text-muted)" }}>
        Auto-repair strategy distribution
      </p>
      <div className="h-[200px] flex items-center justify-center">
        {loading ? (
          <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>Loading…</div>
        ) : chartData.length === 0 ? (
          <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>No patches yet</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
        {chartData.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-[11px] capitalize" style={{ color: "var(--color-text-muted)" }}>
              {d.name}
            </span>
            <span className="text-[11px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {d.value}
            </span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
