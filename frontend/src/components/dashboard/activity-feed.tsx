"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ActivityItem } from "@/types";
import { getProjectBugs, getProjectPatches, getProjectTestCases, getDefaultProjectId, listPipelineSessions } from "@/lib/api";
import {
  Bot,
  Brain,
  Bug,
  Code2,
  FileSearch,
  FlaskConical,
  Network,
  Shield,
  Wrench,
  Zap,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  planner: Brain,
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
 * Real-time activity feed displaying dynamic agent actions and real DB events.
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

        const [bugs, patches, testCases, sessions] = await Promise.all([
          getProjectBugs(pid).catch(() => []),
          getProjectPatches(pid).catch(() => []),
          getProjectTestCases(pid).catch(() => []),
          listPipelineSessions().catch(() => []),
        ]);

        const items: ActivityItem[] = [];

        // 1. Pipeline execution sessions
        sessions.forEach((s, idx) => {
          items.push({
            id: `session-${s.session_id || idx}`,
            agent: "planner",
            action: `Pipeline Execution ${s.status === "complete" ? "Completed" : "Running"}`,
            detail: `Generated ${s.test_cases_generated} tests, localized ${s.bugs_found} bugs, and ${s.patches_generated} patches.`,
            timestamp: `Session #${(s.session_id || "").slice(-4)}`,
            status: s.status === "complete" ? "success" : s.status === "running" ? "running" : "idle",
          });
        });

        // 2. Real bugs
        bugs.forEach((bug) => {
          items.push({
            id: `bug-${bug.id}`,
            agent: "bug-loc",
            action: bug.status === "fixed" ? "Defect Resolved & Patched" : "Defect Localized",
            detail: `Severity: ${bug.severity.toUpperCase()} | File: ${bug.file}:${bug.line || 1} (${bug.method || "handler"})`,
            timestamp: "Verified",
            status: bug.status === "fixed" ? "success" : "error",
          });
        });

        // 3. Real patches
        patches.forEach((patch) => {
          const isCommitted = patch.status === "accepted";
          items.push({
            id: `patch-${patch.id}`,
            agent: "repair",
            action: isCommitted ? "Patch Approved & Committed" : "Patch Candidate Generated",
            detail: `${patch.strategy.toUpperCase()} strategy on ${patch.file} (Confidence: ${(patch.confidence * 100).toFixed(0)}%)`,
            timestamp: patch.timestamp ? new Date(patch.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now",
            status: isCommitted ? "success" : "running",
          });
        });

        // 4. Real test cases
        testCases.slice(0, 5).forEach((tc) => {
          items.push({
            id: `tc-${tc.id}`,
            agent: "test-gen",
            action: "Test Case Synthesized",
            detail: `${tc.name} (${tc.framework || "pytest"}) in ${tc.file}`,
            timestamp: "Synthesized",
            status: "success",
          });
        });

        if (items.length > 0) {
          setActivities(items.slice(0, 8));
        } else {
          setActivities([
            {
              id: "empty",
              agent: "planner",
              action: "System Ready",
              detail: "No autonomous pipeline activities recorded yet. Trigger a scan or test run to view live agent actions.",
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
          <p className="text-xs text-[#6B7280] mt-0.5">Real-time agent actions & MongoDB metrics</p>
        </div>
      </div>

      <div className="space-y-1">
        {loading ? (
          <div className="text-xs text-[#6B7280] p-4 text-center">Loading live feed activity...</div>
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
