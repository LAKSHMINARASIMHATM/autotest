"use client";

import { useState } from "react";
import { GitBranch, Globe, Check, Edit2, Play, GitPullRequest, Code, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

export default function PipelinePage() {
  const [yamlCode, setYamlCode] = useState(`name: AutoTestAI Quality Gate

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Trigger AutoTestAI Pipeline
        run: |
          curl -X POST \\
            -H "Authorization: Bearer \${{ secrets.AUTOTEST_API_KEY }}" \\
            -H "Content-Type: application/json" \\
            -d '{"branch": "\${{ github.ref_name }}"}' \\
            https://api.autotest.ai/v1/projects/analyze
`);

  const [copied, setCopied] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("https://api.autotest.ai/v1/webhooks/github");
  const [webhookSecret, setWebhookSecret] = useState("••••••••••••••••••••••••••••");

  const copyToClipboard = () => {
    navigator.clipboard.writeText(yamlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen pb-12">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">
          <span className="gradient-text">CI/CD</span> Integrations
        </h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Automate security scans, requirement checking, and test runs during pull requests.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Integrations list & Webhooks */}
        <div className="lg:col-span-1 space-y-6">
          {/* Active integrations */}
          <GlassCard className="p-5">
            <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Integrations</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#F9FAFB]">
                    <GitPullRequest className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">GitHub Actions</h4>
                    <span className="text-[10px] text-[#10B981] font-medium">Connected</span>
                  </div>
                </div>
                <Button variant="secondary" className="text-[10px] h-7 px-2.5 rounded-lg">Config</Button>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#6B7280]">
                    <GitBranch className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">GitLab CI</h4>
                    <span className="text-[10px] text-[#6B7280] font-medium">Inactive</span>
                  </div>
                </div>
                <Button variant="secondary" className="text-[10px] h-7 px-2.5 rounded-lg">Connect</Button>
              </div>
            </div>
          </GlassCard>

          {/* Webhook Configuration */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-[#3B82F6]" />
              <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Webhook Endpoint</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-[#6B7280] uppercase tracking-wider block mb-1">Payload URL</label>
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-1.5 text-xs text-[#9CA3AF] focus:outline-none font-mono"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[10px] text-[#6B7280] uppercase tracking-wider">Secret Token</label>
                  <button className="text-[10px] text-[#3B82F6] hover:underline">Reveal</button>
                </div>
                <input
                  type="password"
                  readOnly
                  value={webhookSecret}
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-1.5 text-xs text-[#9CA3AF] focus:outline-none font-mono"
                />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Column: YAML File Editor */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.05)] pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Code className="w-4.5 h-4.5 text-[#3B82F6]" />
                <h3 className="text-sm font-semibold text-[#F9FAFB]">GitHub Actions Workflow File</h3>
              </div>
              <Button onClick={copyToClipboard} size="sm" className="text-xs gap-1">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy YAML"}
              </Button>
            </div>

            <textarea
              value={yamlCode}
              onChange={(e) => setYamlCode(e.target.value)}
              className="flex-1 bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 font-mono text-[12px] leading-relaxed text-[#9CA3AF] resize-none h-[350px] focus:outline-none focus:border-[#3B82F6]"
            />
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
