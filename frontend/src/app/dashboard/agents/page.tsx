"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  ClipboardCheck,
  Network,
  Search,
  Target,
  Code2,
  ShieldCheck,
  Play,
  Microscope,
  FileSearch,
  Wrench,
  GitCompare,
  FlaskConical,
  Filter,
} from "lucide-react";
import { AgentCard } from "@/components/agents/agent-card";
import { ExplanationCard } from "@/components/agents/explanation-card";

const agentIcons = {
  planner: Brain,
  requirement: ClipboardCheck,
  architecture: Network,
  retriever: Search,
  "test-strategy": Target,
  "test-gen": Code2,
  verification: ShieldCheck,
  execution: Play,
  "bug-loc": Microscope,
  "root-cause": FileSearch,
  repair: Wrench,
  "patch-val": GitCompare,
  learning: FlaskConical,
};

interface AgentData {
  id: keyof typeof agentIcons;
  name: string;
  description: string;
  status: "idle" | "thinking" | "running" | "success" | "error" | "waiting";
  confidence: number;
  latencyMs: number;
  currentTask?: string;
  memoryUsage?: string;
  reasoningSteps?: number;
}

const initialAgents: AgentData[] = [
  { id: "planner", name: "Planner Agent", description: "Orchestrates multi-agent execution paths", status: "success", confidence: 0.96, latencyMs: 250, currentTask: "Completed structural analysis of app.api router", memoryUsage: "14 MB", reasoningSteps: 12 },
  { id: "requirement", name: "Requirement Agent", description: "Extracts code schemas and parameters from specification docs", status: "success", confidence: 0.92, latencyMs: 840, currentTask: "Parsed 42 functional rules from SRS.md", memoryUsage: "18 MB", reasoningSteps: 8 },
  { id: "architecture", name: "Architecture Agent", description: "Builds dependency trees and REST endpoint graphs", status: "success", confidence: 0.89, latencyMs: 1200, currentTask: "Resolved API handler dependency paths", memoryUsage: "32 MB", reasoningSteps: 15 },
  { id: "retriever", name: "Retriever Agent", description: "Semantic search across vector databases and indexes", status: "running", confidence: 0.91, latencyMs: 420, currentTask: "Querying ChromaDB collection for security.py context...", memoryUsage: "24 MB", reasoningSteps: 5 },
  { id: "test-strategy", name: "Test Strategy Agent", description: "Determines testing method (Unit, Integration, E2E)", status: "waiting", confidence: 0.0, latencyMs: 0, currentTask: "Awaiting dependency graph verification", memoryUsage: "8 MB", reasoningSteps: 0 },
  { id: "test-gen", name: "Test Generation Agent", description: "Generates executable test scripts", status: "idle", confidence: 0.0, latencyMs: 0, memoryUsage: "12 MB" },
  { id: "verification", name: "Verification Agent", description: "Performs syntactic/semantic validation on test code", status: "idle", confidence: 0.0, latencyMs: 0, memoryUsage: "16 MB" },
  { id: "execution", name: "Execution Agent", description: "Runs tests in secure isolated Docker sandbox", status: "idle", confidence: 0.0, latencyMs: 0, memoryUsage: "28 MB" },
  { id: "bug-loc", name: "Bug Localization Agent", description: "Pins down bugs to specific files and line numbers", status: "idle", confidence: 0.0, latencyMs: 0, memoryUsage: "20 MB" },
  { id: "root-cause", name: "Root Cause Agent", description: "Analyzes error output and logs to determine cause", status: "idle", confidence: 0.0, latencyMs: 0, memoryUsage: "22 MB" },
  { id: "repair", name: "Program Repair Agent", description: "Generates code patches to repair identified bugs", status: "idle", confidence: 0.0, latencyMs: 0, memoryUsage: "36 MB" },
  { id: "patch-val", name: "Patch Validation Agent", description: "Ensures patches don't introduce regressions", status: "idle", confidence: 0.0, latencyMs: 0, memoryUsage: "26 MB" },
  { id: "learning", name: "Learning Agent", description: "Updates long-term memories with verified fixes", status: "idle", confidence: 0.0, latencyMs: 0, memoryUsage: "10 MB" },
];

const mockExplanations = {
  retriever: {
    agent: "Retriever Agent",
    decision: "Retrieve context for JWT verify function",
    reason: "The query requested authentication mechanism details. Semantic search identified high similarity chunks inside app/core/security.py and docs/requirements/SRS.md.",
    retrievedDocs: [
      "app/core/security.py - Lines 12-45 (Similarity: 0.94)",
      "docs/requirements/SRS.md - Section 4.1 (Similarity: 0.89)",
      "tests/unit/test_auth.py - Lines 100-112 (Similarity: 0.85)",
    ],
    knowledgeGraphNodes: ["RESTEndpoint: /auth/login", "Method: verify_password", "DatabaseTable: users"],
    confidence: 0.91,
    evidence: [
      "Query keyword overlap: 'verify_password', 'authenticate', 'jwt'",
      "Dense embedding cosine similarity score: 0.9412",
      "Graph neighbor lookup matched 3 associated nodes",
    ],
  },
  planner: {
    agent: "Planner Agent",
    decision: "Establish execution path for test generation",
    reason: "Codebase analysis completed. Project has 8 modules and exposes 23 API endpoints. Initiating parallel requirement mapping and structural architecture analysis.",
    retrievedDocs: ["package.json", "pyproject.toml"],
    knowledgeGraphNodes: ["Project: AutoTestAI", "Module: app.api", "Module: app.core"],
    confidence: 0.96,
    evidence: [
      "Config schemas match Next.js frontend + FastAPI backend configuration",
      "Identified LangGraph orchestrator state checkpoint settings in core config",
    ],
  },
};

export default function AgentsPage() {
  const [filter, setFilter] = useState<"all" | "active" | "idle">("all");
  const [selectedAgent, setSelectedAgent] = useState<keyof typeof mockExplanations>("retriever");

  const filteredAgents = initialAgents.filter((agent) => {
    if (filter === "active") return ["running", "thinking", "success"].includes(agent.status);
    if (filter === "idle") return ["idle", "waiting"].includes(agent.status);
    return true;
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">
            <span className="gradient-text">Agentic</span> Command Center
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Real-time status, performance metrics, and reasoning logs of the 13 AI agents.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-1 rounded-xl shrink-0">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === "all" ? "bg-[rgba(59,130,246,0.12)] text-[#3B82F6]" : "text-[#9CA3AF] hover:text-white"
            }`}
          >
            All Agents
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === "active" ? "bg-[rgba(59,130,246,0.12)] text-[#3B82F6]" : "text-[#9CA3AF] hover:text-white"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter("idle")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === "idle" ? "bg-[rgba(59,130,246,0.12)] text-[#3B82F6]" : "text-[#9CA3AF] hover:text-white"
            }`}
          >
            Idle
          </button>
        </div>
      </div>

      {/* Main Grid: Left is agents list, Right is XAI Explanation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => {
                  if (agent.id in mockExplanations) {
                    setSelectedAgent(agent.id as keyof typeof mockExplanations);
                  }
                }}
                className={agent.id in mockExplanations ? "cursor-pointer" : ""}
              >
                <AgentCard
                  name={agent.name}
                  description={agent.description}
                  status={agent.status}
                  icon={agentIcons[agent.id]}
                  confidence={agent.confidence}
                  latencyMs={agent.latencyMs}
                  currentTask={agent.currentTask}
                  memoryUsage={agent.memoryUsage}
                  reasoningSteps={agent.reasoningSteps}
                  className={selectedAgent === agent.id ? "ring-2 ring-[#3B82F6]/50 bg-[#3B82F6]/5" : ""}
                />
              </div>
            ))}
          </div>
        </div>

        {/* XAI Panel */}
        <div className="space-y-4 lg:sticky lg:top-24 h-fit">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8B5CF6] px-1">
            <Filter className="w-3.5 h-3.5" /> Explainable AI (XAI) Trace
          </div>
          <ExplanationCard explanation={mockExplanations[selectedAgent]} />
        </div>
      </div>
    </div>
  );
}
