"use client";

import { useEffect, useState } from "react";
import { FlaskConical, FileCode, Code2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { getProjectTestCases, getDefaultProjectId, type TestCaseItem } from "@/lib/api";

export default function TestsPage() {
  const [testCases, setTestCases] = useState<TestCaseItem[]>([]);
  const [selectedCase, setSelectedCase] = useState<TestCaseItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const pid = await getDefaultProjectId();
      if (!pid) throw new Error("No projects found. Please create a project first.");
      const cases = await getProjectTestCases(pid);
      setTestCases(cases);
      if (cases.length > 0) setSelectedCase(cases[0]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load test cases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">
            <span className="gradient-text">Test</span> Suites
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            View generated test scripts, assertion distributions, and confidence ratings.
          </p>
        </div>
        <Button onClick={fetchData} disabled={loading} className="gap-2 text-[13px] font-semibold">
          {loading ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Refreshing…</>
          ) : (
            <><Code2 className="w-4 h-4" /> Refresh</>
          )}
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/30 text-red-400 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: test file list */}
        <div className="lg:col-span-1 space-y-4">
          <GlassCard className="p-5">
            <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Generated Tests</h3>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : testCases.length === 0 ? (
              <p className="text-xs text-[#6B7280] py-4 text-center">No test cases found.</p>
            ) : (
              <div className="space-y-1">
                {testCases.map((tc) => (
                  <button
                    key={tc.id}
                    onClick={() => setSelectedCase(tc)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                      selectedCase?.id === tc.id
                        ? "bg-[rgba(59,130,246,0.12)] border-[rgba(59,130,246,0.2)] text-[#3B82F6]"
                        : "bg-transparent border-transparent text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[rgba(255,255,255,0.03)]"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      selectedCase?.id === tc.id ? "bg-[#3B82F6]/15 text-[#3B82F6]" : "bg-[rgba(255,255,255,0.06)] text-[#6B7280]"
                    }`}>
                      <FileCode className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate">{tc.name}</p>
                      <p className="text-[11px] text-[#6B7280] font-mono truncate">{tc.file}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Suite stats */}
          {selectedCase && (
            <GlassCard className="p-5 space-y-3">
              <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Suite Overview</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-[#6B7280] block">Assertions</span>
                  <span className="text-lg font-bold text-[#F9FAFB]">{selectedCase.assertions}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B7280] block">Confidence</span>
                  <span className="text-lg font-bold text-[#F9FAFB]">{(selectedCase.confidence * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B7280] block">Pass Rate</span>
                  <span className="text-lg font-bold text-[#10B981]">{selectedCase.pass_rate}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B7280] block">Framework</span>
                  <span className="text-lg font-bold text-[#F59E0B] font-mono uppercase">{selectedCase.framework}</span>
                </div>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Right column: code viewer */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6 h-full flex flex-col">
            {selectedCase ? (
              <>
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
                  <div>
                    <h3 className="text-base font-semibold text-[#F9FAFB]">{selectedCase.name}</h3>
                    <span className="text-xs font-mono text-[#6B7280]">{selectedCase.file}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded-md border border-[#10B981]/20">
                      {selectedCase.framework}
                    </span>
                  </div>
                </div>
                <div className="flex-1 bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 font-mono text-[12px] leading-relaxed overflow-x-auto text-[#9CA3AF]">
                  {(selectedCase.code || "# No code available").split("\n").map((line, idx) => (
                    <div key={idx} className="table-row">
                      <span className="table-cell text-right pr-4 select-none opacity-20 text-xs w-6">{idx + 1}</span>
                      <span className="table-cell">{line || " "}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : !loading ? (
              <div className="flex-1 flex items-center justify-center text-[#6B7280] text-sm">
                Select a test case to view its code.
              </div>
            ) : null}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
