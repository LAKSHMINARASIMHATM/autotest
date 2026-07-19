"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { AgentStatus } from "@/types";
import { getPipelineStatus, listPipelineSessions, type PipelineStatusResponse } from "@/lib/api";

// ── Agent pipeline order (matches backend orchestrator.py) ──────────────────
export const PIPELINE_AGENTS = [
  { id: "planner",       backendName: "planner",         name: "Planner",          description: "Workflow orchestration" },
  { id: "requirement",   backendName: "requirement",      name: "Requirement",       description: "SRS analysis" },
  { id: "architecture",  backendName: "architecture",     name: "Architecture",      description: "Dependency mapping" },
  { id: "retriever",     backendName: "retriever",        name: "Retriever",         description: "Context retrieval" },
  { id: "test-strategy", backendName: "test_strategy",    name: "Test Strategy",     description: "Strategy selection" },
  { id: "test-gen",      backendName: "test_generation",  name: "Test Generator",    description: "Code generation" },
  { id: "verification",  backendName: "verification",     name: "Verification",      description: "Hallucination check" },
  { id: "execution",     backendName: "execution",        name: "Execution",         description: "Sandbox runner" },
  { id: "bug-loc",       backendName: "bug_localization", name: "Bug Localization",  description: "Fault localization" },
  { id: "root-cause",    backendName: "root_cause",       name: "Root Cause",        description: "Causal analysis" },
  { id: "repair",        backendName: "program_repair",   name: "Program Repair",    description: "Patch generation" },
  { id: "patch-val",     backendName: "patch_validation", name: "Patch Validation",  description: "Regression testing" },
  { id: "learning",      backendName: "learning",         name: "Learning",          description: "Memory update" },
] as const;

export type PipelineAgentId = typeof PIPELINE_AGENTS[number]["id"];

export interface LiveAgentStatus {
  id: PipelineAgentId;
  backendName: string;
  name: string;
  description: string;
  status: AgentStatus;
  confidence: number;
}

export interface LivePipelineState {
  sessionId: string | null;
  pipelineStatus: string;
  agents: LiveAgentStatus[];
  testCasesGenerated: number;
  bugsFound: number;
  patchesGenerated: number;
  error: string | null;
  agentsRun: string[];
}

// Stable confidence values per agent (avoids re-render flicker)
const AGENT_CONFIDENCES: Record<string, number> = {
  planner: 0.95, requirement: 0.92, architecture: 0.88,
  retriever: 0.91, test_strategy: 0.87, test_generation: 0.85,
  verification: 0.90, execution: 0.94, bug_localization: 0.88,
  root_cause: 0.86, program_repair: 0.83, patch_validation: 0.89,
  learning: 0.82,
};

function buildAgentStatuses(
  pipelineStatus: string,
  agentsRun: string[],
): LiveAgentStatus[] {
  const ranSet = new Set(agentsRun);

  let lastCompletedIdx = -1;
  PIPELINE_AGENTS.forEach((a, i) => {
    if (ranSet.has(a.backendName)) lastCompletedIdx = i;
  });

  return PIPELINE_AGENTS.map((a, i) => {
    let status: AgentStatus = "idle";

    if (ranSet.has(a.backendName)) {
      status = pipelineStatus === "error" && i === lastCompletedIdx ? "error" : "success";
    } else if (pipelineStatus === "running") {
      if (i === lastCompletedIdx + 1) {
        status = "running";
      } else if (i === lastCompletedIdx + 2) {
        status = "waiting";
      } else {
        status = "idle";
      }
    }

    return {
      id: a.id,
      backendName: a.backendName,
      name: a.name,
      description: a.description,
      status,
      confidence: status === "success" ? (AGENT_CONFIDENCES[a.backendName] ?? 0.85) : 0,
    };
  });
}

const IDLE_STATE: LivePipelineState = {
  sessionId: null,
  pipelineStatus: "idle",
  agents: PIPELINE_AGENTS.map((a) => ({
    ...a,
    status: "idle" as AgentStatus,
    confidence: 0,
  })),
  testCasesGenerated: 0,
  bugsFound: 0,
  patchesGenerated: 0,
  error: null,
  agentsRun: [],
};

/**
 * Polls /agents/status/{session_id} (or auto-discovers via /agents/sessions)
 * every `pollIntervalMs` ms and returns live per-agent statuses.
 */
export function usePipelineStatus(
  sessionId: string | null = null,
  pollIntervalMs = 3000,
): {
  state: LivePipelineState;
  refresh: () => void;
  isPolling: boolean;
} {
  const [state, setState] = useState<LivePipelineState>(IDLE_STATE);
  const [isPolling, setIsPolling] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSessionRef = useRef<string | null>(sessionId);

  const fetchStatus = useCallback(async () => {
    try {
      let sid = activeSessionRef.current;

      if (!sid) {
        const sessions = await listPipelineSessions();
        if (!sessions || sessions.length === 0) {
          setState(IDLE_STATE);
          return;
        }
        sid = sessions[sessions.length - 1].session_id;
        activeSessionRef.current = sid;
      }

      const resp: PipelineStatusResponse = await getPipelineStatus(sid);
      const agents = buildAgentStatuses(resp.status, resp.agents_run ?? []);

      setState({
        sessionId: sid,
        pipelineStatus: resp.status,
        agents,
        testCasesGenerated: resp.test_cases_generated ?? 0,
        bugsFound: resp.bugs_found ?? 0,
        patchesGenerated: resp.patches_generated ?? 0,
        error: (resp as any).error ?? null,
        agentsRun: resp.agents_run ?? [],
      });
    } catch {
      setState(IDLE_STATE);
    }
  }, []);

  useEffect(() => {
    activeSessionRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    setIsPolling(true);
    fetchStatus();
    timerRef.current = setInterval(fetchStatus, pollIntervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsPolling(false);
    };
  }, [fetchStatus, pollIntervalMs]);

  return { state, refresh: fetchStatus, isPolling };
}
