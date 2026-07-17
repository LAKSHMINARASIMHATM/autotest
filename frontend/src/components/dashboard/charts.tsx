"use client";

import { GlassCard } from "@/components/ui/glass-card";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { CoveragePoint, BugSeverityDist, PatchStrategyBreakdown } from "@/lib/api";

const tooltipStyle = {
  contentStyle: {
    background: "rgba(17,24,39,0.95)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    fontSize: "12px",
    color: "#F9FAFB",
    backdropFilter: "blur(12px)",
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
      <h3 className="text-[15px] font-semibold text-[#F9FAFB] mb-1">Coverage Trend</h3>
      <p className="text-xs text-[#6B7280] mb-5">Test coverage progression across runs</p>
      <div className="h-[200px]">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-[#6B7280]">Loading…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="coverageGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
              <XAxis dataKey="run" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip {...tooltipStyle} />
              <Area
                type="monotone"
                dataKey="coverage"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#coverageGrad)"
                dot={{ fill: "#3B82F6", r: 3, stroke: "#09090B", strokeWidth: 2 }}
                activeDot={{ r: 5, stroke: "#3B82F6", strokeWidth: 2, fill: "#09090B" }}
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

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "#EF4444",
  High: "#F59E0B",
  Medium: "#3B82F6",
  Low: "#6B7280",
};

export function BugSeverityChart({ data, loading }: BugSeverityChartProps) {
  const chartData = data
    ? [
        { severity: "Critical", count: data.critical, color: "#EF4444" },
        { severity: "High", count: data.high, color: "#F59E0B" },
        { severity: "Medium", count: data.medium, color: "#3B82F6" },
        { severity: "Low", count: data.low, color: "#6B7280" },
      ]
    : [];

  return (
    <GlassCard className="p-6">
      <h3 className="text-[15px] font-semibold text-[#F9FAFB] mb-1">Bug Severity</h3>
      <p className="text-xs text-[#6B7280] mb-5">Distribution by severity level</p>
      <div className="h-[200px]">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-[#6B7280]">Loading…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={32}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
              <XAxis dataKey="severity" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.severity} fill={entry.color} fillOpacity={0.8} />
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

const STRATEGY_COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444"];

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
      <h3 className="text-[15px] font-semibold text-[#F9FAFB] mb-1">Patch Strategies</h3>
      <p className="text-xs text-[#6B7280] mb-5">Auto-repair strategy distribution</p>
      <div className="h-[200px] flex items-center justify-center">
        {loading ? (
          <div className="text-xs text-[#6B7280]">Loading…</div>
        ) : chartData.length === 0 ? (
          <div className="text-xs text-[#6B7280]">No patches yet</div>
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
            <span className="text-[11px] text-[#9CA3AF] capitalize">{d.name}</span>
            <span className="text-[11px] font-semibold text-[#F9FAFB]">{d.value}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
