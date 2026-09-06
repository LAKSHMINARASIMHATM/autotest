"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ActivityItem } from "@/types";
import { getProjectBugs, getProjectPatches, getProjectTestCases, getDefaultProjectId, listPipelineSessions } from "@/lib/api";
import {
  IconBot,
  IconBrain,
  IconBug,
  IconCode,
  IconFileSearch,
  IconFlask,
  IconNetwork,
  IconShield,
  IconWrench,
  IconZap,
} from "@/components/icons";

const iconMap: Record<string, React.ElementType> = {
  planner:      IconBrain,
  architecture: IconNetwork,
  "test-gen":   IconCode,
  execution:    IconZap,
  "bug-loc":    IconBug,
  "root-cause": IconFileSearch,
  repair:       IconWrench,
  verification: IconShield,
  learning:     IconFlask,
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
            timestamp: patch.timestamp ? new Date(patch.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now",
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
            },
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
    <div
      className="rounded-2xl p-6 border"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        borderColor: "var(--color-border)",
        boxShadow: "var(--shadow-depth-card)",
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Activity Feed
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Real-time agent actions & MongoDB metrics
          </p>
        </div>
      </div>

      <div className="space-y-1">
        {loading ? (
          <div className="text-xs p-4 text-center" style={{ color: "var(--color-text-muted)" }}>
            Loading live feed activity...
          </div>
        ) : (
          activities.map((activity, i) => {
            const Icon = iconMap[activity.agent] || IconBot;
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 group cursor-default"
                style={{ borderRadius: "0.75rem" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--color-surface)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "";
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-200"
                  style={{ backgroundColor: "var(--color-surface)" }}
                >
                  <Icon size={14} style={{ color: "var(--color-brown-secondary)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                      {activity.action}
                    </p>
                    <StatusBadge status={activity.status} />
                  </div>
                  <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: "var(--color-text-muted)" }}>
                    {activity.detail}
                  </p>
                </div>
                <span className="text-[10px] whitespace-nowrap mt-1" style={{ color: "var(--color-text-placeholder)" }}>
                  {activity.timestamp}
                </span>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
