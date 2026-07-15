"use client";

import { motion } from "framer-motion";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ActivityItem } from "@/types";
import {
  Bot,
  Brain,
  Bug,
  Code2,
  FileSearch,
  FlaskConical,
  Network,
  Search,
  Shield,
  Wrench,
  Zap,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  planner: Brain,
  retriever: Search,
  architecture: Network,
  "test-gen": Code2,
  execution: Zap,
  "bug-loc": Bug,
  "root-cause": FileSearch,
  repair: Wrench,
  verification: Shield,
  learning: FlaskConical,
};

const demoActivities: ActivityItem[] = [
  { id: "1", agent: "planner", action: "Workflow created", detail: "Identified 8 modules, 23 API endpoints, 156 functions", timestamp: "12s ago", status: "success" },
  { id: "2", agent: "architecture", action: "Dependency graph built", detail: "Mapped 312 edges across 156 nodes in project graph", timestamp: "28s ago", status: "success" },
  { id: "3", agent: "retriever", action: "Retrieving context", detail: "Querying ChromaDB for 23 API endpoint handlers...", timestamp: "now", status: "running" },
  { id: "4", agent: "retriever", action: "RAG indexed", detail: "Ingested 156 source files → 892 chunks → ChromaDB", timestamp: "45s ago", status: "success" },
  { id: "5", agent: "planner", action: "Requirements parsed", detail: "Extracted 42 functional, 8 non-functional requirements", timestamp: "1m ago", status: "success" },
];

/**
 * Real-time activity feed showing agent actions chronologically.
 */
export function ActivityFeed() {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-semibold text-[#F9FAFB]">Activity Feed</h3>
          <p className="text-xs text-[#6B7280] mt-0.5">Real-time agent actions</p>
        </div>
        <button className="text-xs text-[#3B82F6] hover:text-[#60A5FA] font-medium transition-colors">
          View All
        </button>
      </div>

      <div className="space-y-1">
        {demoActivities.map((activity, i) => {
          const Icon = iconMap[activity.agent] || Bot;
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-[rgba(255,255,255,0.03)] transition-colors duration-200 group"
            >
              <div className="w-7 h-7 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[rgba(255,255,255,0.1)] transition-colors">
                <Icon className="w-3.5 h-3.5 text-[#9CA3AF]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium text-[#F9FAFB] truncate">{activity.action}</p>
                  <StatusBadge status={activity.status} />
                </div>
                <p className="text-[11px] text-[#6B7280] mt-0.5 line-clamp-1">{activity.detail}</p>
              </div>
              <span className="text-[10px] text-[#4B5563] whitespace-nowrap mt-1">{activity.timestamp}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
