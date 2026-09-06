"use client";

import { useState } from "react";
import { IconSettings, IconSave, IconCheckCircle, IconRefreshCw } from "@/components/icons";
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
          <h1 className="text-[28px] font-extrabold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            <span className="gradient-text">Workspace</span> Settings
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Configure third-party LLM providers, database URLs, and sandbox execution parameters.
          </p>
        </div>
      </div>

      <form onSubmit={saveSettings} className="space-y-6">
        {/* AI Providers */}
        <GlassCard className="p-6 space-y-4">
          <h3 className="text-sm font-semibold border-b border-[var(--color-border)] pb-2" style={{ color: "var(--color-text-primary)" }}>AI Providers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>OpenAI API Key</label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-brown-primary)]"
                style={{ color: "var(--color-text-primary)" }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Anthropic API Key</label>
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-brown-primary)]"
                style={{ color: "var(--color-text-primary)" }}
              />
            </div>
          </div>
        </GlassCard>

        {/* Database layer */}
        <GlassCard className="p-6 space-y-4">
          <h3 className="text-sm font-semibold border-b border-[var(--color-border)] pb-2" style={{ color: "var(--color-text-primary)" }}>Knowledge Layer</h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Neo4j Connection URI</label>
              <input
                type="text"
                value={neo4jUri}
                onChange={(e) => setNeo4jUri(e.target.value)}
                className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-brown-primary)] font-mono"
                style={{ color: "var(--color-text-primary)" }}
              />
            </div>
          </div>
        </GlassCard>

        {/* Docker sandbox timeout */}
        <GlassCard className="p-6 space-y-4">
          <h3 className="text-sm font-semibold border-b border-[var(--color-border)] pb-2" style={{ color: "var(--color-text-primary)" }}>Execution Sandbox</h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Sandbox Execution Timeout (seconds)</label>
              <input
                type="number"
                value={dockerTimeout}
                onChange={(e) => setDockerTimeout(Number(e.target.value))}
                className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-brown-primary)]"
                style={{ color: "var(--color-text-primary)" }}
              />
            </div>
          </div>
        </GlassCard>

        {/* Human-in-the-Loop (HITL) Safety Threshold */}
        <GlassCard className="p-6 space-y-4">
          <h3 className="text-sm font-semibold border-b border-[var(--color-border)] pb-2" style={{ color: "var(--color-text-primary)" }}>
            Human-in-the-Loop (HITL) Safety Threshold
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span style={{ color: "var(--color-text-muted)" }}>Patch Confidence Trigger Threshold</span>
              <span className="font-mono text-sm" style={{ color: "var(--color-brown-primary)" }}>{dockerTimeout > 100 ? 70 : 75}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={95}
              step={5}
              defaultValue={70}
              className="w-full h-2 bg-[var(--color-border)] rounded-lg appearance-none cursor-pointer accent-[var(--color-brown-primary)]"
            />
            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              Program patches with confidence score below this threshold automatically pause execution and trigger a Human-in-the-Loop (HITL) review modal.
            </p>
          </div>
        </GlassCard>

        {/* Save button */}
        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={isSaving} className="gap-1.5 font-semibold text-xs py-2 h-9 px-4">
            {isSaving ? (
              <IconRefreshCw size={14} className="animate-spin" />
            ) : saved ? (
              <IconCheckCircle size={14} className="text-[var(--color-success)]" />
            ) : (
              <IconSave size={14} />
            )}
            {isSaving ? "Saving..." : saved ? "Settings Saved" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
