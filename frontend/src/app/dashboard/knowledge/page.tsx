"use client";

import { useEffect, useState } from "react";
import { IconAlertCircle, IconCheckCircle, IconDatabase, IconInfo, IconPlay, IconRefreshCw, IconTerminal, IconWifi, IconWifiOff } from "@/components/icons";
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
    return <span className="italic" style={{ color: "var(--color-text-placeholder)" }}>null</span>;
  }
  if (typeof val === "boolean") {
    return <span className={val ? "text-[var(--color-success)] font-semibold" : "text-[var(--color-danger)] font-semibold"}>{String(val)}</span>;
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
            <span className="text-[9px] font-sans font-semibold bg-[rgba(107,79,47,0.12)] text-[var(--color-brown-primary)] border border-[rgba(107,79,47,0.25)] px-1.5 py-0.5 rounded w-fit">
              :{labels}
            </span>
          )}
          <span className="font-mono text-[10.5px] truncate" style={{ color: "var(--color-text-secondary)" }} title={props}>{props}</span>
        </div>
      );
    }
    // Array
    if (Array.isArray(val)) {
      if (val.every((item) => typeof item === "string" || typeof item === "number")) {
        return <span style={{ color: "var(--color-brown-primary)" }}>[{val.join(", ")}]</span>;
      }
      return <span className="font-mono" style={{ color: "var(--color-text-secondary)" }}>{JSON.stringify(val)}</span>;
    }
    return <span className="font-mono" style={{ color: "var(--color-text-secondary)" }}>{JSON.stringify(val)}</span>;
  }
  return String(val);
}

// ── Result table renders rows as a clean table with dynamic headers ──────────
function ResultTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length) return null;
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] max-h-[450px] overflow-y-auto">
      <table className="w-full text-[11px] font-mono border-collapse">
        <thead className="sticky top-0 z-10 bg-[var(--color-bg-secondary)]">
          <tr className="bg-[var(--color-surface)]">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap border-b border-[var(--color-border)]" style={{ color: "var(--color-brown-primary)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={cn(
                "border-b border-[var(--color-border)] transition-colors hover:bg-[rgba(107,79,47,0.04)]",
                i % 2 === 0 ? "bg-transparent" : "bg-[rgba(107,79,47,0.02)]"
              )}
            >
              {headers.map((h) => (
                <td key={h} className="px-3 py-2 whitespace-nowrap text-xs">
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
  const [cypher, setCypher] = useState<string>("MATCH (n) RETURN labels(n)[0] as NodeType, count(n) as Count");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"query" | "explorer">("explorer");

  // Re-index state
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [indexing, setIndexing] = useState<boolean>(false);
  const [indexMessage, setIndexMessage] = useState<string | null>(null);

  // Load projects list
  useEffect(() => {
    listProjects(1, 100)
      .then((res) => {
        setProjects(res.items);
        if (res.items.length > 0) {
          setSelectedProjectId(res.items[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleExecute = async (queryToRun?: string) => {
    const q = queryToRun || cypher;
    if (!q.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await executeCypherQuery(q);
      setResult(res as QueryResult);
    } catch (e: unknown) {
      setResult({
        rows: [],
        source: "error",
        error: e instanceof Error ? e.message : "Query execution failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReindex = async () => {
    if (!selectedProjectId) return;
    setIndexing(true);
    setIndexMessage(null);
    try {
      const res = await indexGraph(selectedProjectId);
      setIndexMessage(`Indexing complete! ${res.message || res.status}`);
      handleExecute("MATCH (n) RETURN labels(n)[0] as NodeType, count(n) as Count");
    } catch (e: unknown) {
      setIndexMessage(`Indexing failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setIndexing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            <span className="gradient-text">Knowledge</span> Graph Hub
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Inspect code architecture, dependency edges, REST APIs, and multi-agent knowledge in Neo4j.
          </p>
        </div>

        {/* View Mode Tabs + Re-index trigger */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center p-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl">
            <button
              onClick={() => setActiveTab("explorer")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "explorer"
                  ? "bg-[rgba(107,79,47,0.15)] border border-[rgba(107,79,47,0.3)] text-[var(--color-brown-primary)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              Interactive Graph
            </button>
            <button
              onClick={() => setActiveTab("query")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "query"
                  ? "bg-[rgba(107,79,47,0.15)] border border-[rgba(107,79,47,0.3)] text-[var(--color-brown-primary)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              Cypher Console
            </button>
          </div>

          {/* Re-index project button */}
          <div className="flex items-center gap-2">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={indexing}
              className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[var(--color-brown-primary)] disabled:opacity-50"
              style={{ color: "var(--color-text-primary)" }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]">
                  {p.name}
                </option>
              ))}
            </select>
            <Button
              onClick={handleReindex}
              disabled={indexing || !selectedProjectId}
              className="gap-1.5 text-xs"
            >
              <IconRefreshCw size={14} className={indexing ? "animate-spin" : ""} />
              {indexing ? "Indexing Code..." : "Re-Index Graph"}
            </Button>
          </div>
        </div>
      </div>

      {indexMessage && (
        <div className={cn(
          "px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2",
          indexMessage.includes("failed")
            ? "bg-[rgba(139,26,26,0.1)] border border-[rgba(139,26,26,0.3)] text-[var(--color-danger)]"
            : "bg-[rgba(46,107,62,0.1)] border border-[rgba(46,107,62,0.3)] text-[var(--color-success)]"
        )}>
          {indexMessage.includes("failed") ? <IconAlertCircle size={16} /> : <IconCheckCircle size={16} />}
          {indexMessage}
        </div>
      )}

      {/* Main Content View Switch */}
      {activeTab === "explorer" ? (
        <KnowledgeGraphExplorer />
      ) : (
        <div className="space-y-6">
          {/* Query Editor & Presets */}
          <GlassCard className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconTerminal size={18} className="text-[var(--color-brown-primary)]" />
                <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Cypher Query Console</h3>
              </div>

              {/* Preset buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] mr-1" style={{ color: "var(--color-text-muted)" }}>Presets:</span>
                {PRESET_QUERIES.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => {
                      setCypher(p.query);
                      handleExecute(p.query);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-all cursor-pointer"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Input area */}
            <div className="space-y-3">
              <textarea
                value={cypher}
                onChange={(e) => setCypher(e.target.value)}
                rows={3}
                placeholder="MATCH (n) RETURN n LIMIT 25..."
                className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-3.5 font-mono text-xs focus:outline-none focus:border-[var(--color-brown-primary)] transition-all"
                style={{ color: "var(--color-text-primary)" }}
              />

              <div className="flex items-center justify-between">
                <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                  Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] font-mono text-[10px]" style={{ color: "var(--color-text-primary)" }}>Ctrl+Enter</kbd> to execute
                </div>
                <Button
                  onClick={() => handleExecute()}
                  disabled={loading || !cypher.trim()}
                  className="gap-2 text-xs"
                >
                  {loading ? <IconRefreshCw size={14} className="animate-spin" /> : <IconPlay size={14} />}
                  {loading ? "Executing Query..." : "Run Cypher Query"}
                </Button>
              </div>
            </div>
          </GlassCard>

          {/* Query Results */}
          {result && (
            <GlassCard className="p-5 space-y-4">
              {/* Result Header & Status Source */}
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div className="flex items-center gap-2">
                  <IconDatabase size={16} className="text-[var(--color-brown-primary)]" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-primary)" }}>
                    Execution Results
                  </h4>
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    ({result.rows.length} {result.rows.length === 1 ? "record" : "records"})
                  </span>
                </div>

                {/* Source Badge */}
                <div className="flex items-center gap-2">
                  {result.source === "neo4j" && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(46,107,62,0.1)] border border-[rgba(46,107,62,0.3)] text-[10px] font-bold text-[var(--color-success)]">
                      <IconWifi size={12} /> Live Neo4j Database
                    </span>
                  )}
                  {result.source === "mongodb_fallback" && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(122,81,0,0.1)] border border-[rgba(122,81,0,0.3)] text-[10px] font-bold text-[var(--color-warning)]" title="Neo4j offline. Formatted query from MongoDB fallback.">
                      <IconWifiOff size={12} /> Mongo Fallback Mode
                    </span>
                  )}
                  {result.source === "error" && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(139,26,26,0.1)] border border-[rgba(139,26,26,0.3)] text-[10px] font-bold text-[var(--color-danger)]">
                      <IconAlertCircle size={12} /> Query Failed
                    </span>
                  )}
                </div>
              </div>

              {/* Note / Info */}
              {result.note && (
                <div className="flex items-center gap-2 text-xs bg-[rgba(122,81,0,0.08)] border border-[rgba(122,81,0,0.2)] text-[var(--color-warning)] px-3.5 py-2 rounded-xl">
                  <IconInfo size={14} className="shrink-0" />
                  <span>{result.note}</span>
                </div>
              )}

              {/* Error Box */}
              {(result.error || result.neo4j_error) && (
                <div className="bg-[rgba(139,26,26,0.1)] border border-[rgba(139,26,26,0.3)] text-[var(--color-danger)] text-xs p-4 rounded-xl font-mono space-y-1">
                  <p className="font-bold">Query Error:</p>
                  <p>{result.error || result.neo4j_error}</p>
                </div>
              )}

              {/* Table */}
              {result.rows.length > 0 ? (
                <ResultTable rows={result.rows} />
              ) : (
                !result.error && (
                  <p className="text-xs py-8 text-center" style={{ color: "var(--color-text-muted)" }}>
                    Query executed successfully. 0 records returned.
                  </p>
                )
              )}
            </GlassCard>
          )}
        </div>
      )}
    </div>
  );
}
