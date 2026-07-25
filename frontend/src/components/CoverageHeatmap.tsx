"use client";

import React from "react";
import { BarChart3, Check, X } from "lucide-react";

export interface LineCoverageItem {
  line_number: number;
  content: str;
  covered: boolean;
}

const sampleCodeLines: LineCoverageItem[] = [
  { line_number: 1, content: "def process_payment(amount: float) -> dict:", covered: true },
  { line_number: 2, content: "    if amount <= 0:", covered: true },
  { line_number: 3, content: "        raise ValueError('Invalid payment amount')", covered: true },
  { line_number: 4, content: "    fee = amount * 0.02", covered: true },
  { line_number: 5, content: "    if fee > 50.0:", covered: false },
  { line_number: 6, content: "        fee = 50.0", covered: false },
  { line_number: 7, content: "    return {'status': 'SUCCESS', 'amount': amount, 'fee': fee}", covered: true },
];

export function CoverageHeatmap({
  filename = "app/services/payment.py",
  lines = sampleCodeLines,
  lineCoveragePct = 85.7,
}: {
  filename?: string;
  lines?: LineCoverageItem[];
  lineCoveragePct?: number;
}) {
  return (
    <div className="w-full bg-[#121318] border border-[#27272A] rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#F9FAFB]">{filename}</h3>
            <p className="text-xs text-[#6B7280]">Source Line & Branch Coverage Heatmap</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
            {lineCoveragePct}% Line Coverage
          </span>
        </div>
      </div>

      {/* Code Table Grid */}
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
    </div>
  );
}
