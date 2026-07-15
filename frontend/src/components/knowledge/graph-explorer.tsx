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
} from "lucide-react";
import { useState } from "react";

interface KGNode {
  id: string;
  label: string;
  type: "project" | "module" | "class" | "function" | "api" | "table" | "requirement" | "test";
  children?: KGNode[];
}

const nodeIcons: Record<string, React.ElementType> = {
  project: FolderTree,
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
  module: { bg: "bg-[#8B5CF6]/10", text: "text-[#8B5CF6]", border: "border-[#8B5CF6]/20" },
  class: { bg: "bg-[#06B6D4]/10", text: "text-[#06B6D4]", border: "border-[#06B6D4]/20" },
  function: { bg: "bg-[#10B981]/10", text: "text-[#10B981]", border: "border-[#10B981]/20" },
  api: { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", border: "border-[#F59E0B]/20" },
  table: { bg: "bg-[#EF4444]/10", text: "text-[#EF4444]", border: "border-[#EF4444]/20" },
  requirement: { bg: "bg-[#EC4899]/10", text: "text-[#EC4899]", border: "border-[#EC4899]/20" },
  test: { bg: "bg-[#10B981]/10", text: "text-[#10B981]", border: "border-[#10B981]/20" },
};

const sampleGraph: KGNode[] = [
  {
    id: "p1",
    label: "AutoTestAI",
    type: "project",
    children: [
      {
        id: "m1",
        label: "app.core",
        type: "module",
        children: [
          { id: "c1", label: "Settings", type: "class" },
          { id: "c2", label: "Security", type: "class" },
          { id: "f1", label: "create_access_token()", type: "function" },
          { id: "f2", label: "verify_password()", type: "function" },
        ],
      },
      {
        id: "m2",
        label: "app.api",
        type: "module",
        children: [
          { id: "a1", label: "POST /auth/login", type: "api" },
          { id: "a2", label: "POST /auth/register", type: "api" },
          { id: "a3", label: "GET /projects", type: "api" },
          { id: "a4", label: "POST /projects/{id}/analyze", type: "api" },
        ],
      },
      {
        id: "m3",
        label: "app.models",
        type: "module",
        children: [
          { id: "t1", label: "users", type: "table" },
          { id: "t2", label: "projects", type: "table" },
          { id: "t3", label: "test_cases", type: "table" },
          { id: "t4", label: "bug_reports", type: "table" },
        ],
      },
    ],
  },
];

function TreeNode({ node, depth = 0 }: { node: KGNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const Icon = nodeIcons[node.type] || ChevronRight;
  const colors = nodeColors[node.type] || nodeColors.module;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: depth * 0.03 }}
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
export function KnowledgeGraphExplorer({ className }: { className?: string }) {
  return (
    <GlassCard className={cn("p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-semibold text-[#F9FAFB]">Knowledge Graph</h3>
          <p className="text-xs text-[#6B7280] mt-0.5">Project structure • Neo4j</p>
        </div>
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-[11px] text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors">
          <Search className="w-3 h-3" />
          Search nodes
        </button>
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

      {/* Tree */}
      <div className="max-h-[400px] overflow-y-auto space-y-0.5">
        {sampleGraph.map((node) => (
          <TreeNode key={node.id} node={node} />
        ))}
      </div>
    </GlassCard>
  );
}
