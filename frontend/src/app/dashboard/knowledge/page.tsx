"use client";

import { useEffect, useState } from "react";
import { Database, Play, RefreshCw, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { KnowledgeGraphExplorer } from "@/components/knowledge/graph-explorer";
import { executeCypherQuery, listProjects, type ProjectItem } from "@/lib/api";

const PRESET_QUERIES = [
  {
    name: "List REST Endpoints",
    query: "MATCH (p:Project)-[:EXPOSES_API]->(e) RETURN e.method, e.path LIMIT 5",
  },
  {
    name: "Test → Method Traces",
    query: "MATCH (t:TestCase)-[:TESTS]->(m:Method) RETURN t.id, m.name",
  },
  {
    name: "Find Localized Bugs",
    query: "MATCH (b:Bug)-[:LOCALIZED_IN]->(m:Method) RETURN b.severity, m.name",
  },
];

export default function KnowledgePage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [cypher, setCypher] = useState(PRESET_QUERIES[0].query);
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load projects list
  useEffect(() => {
    listProjects(1, 100)
      .then((res) => {
        setProjects(res.items);
        if (res.items.length > 0) {
          setSelectedProjectId(res.items[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load projects", err);
      });
  }, []);

  const runQuery = async () => {
    if (!cypher.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await executeCypherQuery(cypher);
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Query failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = (query: string) => {
    setCypher(query);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen pb-12">
      {/* Header with Project Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">
            <span className="gradient-text">Neo4j Knowledge</span> Graph
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Explore structured code topology, entity relationships, and test coverage graphs — powered by live Neo4j Aura.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Select Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {projects.length === 0 ? (
                <option value="">No projects loaded</option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#18181B] text-[#F9FAFB]">
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Graph Tree */}
        <div className="lg:col-span-1">
          <KnowledgeGraphExplorer projectId={selectedProjectId} className="h-full" />
        </div>

        {/* Right Column: Console & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Query Console */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-[#8B5CF6]" />
                <h3 className="text-[15px] font-semibold text-[#F9FAFB]">Cypher Console</h3>
                <span className="text-[10px] bg-green-900/30 text-green-400 border border-green-700/30 px-2 py-0.5 rounded-full">
                  Live Neo4j Aura
                </span>
              </div>
              <div className="flex gap-2">
                {PRESET_QUERIES.map((q, i) => (
                  <Button
                    key={i}
                    variant="secondary"
                    onClick={() => handlePreset(q.query)}
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
                placeholder="Enter a Cypher query…"
                className="w-full font-mono text-xs bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 text-[#F9FAFB] focus:outline-none focus:border-[#8B5CF6] resize-none"
              />
              <Button
                size="sm"
                onClick={runQuery}
                disabled={loading || !cypher.trim()}
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

            {error && (
              <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-400 text-xs px-3 py-2 rounded-xl font-mono">
                {error}
              </div>
            )}

            <pre className="overflow-x-auto text-[11px] font-mono bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 text-[#9CA3AF] max-h-[300px]">
              {result === null
                ? "// Run a query to see results from your live Neo4j Aura database."
                : JSON.stringify(result, null, 2)}
            </pre>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
