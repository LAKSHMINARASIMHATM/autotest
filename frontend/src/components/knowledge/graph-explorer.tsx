"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import {
  ChevronRight,
  Database,
  FileCode,
  FolderTree,
  Globe,
  Layers,
  Search,
  Workflow,
  Folder,
} from "lucide-react";
import { useState } from "react";

interface KGNode {
  id: string;
  label: string;
  type: "project" | "module" | "class" | "function" | "api" | "table" | "requirement" | "test" | "folder" | "file";
  children?: KGNode[];
}

const nodeIcons: Record<string, React.ElementType> = {
  project: FolderTree,
  folder: Folder,
  file: FileCode,
  module: Layers,
  class: FileCode,
  function: Workflow,
  api: Globe,
  table: Database,
  requirement: ChevronRight,
  test: ChevronRight,
};

const nodeColors: Record<string, { bg: string; text: string; border: string }> = {
  project: { bg: "bg-[#3B82F6]/10", text: "text-[#3B82F6]", border: "border-[#3B82F6]/20" },
  folder: { bg: "bg-[#3B82F6]/10", text: "text-[#3B82F6]", border: "border-[#3B82F6]/20" },
  file: { bg: "bg-[#06B6D4]/10", text: "text-[#06B6D4]", border: "border-[#06B6D4]/20" },
  module: { bg: "bg-[#8B5CF6]/10", text: "text-[#8B5CF6]", border: "border-[#8B5CF6]/20" },
  class: { bg: "bg-[#06B6D4]/10", text: "text-[#06B6D4]", border: "border-[#06B6D4]/20" },
  function: { bg: "bg-[#10B981]/10", text: "text-[#10B981]", border: "border-[#10B981]/20" },
  api: { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", border: "border-[#F59E0B]/20" },
  table: { bg: "bg-[#EF4444]/10", text: "text-[#EF4444]", border: "border-[#EF4444]/20" },
  requirement: { bg: "bg-[#EC4899]/10", text: "text-[#EC4899]", border: "border-[#EC4899]/20" },
  test: { bg: "bg-[#10B981]/10", text: "text-[#10B981]", border: "border-[#10B981]/20" },
};

import { useEffect, type ElementType } from "react";
import { getDefaultProjectId } from "@/lib/api";

function TreeNode({ node, depth = 0 }: { node: KGNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const Icon = nodeIcons[node.type] || ChevronRight;
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
          "hover:bg-[rgba(255,255,255,0.04)]",
          hasChildren && "cursor-pointer",
          !hasChildren && "cursor-default"
        )}
        style={{ paddingLeft: `${depth * 16 + 10}px` }}
      >
        {hasChildren && (
          <ChevronRight
            className={cn(
              "w-3 h-3 text-[#4B5563] transition-transform duration-200 shrink-0",
              expanded && "rotate-90"
            )}
          />
        )}
        {!hasChildren && <span className="w-3" />}
        <div className={cn("w-5 h-5 rounded flex items-center justify-center shrink-0", colors.bg)}>
          <Icon className={cn("w-3 h-3", colors.text)} />
        </div>
        <span className="text-[12px] text-[#F9FAFB] font-medium truncate">{node.label}</span>
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
export function KnowledgeGraphExplorer({ projectId, className }: { projectId?: string; className?: string }) {
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

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
        const res = await fetch(`${apiUrl}/graph/projects/${activeProjId}/tree`);
        if (!res.ok) {
          throw new Error(`Failed to load graph tree: ${res.statusText}`);
        }
        const data = await res.json();
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
  }, [projectId]);

  return (
    <GlassCard className={cn("p-5 flex flex-col h-full", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-semibold text-[#F9FAFB]">Knowledge Graph</h3>
          <p className="text-xs text-[#6B7280] mt-0.5">Project structure • Live Data</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(nodeColors).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1">
            <span className={cn("w-2 h-2 rounded-full", colors.bg, colors.border, "border")} />
            <span className="text-[10px] text-[#6B7280] capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* Tree content */}
      <div className="flex-1 overflow-y-auto space-y-0.5 min-h-[300px]">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full py-20 text-[#9CA3AF] gap-2 text-xs">
            <div className="w-5 h-5 border-2 border-t-transparent border-[#8B5CF6] rounded-full animate-spin" />
            Loading project graph...
          </div>
        )}
        {error && (
          <div className="text-red-400 text-xs py-10 text-center font-mono">
            {error}
          </div>
        )}
        {!loading && !error && graphData.length === 0 && (
          <div className="flex items-center justify-center h-full py-20 text-[#6B7280] text-xs">
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
