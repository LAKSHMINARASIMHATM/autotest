"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Database, Info, Play, RefreshCw, Terminal, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { KnowledgeGraphExplorer } from "@/components/knowledge/graph-explorer";
import { executeCypherQuery, listProjects, indexGraph, type ProjectItem } from "@/lib/api";
import { cn } from "@/lib/utils";

const PRESET_QUERIES = [
  {
    name: "Graph Node Overview",
    query: "MATCH (n) RETURN labels(n)[0] as NodeType, count(n) as Count",
  },
  {
    name: "Projects",
    query: "MATCH (p:Project) RETURN p.name as ProjectName, p.id as ProjectID",
  },
  {
    name: "Files List",
    query: "MATCH (f:File) RETURN f.path as FilePath LIMIT 15",
  },
  {
    name: "Functions List",
    query: "MATCH (fn:Function) RETURN fn.name as FunctionName LIMIT 15",
  },
  {
    name: "Modules List",
    query: "MATCH (m:Module) RETURN m.name as ModuleName LIMIT 15",
  },
  {
    name: "REST API Endpoints",
    query: "MATCH (a:API) RETURN a.method as Method, a.path as Path LIMIT 15",
  },
];

interface QueryResult {
  rows: Record<string, unknown>[];
  source: "neo4j" | "mongodb_fallback" | "error";
  note?: string;
  neo4j_error?: string;
  error?: string;
}

// ── Cell Value Formatter ──────────────────────────────────────────────────────
function formatCellValue(val: unknown): React.ReactNode {
  if (val === null || val === undefined) {
    return <span className="text-[#4B5563] italic">null</span>;
  }
  if (typeof val === "boolean") {
    return <span className={val ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>{String(val)}</span>;
  }
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    // Neo4j Node object serialized from backend
    if (obj && typeof obj === "object" && ("properties" in obj || "labels" in obj)) {
      const labels = Array.isArray(obj.labels) ? obj.labels.join(", ") : "Node";
      const props = obj.properties && typeof obj.properties === "object"
        ? JSON.stringify(obj.properties)
        : JSON.stringify(obj);
      return (
        <div className="flex flex-col gap-0.5 max-w-[350px]">
          {labels && (
            <span className="text-[9px] font-sans font-semibold bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/30 px-1.5 py-0.5 rounded w-fit">
              :{labels}
            </span>
          )}
          <span className="text-[#D1D5DB] font-mono text-[10.5px] truncate" title={props}>{props}</span>
        </div>
      );
    }
    // Array
    if (Array.isArray(val)) {
      if (val.every((item) => typeof item === "string" || typeof item === "number")) {
        return <span className="text-[#A78BFA]">[{val.join(", ")}]</span>;
      }
      return <span className="text-[#D1D5DB] font-mono">{JSON.stringify(val)}</span>;
    }
    return <span className="text-[#D1D5DB] font-mono">{JSON.stringify(val)}</span>;
  }
  return String(val);
}

// ── Result table renders rows as a clean table with dynamic headers ──────────
function ResultTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length) return null;
  // Collect all unique keys from all rows so missing fields aren't omitted
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));

  return (
    <div className="overflow-x-auto rounded-xl border border-[rgba(255,255,255,0.06)] max-h-[450px] overflow-y-auto">
      <table className="w-full text-[11px] font-mono border-collapse">
        <thead className="sticky top-0 z-10 bg-[#121215]">
          <tr className="bg-[rgba(255,255,255,0.06)]">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left text-[#8B5CF6] font-semibold whitespace-nowrap border-b border-[rgba(255,255,255,0.08)]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={cn("transition-colors hover:bg-[rgba(255,255,255,0.03)]", i % 2 === 0 ? "bg-transparent" : "bg-[rgba(255,255,255,0.015)]")}>
              {headers.map((h) => (
                <td key={h} className="px-3 py-2 text-[#9CA3AF] border-b border-[rgba(255,255,255,0.04)] max-w-[350px] align-top">
                  {formatCellValue(row[h])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function KnowledgePage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [cypher, setCypher] = useState(PRESET_QUERIES[0].query);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "json">("table");

  const runQueryWithText = async (queryText: string) => {
    if (!queryText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await executeCypherQuery(queryText) as QueryResult;
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Query failed");
    } finally {
      setLoading(false);
    }
  };

  const runQuery = () => runQueryWithText(cypher);

  // Load projects list and run initial query on mount
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

    // Auto-run initial query so output is ready on load
    runQueryWithText(PRESET_QUERIES[0].query);
  }, []);

  const handleIndexGraph = async () => {
    if (!selectedProjectId) return;
    setIndexing(true);
    setError(null);
    setStatusMessage("Analyzing AST structure and indexing Knowledge Graph via LLM...");
    try {
      await indexGraph(selectedProjectId);
      setTimeout(() => {
        setRefreshKey((prev) => prev + 1);
        setStatusMessage("Knowledge Graph indexed and updated successfully!");
        setIndexing(false);
        setTimeout(() => setStatusMessage(null), 4000);
      }, 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to start indexing");
      setStatusMessage(null);
      setIndexing(false);
    }
  };

  const handlePreset = (queryText: string) => {
    setCypher(queryText);
    runQueryWithText(queryText);
  };

  const rows = result?.rows ?? [];
  const hasRows = rows.length > 0;
  const source = result?.source;
  const isNeo4j = source === "neo4j";
  const isFallback = source === "mongodb_fallback";
  const isError = source === "error";

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen pb-12">
      {/* Header with Project Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">
            <span className="gradient-text">Neo4j Knowledge</span> Graph
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Explore structured code topology, entity relationships, and test coverage graphs — powered by LLM & Neo4j.
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

          <div className="pt-5">
            <Button
              onClick={handleIndexGraph}
              disabled={indexing || !selectedProjectId}
              className="gap-2 text-[13px] font-semibold bg-[#8B5CF6] hover:bg-[#7C3AED]"
            >
              <RefreshCw className={`w-4 h-4 ${indexing ? "animate-spin" : ""}`} />
              {indexing ? "Indexing Code..." : "Index Structure with LLM"}
            </Button>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="bg-purple-900/20 border border-purple-700/30 text-purple-300 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${indexing ? "animate-spin" : ""}`} />
          {statusMessage}
        </div>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Graph Tree */}
        <div className="lg:col-span-1">
          <KnowledgeGraphExplorer projectId={selectedProjectId} refreshKey={refreshKey} className="h-full" />
        </div>

        {/* Right Column: Console & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Query Console */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-[#8B5CF6]" />
                <h3 className="text-[15px] font-semibold text-[#F9FAFB]">Cypher Console</h3>
                {/* Live source badge — updated after each query */}
                {!result && (
                  <span className="text-[10px] bg-[rgba(255,255,255,0.06)] text-[#6B7280] border border-[rgba(255,255,255,0.08)] px-2 py-0.5 rounded-full">
                    Ready
                  </span>
                )}
                {isNeo4j && (
                  <span className="flex items-center gap-1 text-[10px] bg-green-900/30 text-green-400 border border-green-700/30 px-2 py-0.5 rounded-full">
                    <Wifi className="w-2.5 h-2.5" /> Neo4j Live
                  </span>
                )}
                {isFallback && (
                  <span className="flex items-center gap-1 text-[10px] bg-amber-900/30 text-amber-400 border border-amber-700/30 px-2 py-0.5 rounded-full">
                    <WifiOff className="w-2.5 h-2.5" /> MongoDB Fallback
                  </span>
                )}
                {isError && (
                  <span className="flex items-center gap-1 text-[10px] bg-red-900/30 text-red-400 border border-red-700/30 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-2.5 h-2.5" /> Error
                  </span>
                )}
              </div>

              {/* Preset buttons */}
              <div className="flex flex-wrap gap-1.5 justify-end max-w-[55%]">
                {PRESET_QUERIES.map((q, i) => (
                  <Button
                    key={i}
                    variant="secondary"
                    onClick={() => handlePreset(q.query)}
                    className="text-[10px] h-6 px-2 rounded-lg"
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
                onKeyDown={(e) => {
                  // Ctrl+Enter or Cmd+Enter runs query
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    runQuery();
                  }
                }}
                rows={4}
                placeholder="Enter a Cypher query… (Ctrl+Enter to run)"
                spellCheck={false}
                className="w-full font-mono text-xs bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 pr-28 text-[#F9FAFB] placeholder:text-[#4B5563] focus:outline-none focus:border-[#8B5CF6] resize-none leading-relaxed"
              />
              <Button
                size="sm"
                onClick={runQuery}
                disabled={loading || !cypher.trim()}
                className="absolute right-3 bottom-4 bg-[#8B5CF6] hover:bg-[#7C3AED] gap-1 text-[11px] h-8"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                {loading ? "Running…" : "Execute"}
              </Button>
            </div>

            <p className="mt-2 text-[10px] text-[#4B5563]">
              Tip: Press <kbd className="bg-[rgba(255,255,255,0.06)] px-1 py-0.5 rounded text-[#6B7280]">Ctrl+Enter</kbd> to run the query.
            </p>
          </GlassCard>

          {/* Results Viewer */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#3B82F6]" />
                <h3 className="text-[15px] font-semibold text-[#F9FAFB]">Query Output</h3>
                {hasRows && (
                  <span className="text-[10px] bg-[rgba(255,255,255,0.06)] px-2 py-0.5 rounded text-[#6B7280]">
                    {rows.length} row{rows.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* View mode toggle */}
              {hasRows && (
                <div className="flex gap-1 bg-[rgba(255,255,255,0.04)] p-0.5 rounded-lg border border-[rgba(255,255,255,0.06)]">
                  <button
                    onClick={() => setViewMode("table")}
                    className={cn(
                      "text-[10px] font-medium px-2.5 py-1 rounded-md transition-all",
                      viewMode === "table"
                        ? "bg-[#8B5CF6] text-white"
                        : "text-[#6B7280] hover:text-[#F9FAFB]"
                    )}
                  >
                    Table
                  </button>
                  <button
                    onClick={() => setViewMode("json")}
                    className={cn(
                      "text-[10px] font-medium px-2.5 py-1 rounded-md transition-all",
                      viewMode === "json"
                        ? "bg-[#8B5CF6] text-white"
                        : "text-[#6B7280] hover:text-[#F9FAFB]"
                    )}
                  >
                    JSON
                  </button>
                </div>
              )}
            </div>

            {/* HTTP / query error */}
            {error && (
              <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-400 text-xs px-3 py-2 rounded-xl font-mono flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Source / fallback notice */}
            {result && isFallback && result.neo4j_error && (
              <div className="mb-3 bg-amber-900/15 border border-amber-700/25 text-amber-400 text-[11px] px-3 py-2 rounded-xl flex items-start gap-2">
                <WifiOff className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold">Neo4j offline:</span>{" "}
                  <span className="opacity-75">{result.neo4j_error}</span>
                </div>
              </div>
            )}

            {/* Fallback note */}
            {result && result.note && (
              <div className="mb-3 bg-blue-900/15 border border-blue-700/25 text-blue-400 text-[11px] px-3 py-2 rounded-xl flex items-start gap-2">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {result.note}
              </div>
            )}

            {/* Success indicator */}
            {result && isNeo4j && hasRows && (
              <div className="mb-3 bg-green-900/15 border border-green-700/25 text-green-400 text-[11px] px-3 py-2 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Query executed on live Neo4j — {rows.length} record{rows.length !== 1 ? "s" : ""} returned.
              </div>
            )}

            {/* Empty result */}
            {result && !hasRows && !error && (
              <div className="bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 text-center text-[#4B5563] text-xs font-mono">
                // Query returned 0 rows.
              </div>
            )}

            {/* No result yet */}
            {!result && !error && (
              <div className="bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 text-[#4B5563] text-[11px] font-mono">
                // Run a query to see results.
              </div>
            )}

            {/* Results */}
            {hasRows && viewMode === "table" && <ResultTable rows={rows} />}

            {hasRows && viewMode === "json" && (
              <pre className="overflow-x-auto text-[11px] font-mono bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 text-[#9CA3AF] max-h-[400px]">
                {JSON.stringify(rows, null, 2)}
              </pre>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
