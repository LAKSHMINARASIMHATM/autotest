"use client";

import React from "react";
import { BarChart3, Check, X, FileCode } from "lucide-react";

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
    <div className="w-full bg-[#121318] border border-[#27272A] rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#F9FAFB]">{filename || "Source Coverage Heatmap"}</h3>
            <p className="text-xs text-[#6B7280]">Source Line & Branch Coverage Telemetry</p>
          </div>
        </div>

        {lineCoveragePct !== undefined && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
              {lineCoveragePct.toFixed(1)}% Line Coverage
            </span>
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-[#27272A] rounded-xl bg-[#09090B]">
          <div className="w-10 h-10 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-center mb-3 text-[#6B7280]">
            <FileCode className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-semibold text-[#E4E4E7] mb-1">No Source Line Coverage Data</h4>
          <p className="text-[11px] text-[#6B7280] max-w-sm">
            Execute a test suite run or select a project file to inspect live line coverage and branch execution heatmaps.
          </p>
        </div>
      ) : (
        /* Real Code Line Grid */
        <div className="font-mono text-xs border border-[#27272A] rounded-lg overflow-hidden bg-[#09090B]">
          {lines.map((item) => (
            <div
              key={item.line_number}
              className={`flex items-center px-4 py-1.5 border-b border-[#18181B] last:border-b-0 transition-colors ${
                item.covered ? "bg-emerald-950/20 hover:bg-emerald-950/30" : "bg-rose-950/20 hover:bg-rose-950/30"
              }`}
            >
              <span className="w-8 text-[#6B7280] select-none text-right pr-3 font-semibold">{item.line_number}</span>
              <div className="w-6 flex items-center justify-center">
                {item.covered ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <X className="w-3.5 h-3.5 text-rose-400" />
                )}
              </div>
              <pre className={`pl-3 whitespace-pre text-xs ${item.covered ? "text-[#E4E4E7]" : "text-rose-300 font-semibold"}`}>
                {item.content}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
