"use client";

import { useState } from "react";
import { Settings, Save, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

export default function SettingsPage() {
  const [openaiKey, setOpenaiKey] = useState("••••••••••••••••••••••••••••••••");
  const [anthropicKey, setAnthropicKey] = useState("••••••••••••••••••••••••••••••••");
  const [neo4jUri, setNeo4jUri] = useState("bolt://localhost:7687");
  const [dockerTimeout, setDockerTimeout] = useState(120);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto min-h-screen pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">
            <span className="gradient-text">Workspace</span> Settings
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Configure third-party LLM providers, database URLs, and sandbox execution parameters.
          </p>
        </div>
      </div>

      <form onSubmit={saveSettings} className="space-y-6">
        {/* AI Providers */}
        <GlassCard className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[#F9FAFB] border-b border-[rgba(255,255,255,0.05)] pb-2">AI Providers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#9CA3AF]">OpenAI API Key</label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#9CA3AF]">Anthropic API Key</label>
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>
        </GlassCard>

        {/* Database layer */}
        <GlassCard className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[#F9FAFB] border-b border-[rgba(255,255,255,0.05)] pb-2">Knowledge Layer</h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#9CA3AF]">Neo4j Connection URI</label>
              <input
                type="text"
                value={neo4jUri}
                onChange={(e) => setNeo4jUri(e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3B82F6] font-mono"
              />
            </div>
          </div>
        </GlassCard>

        {/* Docker sandbox timeout */}
        <GlassCard className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[#F9FAFB] border-b border-[rgba(255,255,255,0.05)] pb-2">Execution Sandbox</h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#9CA3AF]">Sandbox Execution Timeout (seconds)</label>
              <input
                type="number"
                value={dockerTimeout}
                onChange={(e) => setDockerTimeout(Number(e.target.value))}
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>
        </GlassCard>

        {/* Save button */}
        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={isSaving} className="gap-1.5 font-semibold text-xs py-2 h-9 px-4">
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {isSaving ? "Saving..." : saved ? "Settings Saved" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
