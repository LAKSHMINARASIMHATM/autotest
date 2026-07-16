"use client";

import { useState } from "react";
import { Search, Sliders, Database, Layers, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { RAGResultsPanel } from "@/components/knowledge/rag-results";

export default function RAGPage() {
  const [query, setQuery] = useState("Explain authentication with JWT");
  const [loading, setLoading] = useState(false);
  const [chunkSize, setChunkSize] = useState(512);
  const [overlap, setOverlap] = useState(50);
  const [topK, setTopK] = useState(4);
  const [embedModel, setEmbedModel] = useState("text-embedding-3-small");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen pb-12">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">
          <span className="gradient-text">RAG Retrieval</span> Engine
        </h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Perform semantic queries across indexed source documents, requirements, and test history.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Search & Parameters */}
        <div className="lg:col-span-1 space-y-6">
          {/* Query search form */}
          <GlassCard className="p-6">
            <h3 className="text-[15px] font-semibold text-[#F9FAFB] mb-3">Semantic Query</h3>
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#3B82F6]"
                  placeholder="Ask a codebase question..."
                />
                <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
              <Button type="submit" className="w-full gap-2 text-xs h-9" disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Retrieve Context
              </Button>
            </form>
          </GlassCard>

          {/* Search settings */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="w-4.5 h-4.5 text-[#3B82F6]" />
              <h3 className="text-[15px] font-semibold text-[#F9FAFB]">Retrieval Configuration</h3>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#9CA3AF]">Chunk Size (tokens)</span>
                  <span className="font-semibold text-white">{chunkSize}</span>
                </div>
                <input
                  type="range"
                  min={128}
                  max={2048}
                  step={128}
                  value={chunkSize}
                  onChange={(e) => setChunkSize(Number(e.target.value))}
                  className="w-full accent-[#3B82F6] h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#9CA3AF]">Chunk Overlap (tokens)</span>
                  <span className="font-semibold text-white">{overlap}</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={256}
                  step={10}
                  value={overlap}
                  onChange={(e) => setOverlap(Number(e.target.value))}
                  className="w-full accent-[#3B82F6] h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#9CA3AF]">Top K (Results)</span>
                  <span className="font-semibold text-white">{topK}</span>
                </div>
                <select
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="w-full bg-[#18181B] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value={3}>3 chunks</option>
                  <option value={4}>4 chunks</option>
                  <option value={6}>6 chunks</option>
                  <option value={8}>8 chunks</option>
                </select>
              </div>

              <div>
                <span className="text-xs text-[#9CA3AF] block mb-1.5">Embedding Model</span>
                <select
                  value={embedModel}
                  onChange={(e) => setEmbedModel(e.target.value)}
                  className="w-full bg-[#18181B] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="text-embedding-3-small">text-embedding-3-small</option>
                  <option value="text-embedding-3-large">text-embedding-3-large</option>
                  <option value="bge-large-en-v1.5">bge-large-en-v1.5</option>
                </select>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Column: ChromaDB collection info and retrieved results */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <GlassCard className="p-4 flex items-center gap-3">
              <Database className="w-8 h-8 text-[#10B981] opacity-75" />
              <div>
                <span className="text-[10px] text-[#6B7280] uppercase tracking-wider">Vector Store</span>
                <p className="text-sm font-semibold text-white">ChromaDB Local</p>
              </div>
            </GlassCard>
            <GlassCard className="p-4 flex items-center gap-3">
              <Layers className="w-8 h-8 text-[#8B5CF6] opacity-75" />
              <div>
                <span className="text-[10px] text-[#6B7280] uppercase tracking-wider">Total Chunks</span>
                <p className="text-sm font-semibold text-white">892 chunks</p>
              </div>
            </GlassCard>
          </div>

          <RAGResultsPanel />
        </div>
      </div>
    </div>
  );
}
