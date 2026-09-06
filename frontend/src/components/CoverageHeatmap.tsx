"use client";

import React from "react";
import { IconBarChart, IconCheck, IconX, IconFileCode } from "@/components/icons";

export interface LineCoverageItem {
  line_number: number;
  content: string;
  covered: boolean;
}

export function CoverageHeatmap({
  filename,
  lines = [],
  lineCoveragePct,
}: {
  filename?: string;
  lines?: LineCoverageItem[];
  lineCoveragePct?: number;
}) {
  const hasData = lines && lines.length > 0;

  return (
    <div
      className="w-full rounded-xl p-5 shadow-lg border"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center border"
            style={{
              backgroundColor: "rgba(46,107,62,0.1)",
              borderColor: "rgba(46,107,62,0.2)",
            }}
          >
            <IconBarChart size={16} style={{ color: "var(--color-success)" }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {filename || "Source Coverage Heatmap"}
            </h3>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Source Line & Branch Coverage Telemetry
            </p>
          </div>
        </div>

        {lineCoveragePct !== undefined && (
          <div className="flex items-center gap-3">
            <span
              className="text-xs font-mono px-2.5 py-1 rounded-md border font-semibold"
              style={{
                color: "var(--color-success)",
                backgroundColor: "rgba(46,107,62,0.08)",
                borderColor: "rgba(46,107,62,0.25)",
              }}
            >
              {lineCoveragePct.toFixed(1)}% Line Coverage
            </span>
          </div>
        )}
      </div>

      {!hasData ? (
        <div
          className="flex flex-col items-center justify-center py-10 text-center border border-dashed rounded-xl"
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-surface)",
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 border"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              borderColor: "var(--color-border)",
              color: "var(--color-text-muted)",
            }}
          >
            <IconFileCode size={20} />
          </div>
          <h4 className="text-xs font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
            No Source Line Coverage Data
          </h4>
          <p className="text-[11px] max-w-sm" style={{ color: "var(--color-text-muted)" }}>
            Execute a test suite run or select a project file to inspect live line coverage and branch execution heatmaps.
          </p>
        </div>
      ) : (
        /* Real Code Line Grid */
        <div
          className="font-mono text-xs rounded-lg overflow-hidden border"
          style={{
            backgroundColor: "#FEFDF9",
            borderColor: "var(--color-border)",
          }}
        >
          {lines.map((item) => (
            <div
              key={item.line_number}
              className="flex items-center px-4 py-1.5 transition-colors last:border-b-0"
              style={{
                borderBottom: "1px solid rgba(139,115,85,0.08)",
                backgroundColor: item.covered
                  ? "rgba(46,107,62,0.06)"
                  : "rgba(139,26,26,0.05)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = item.covered
                  ? "rgba(46,107,62,0.12)"
                  : "rgba(139,26,26,0.10)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = item.covered
                  ? "rgba(46,107,62,0.06)"
                  : "rgba(139,26,26,0.05)";
              }}
            >
              <span
                className="w-8 select-none text-right pr-3 font-semibold"
                style={{ color: "var(--color-text-placeholder)" }}
              >
                {item.line_number}
              </span>
              <div className="w-6 flex items-center justify-center">
                {item.covered ? (
                  <IconCheck size={14} style={{ color: "var(--color-success)" }} />
                ) : (
                  <IconX size={14} style={{ color: "var(--color-danger)" }} />
                )}
              </div>
              <pre
                className="pl-3 whitespace-pre text-xs"
                style={{
                  color: item.covered ? "var(--color-text-secondary)" : "#8B1A1A",
                  fontWeight: item.covered ? 400 : 600,
                }}
              >
                {item.content}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
