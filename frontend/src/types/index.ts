/** Agent status in the orchestration pipeline. */
export type AgentStatus = "idle" | "thinking" | "running" | "success" | "error" | "waiting";

/** Single agent node in the workflow. */
export interface AgentNode {
  id: string;
  name: string;
  status: AgentStatus;
  confidence: number;
  latencyMs: number;
  description: string;
  icon: string;
}

/** Metric tile data. */
export interface MetricData {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: string;
  trend?: "up" | "down" | "neutral";
  color?: string;
}

/** Test run summary. */
export interface TestRunSummary {
  id: string;
  status: "passed" | "failed" | "running" | "pending";
  total: number;
  passed: number;
  failed: number;
  coverage: number;
  duration: string;
  timestamp: string;
}

/** Bug report entry. */
export interface BugEntry {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  file: string;
  method: string;
  line: number;
  confidence: number;
  status: "detected" | "localized" | "fixed";
}

/** Patch entry. */
export interface PatchEntry {
  id: string;
  bugId: string;
  strategy: string;
  status: "candidate" | "accepted" | "rejected";
  confidence: number;
  timestamp: string;
}

/** Activity feed item. */
export interface ActivityItem {
  id: string;
  agent: string;
  action: string;
  detail: string;
  timestamp: string;
  status: AgentStatus;
}
