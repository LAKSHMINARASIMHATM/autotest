"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ActivityItem } from "@/types";
import { getProjectBugs, getProjectPatches, getProjectTestCases, getDefaultProjectId } from "@/lib/api";
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

/**
 * Real-time activity feed showing agent actions chronologically.
 */
export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadActivities() {
      try {
        const pid = await getDefaultProjectId();
        if (!pid) {
          setLoading(false);
          return;
        }

        const [bugs, patches, testCases] = await Promise.all([
          getProjectBugs(pid).catch(() => []),
          getProjectPatches(pid).catch(() => []),
          getProjectTestCases(pid).catch(() => []),
        ]);

        const items: ActivityItem[] = [];

        // Map real bugs
        bugs.forEach((bug) => {
          items.push({
            id: `bug-${bug.id}`,
            agent: "bug-loc",
            action: "Defect Localized",
            detail: `Found issue in ${bug.file} at line ${bug.line} (${bug.method})`,
            timestamp: "Recent",
            status: "success",
          });
        });

        // Map real patches
        patches.forEach((patch) => {
          items.push({
            id: `patch-${patch.id}`,
            agent: "repair",
            action: "Patch Candidate Generated",
            detail: `Generated patch candidate for ${patch.file} using ${patch.strategy}`,
            timestamp: "Just now",
            status: patch.status === "candidate" ? "success" : "running",
          });
        });

        // Map real test cases
        testCases.forEach((tc) => {
          items.push({
            id: `tc-${tc.id}`,
            agent: "test-gen",
            action: "Unit Test Generated",
            detail: `Synthesized ${tc.name} with ${tc.assertions || 3} assertions`,
            timestamp: "Recent",
            status: "success",
          });
        });

        if (items.length > 0) {
          // Sort or slice latest items
          setActivities(items.slice(-6).reverse());
        } else {
          setActivities([
            {
              id: "empty",
              agent: "planner",
              action: "System Idle",
              detail: "No autonomous pipeline activities recorded yet. Run a codebase scan to populate findings.",
              timestamp: "now",
              status: "idle",
            }
          ]);
        }
      } catch (err) {
        console.error("Failed to load activity feed:", err);
      } finally {
        setLoading(false);
      }
    }

    loadActivities();
  }, []);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-semibold text-[#F9FAFB]">Activity Feed</h3>
          <p className="text-xs text-[#6B7280] mt-0.5">Real-time agent actions</p>
        </div>
      </div>

      <div className="space-y-1">
        {loading ? (
          <div className="text-xs text-[#6B7280] p-4 text-center">Loading feed activity...</div>
        ) : (
          activities.map((activity, i) => {
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
          })
        )}
      </div>
    </div>
  );
}
