"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { FileText, Hash, Search } from "lucide-react";

interface RetrievedChunk {
  id: string;
  source: string;
  content: string;
  score: number;
  chunkType: "code" | "doc" | "requirement" | "test";
}

const sampleChunks: RetrievedChunk[] = [
  {
    id: "1",
    source: "app/core/security.py",
    content: "def create_access_token(subject: str, role: str) → str: Creates a signed JWT access token with role claim...",
    score: 0.94,
    chunkType: "code",
  },
  {
    id: "2",
    source: "docs/requirements/SRS.md",
    content: "FR-AUTH-01: The system shall authenticate users via email and password with JWT tokens...",
    score: 0.89,
    chunkType: "requirement",
  },
  {
    id: "3",
    source: "tests/unit/test_auth.py",
    content: "def test_login_returns_valid_jwt(): Tests that login endpoint returns a valid JWT pair...",
    score: 0.85,
    chunkType: "test",
  },
  {
    id: "4",
    source: "README.md",
    content: "Authentication uses JWT with bcrypt password hashing. RBAC with Admin, Engineer, Viewer roles...",
    score: 0.78,
    chunkType: "doc",
  },
];

const chunkColors: Record<string, { bg: string; text: string }> = {
  code: { bg: "bg-[#3B82F6]/10", text: "text-[#3B82F6]" },
  doc: { bg: "bg-[#8B5CF6]/10", text: "text-[#8B5CF6]" },
  requirement: { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]" },
  test: { bg: "bg-[#10B981]/10", text: "text-[#10B981]" },
};

/**
 * RAG retrieval results panel showing retrieved chunks
 * with similarity scores and source references.
 */
export function RAGResultsPanel({ className }: { className?: string }) {
  return (
    <GlassCard className={cn("p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-semibold text-[#F9FAFB]">RAG Context</h3>
          <p className="text-xs text-[#6B7280] mt-0.5">Retrieved chunks • ChromaDB</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[rgba(59,130,246,0.08)]">
          <Search className="w-3 h-3 text-[#3B82F6]" />
          <span className="text-[11px] text-[#3B82F6] font-medium">4 results</span>
        </div>
      </div>

      <div className="space-y-2">
        {sampleChunks.map((chunk, i) => {
          const colors = chunkColors[chunk.chunkType] || chunkColors.doc;
          return (
            <motion.div
              key={chunk.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              className="px-3.5 py-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.04)] transition-colors group"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <FileText className={cn("w-3 h-3 shrink-0", colors.text)} />
                <span className="text-[11px] text-[#9CA3AF] font-mono truncate">{chunk.source}</span>
                <span className={cn("ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded", colors.bg, colors.text)}>
                  {chunk.chunkType}
                </span>
                <div className="flex items-center gap-1">
                  <Hash className="w-3 h-3 text-[#6B7280]" />
                  <span className="text-[11px] font-semibold text-[#F9FAFB]">
                    {(chunk.score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-[#6B7280] leading-relaxed line-clamp-2 group-hover:text-[#9CA3AF] transition-colors">
                {chunk.content}
              </p>
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );
}
