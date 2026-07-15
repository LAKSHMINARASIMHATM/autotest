"use client";

import { GlassCard } from "@/components/ui/glass-card";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* ── Coverage Over Time (Area Chart) ─────────────────────────── */

const coverageData = [
  { run: "R1", coverage: 42 },
  { run: "R2", coverage: 55 },
  { run: "R3", coverage: 61 },
  { run: "R4", coverage: 68 },
  { run: "R5", coverage: 72 },
  { run: "R6", coverage: 78 },
  { run: "R7", coverage: 82 },
  { run: "R8", coverage: 85 },
];

export function CoverageChart() {
  return (
    <GlassCard className="p-6">
      <h3 className="text-[15px] font-semibold text-[#F9FAFB] mb-1">Coverage Trend</h3>
      <p className="text-xs text-[#6B7280] mb-5">Test coverage progression across runs</p>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={coverageData}>
            <defs>
              <linearGradient id="coverageGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
            <XAxis dataKey="run" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                background: "rgba(17,24,39,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                fontSize: "12px",
                color: "#F9FAFB",
                backdropFilter: "blur(12px)",
              }}
            />
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
      </div>
    </GlassCard>
  );
}

/* ── Bug Severity Distribution (Bar Chart) ───────────────────── */

const bugData = [
  { severity: "Critical", count: 3, color: "#EF4444" },
  { severity: "High", count: 8, color: "#F59E0B" },
  { severity: "Medium", count: 14, color: "#3B82F6" },
  { severity: "Low", count: 7, color: "#6B7280" },
];

export function BugSeverityChart() {
  return (
    <GlassCard className="p-6">
      <h3 className="text-[15px] font-semibold text-[#F9FAFB] mb-1">Bug Severity</h3>
      <p className="text-xs text-[#6B7280] mb-5">Distribution by severity level</p>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bugData} barSize={32}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
            <XAxis dataKey="severity" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "rgba(17,24,39,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                fontSize: "12px",
                color: "#F9FAFB",
              }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {bugData.map((entry) => (
                <Cell key={entry.severity} fill={entry.color} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

/* ── Patch Status Donut ──────────────────────────────────────── */

const patchData = [
  { name: "Accepted", value: 18, color: "#10B981" },
  { name: "Candidate", value: 5, color: "#3B82F6" },
  { name: "Rejected", value: 3, color: "#EF4444" },
];

export function PatchStatusChart() {
  return (
    <GlassCard className="p-6">
      <h3 className="text-[15px] font-semibold text-[#F9FAFB] mb-1">Patch Status</h3>
      <p className="text-xs text-[#6B7280] mb-5">Auto-repair success rate</p>
      <div className="h-[200px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={patchData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {patchData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "rgba(17,24,39,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                fontSize: "12px",
                color: "#F9FAFB",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-4 mt-2">
        {patchData.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-[11px] text-[#9CA3AF]">{d.name}</span>
            <span className="text-[11px] font-semibold text-[#F9FAFB]">{d.value}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
