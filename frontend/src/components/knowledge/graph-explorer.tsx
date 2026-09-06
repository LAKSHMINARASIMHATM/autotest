"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import {
  IconChevronRight,
  IconDatabase,
  IconFileCode,
  IconFolderGit,
  IconGlobe,
  IconLayers,
  IconSearch,
} from "@/components/icons";
import { useState, useEffect } from "react";
import { getDefaultProjectId, getProjectGraphTree } from "@/lib/api";

interface KGNode {
  id: string;
  label: string;
  type: "project" | "module" | "class" | "function" | "api" | "table" | "requirement" | "test" | "folder" | "file";
  children?: KGNode[];
}

const nodeIcons: Record<string, React.ElementType> = {
  project: IconFolderGit,
  folder: IconFolderGit,
  file: IconFileCode,
  module: IconLayers,
  class: IconFileCode,
  function: IconSearch,
  api: IconGlobe,
  table: IconDatabase,
  requirement: IconChevronRight,
  test: IconChevronRight,
};

const nodeColors: Record<string, { bg: string; text: string; border: string }> = {
  project: { bg: "bg-[rgba(107,79,47,0.12)]", text: "text-[var(--color-brown-primary)]", border: "border-[rgba(107,79,47,0.25)]" },
  folder: { bg: "bg-[rgba(107,79,47,0.1)]", text: "text-[var(--color-brown-primary)]", border: "border-[rgba(107,79,47,0.2)]" },
  file: { bg: "bg-[rgba(139,115,85,0.1)]", text: "text-[var(--color-brown-secondary)]", border: "border-[rgba(139,115,85,0.2)]" },
  module: { bg: "bg-[rgba(107,79,47,0.1)]", text: "text-[var(--color-brown-primary)]", border: "border-[rgba(107,79,47,0.2)]" },
  class: { bg: "bg-[rgba(139,115,85,0.1)]", text: "text-[var(--color-brown-secondary)]", border: "border-[rgba(139,115,85,0.2)]" },
  function: { bg: "bg-[rgba(46,107,62,0.1)]", text: "text-[var(--color-success)]", border: "border-[rgba(46,107,62,0.25)]" },
  api: { bg: "bg-[rgba(122,81,0,0.1)]", text: "text-[var(--color-warning)]", border: "border-[rgba(122,81,0,0.25)]" },
  table: { bg: "bg-[rgba(139,26,26,0.1)]", text: "text-[var(--color-danger)]", border: "border-[rgba(139,26,26,0.25)]" },
  requirement: { bg: "bg-[rgba(107,79,47,0.08)]", text: "text-[var(--color-brown-primary)]", border: "border-[rgba(107,79,47,0.2)]" },
  test: { bg: "bg-[rgba(46,107,62,0.1)]", text: "text-[var(--color-success)]", border: "border-[rgba(46,107,62,0.25)]" },
};

function TreeNode({ node, depth = 0 }: { node: KGNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const Icon = nodeIcons[node.type] || IconChevronRight;
  const colors = nodeColors[node.type] || nodeColors.module;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: Math.min(depth * 0.03, 0.3) }}
    >
      <button
        onClick={() => hasChildren && setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left transition-all duration-150",
          "hover:bg-[rgba(107,79,47,0.06)]",
          hasChildren && "cursor-pointer",
          !hasChildren && "cursor-default"
        )}
        style={{ paddingLeft: `${depth * 16 + 10}px` }}
      >
        {hasChildren && (
          <IconChevronRight
            size={12}
            className={cn(
              "text-[var(--color-text-muted)] transition-transform duration-200 shrink-0",
              expanded && "rotate-90"
            )}
          />
        )}
        {!hasChildren && <span className="w-3" />}
        <div className={cn("w-5 h-5 rounded flex items-center justify-center shrink-0", colors.bg)}>
          <Icon size={12} className={colors.text} />
        </div>
        <span className="text-[12px] font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{node.label}</span>
        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded ml-auto shrink-0", colors.bg, colors.text)}>
          {node.type}
        </span>
      </button>

      {hasChildren && expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * Interactive Knowledge Graph tree explorer.
 * Expandable/collapsible with color-coded node types.
 */
export function KnowledgeGraphExplorer({ projectId, refreshKey, className }: { projectId?: string; refreshKey?: number; className?: string }) {
  const [graphData, setGraphData] = useState<KGNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        let activeProjId = projectId;
        if (!activeProjId) {
          activeProjId = (await getDefaultProjectId()) || "";
        }
        if (!activeProjId) {
          if (active) {
            setGraphData([]);
            setLoading(false);
          }
          return;
        }

        const data = (await getProjectGraphTree(activeProjId)) as KGNode[];
        if (active) {
          setGraphData(data);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load graph data");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [projectId, refreshKey]);

  return (
    <GlassCard className={cn("p-5 flex flex-col h-full", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Knowledge Graph</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Project structure • Live Data</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(nodeColors).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1">
            <span className={cn("w-2 h-2 rounded-full", colors.bg, colors.border, "border")} />
            <span className="text-[10px] capitalize" style={{ color: "var(--color-text-muted)" }}>{type}</span>
          </div>
        ))}
      </div>

      {/* Tree content */}
      <div className="flex-1 overflow-y-auto space-y-0.5 min-h-[300px]">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full py-20 gap-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
            <div className="w-5 h-5 border-2 border-t-transparent border-[var(--color-brown-primary)] rounded-full animate-spin" />
            Loading project graph...
          </div>
        )}
        {error && (
          <div className="text-[var(--color-danger)] text-xs py-10 text-center font-mono">
            {error}
          </div>
        )}
        {!loading && !error && graphData.length === 0 && (
          <div className="flex items-center justify-center h-full py-20 text-xs" style={{ color: "var(--color-text-muted)" }}>
            No project structure loaded. Import a project first.
          </div>
        )}
        {!loading && !error && graphData.map((node) => (
          <TreeNode key={node.id} node={node} />
        ))}
      </div>
    </GlassCard>
  );
}
