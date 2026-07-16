"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Database, Play, RefreshCw, Terminal, Search, HelpCircle, Layers, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { KnowledgeGraphExplorer } from "@/components/knowledge/graph-explorer";

const queries = [
  { name: "List REST Endpoints", query: "MATCH (p:Project)-[:EXPOSES_API]->(e) RETURN e.method, e.path LIMIT 5" },
  { name: "Show Test to Method Traces", query: "MATCH (t:TestCase)-[:TESTS]->(m:Method) RETURN t.id, m.name" },
  { name: "Find Localized Bugs", query: "MATCH (b:Bug)-[:LOCALIZED_IN]->(m:Method) RETURN b.severity, m.name" },
];

const mockResults: Record<string, any> = {
  "MATCH (p:Project)-[:EXPOSES_API]->(e) RETURN e.method, e.path LIMIT 5": [
    { "e.method": "POST", "e.path": "/auth/login" },
    { "e.method": "POST", "e.path": "/auth/register" },
    { "e.method": "GET", "e.path": "/projects" },
    { "e.method": "POST", "e.path": "/projects/{id}/analyze" },
    { "e.method": "GET", "e.path": "/projects/{id}/requirements" },
  ],
  "MATCH (t:TestCase)-[:TESTS]->(m:Method) RETURN t.id, m.name": [
    { "t.id": "tc_001", "m.name": "verify_password" },
    { "t.id": "tc_002", "m.name": "create_access_token" },
    { "t.id": "tc_003", "m.name": "get_project_by_id" },
    { "t.id": "tc_004", "m.name": "run_analysis_pipeline" },
  ],
  "MATCH (b:Bug)-[:LOCALIZED_IN]->(m:Method) RETURN b.severity, m.name": [
    { "b.severity": "critical", "m.name": "verify_password" },
    { "b.severity": "high", "m.name": "create_access_token" },
  ],
};

export default function KnowledgePage() {
  const [cypher, setCypher] = useState(queries[0].query);
  const [result, setResult] = useState<any>(mockResults[queries[0].query]);
  const [loading, setLoading] = useState(false);

  const runQuery = () => {
    setLoading(true);
    setTimeout(() => {
      setResult(mockResults[cypher] || [{ error: "No nodes matched this Cypher query or query syntax is generic." }]);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen pb-12">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">
          <span className="gradient-text">Neo4j Knowledge</span> Graph
        </h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Explore structured code topology, entity relationships, and test coverage graphs.
        </p>
      </div>

      {/* Main layout: left tree explorer, right cypher console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Graph Tree */}
        <div className="lg:col-span-1">
          <KnowledgeGraphExplorer className="h-full" />
        </div>

        {/* Right Column: Console & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Query Console */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-[#8B5CF6]" />
                <h3 className="text-[15px] font-semibold text-[#F9FAFB]">Cypher Console</h3>
              </div>
              <div className="flex gap-2">
                {queries.map((q, i) => (
                  <Button
                    key={i}
                    variant="secondary"
                    onClick={() => {
                      setCypher(q.query);
                      setResult(mockResults[q.query] || []);
                    }}
                    className="text-[11px] h-7 px-2.5 rounded-lg"
                  >
                    {q.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="relative">
              <textarea
                value={cypher}
                onChange={(e) => setCypher(e.target.value)}
                rows={4}
                className="w-full font-mono text-xs bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 text-[#F9FAFB] focus:outline-none focus:border-[#8B5CF6] resize-none"
              />
              <Button
                size="sm"
                onClick={runQuery}
                disabled={loading}
                className="absolute right-3 bottom-4 bg-[#8B5CF6] hover:bg-[#7C3AED] gap-1 text-[11px] h-8"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Execute
              </Button>
            </div>
          </GlassCard>

          {/* Results Viewer */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#3B82F6]" />
                <h3 className="text-[15px] font-semibold text-[#F9FAFB]">Query Output</h3>
              </div>
              <span className="text-[10px] bg-[rgba(255,255,255,0.06)] px-2 py-0.5 rounded text-[#6B7280]">JSON</span>
            </div>

            <pre className="overflow-x-auto text-[11px] font-mono bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 text-[#9CA3AF] max-h-[300px]">
              {JSON.stringify(result, null, 2)}
            </pre>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
