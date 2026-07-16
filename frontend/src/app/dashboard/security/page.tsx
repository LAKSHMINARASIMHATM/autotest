"use client";

import { useState } from "react";
import { Shield, Key, Eye, Trash2, Clipboard, Plus, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

interface AccessToken {
  id: string;
  name: string;
  token: string;
  created: string;
  role: string;
}

const initialTokens: AccessToken[] = [
  { id: "tk1", name: "GitHub actions release CI", token: "at_pk_••••••••••••••••34a1", created: "2026-07-14", role: "Engineer" },
  { id: "tk2", name: "Vercel integration bot", token: "at_pk_••••••••••••••••92b8", created: "2026-07-15", role: "Viewer" },
];

export default function SecurityPage() {
  const [tokens, setTokens] = useState<AccessToken[]>(initialTokens);
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenRole, setNewTokenRole] = useState("Engineer");

  const generateToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName) return;

    const newTk: AccessToken = {
      id: `tk_${Date.now()}`,
      name: newTokenName,
      token: `at_pk_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
      created: new Date().toISOString().split("T")[0],
      role: newTokenRole,
    };

    setTokens([...tokens, newTk]);
    setNewTokenName("");
  };

  const revokeToken = (id: string) => {
    setTokens(tokens.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen pb-12">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">
          <span className="gradient-text">Security</span> & Access Control
        </h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Manage API keys, define role-based access control policies, and audit access logs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token Management */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-5 h-5 text-[#3B82F6]" />
              <h3 className="text-[15px] font-semibold text-[#F9FAFB]">API Keys & Access Tokens</h3>
            </div>

            <form onSubmit={generateToken} className="flex gap-3 mb-6 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] text-[#6B7280] uppercase tracking-wider block">Token Description</label>
                <input
                  type="text"
                  required
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  placeholder="e.g. GitHub deploy pipeline"
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3B82F6]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-[#6B7280] uppercase tracking-wider block">Role Type</label>
                <select
                  value={newTokenRole}
                  onChange={(e) => setNewTokenRole(e.target.value)}
                  className="bg-[#18181B] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="Admin">Admin</option>
                  <option value="Engineer">Engineer</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
              <Button type="submit" className="gap-1.5 text-xs h-[34px] px-3">
                <Plus className="w-3.5 h-3.5" /> Generate Key
              </Button>
            </form>

            <div className="space-y-2">
              {tokens.map((tk) => (
                <div
                  key={tk.id}
                  className="flex items-center justify-between p-3.5 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#F9FAFB]">{tk.name}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-[#6B7280]">{tk.token}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[#9CA3AF] font-medium">{tk.role}</span>
                      <span className="text-[10px] text-[#6B7280]">Created {tk.created}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => revokeToken(tk.id)}
                    className="text-red-400/80 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Permissions Grid Matrix */}
        <div className="lg:col-span-1">
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#8B5CF6]" />
              <h3 className="text-[15px] font-semibold text-[#F9FAFB]">RBAC Matrix</h3>
            </div>
            <p className="text-xs text-[#6B7280]">Role permission privileges config matrix.</p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[rgba(255,255,255,0.05)] text-[#6B7280]">
                <span>Permission</span>
                <div className="flex gap-4">
                  <span>Adm</span>
                  <span>Eng</span>
                  <span>Vie</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9CA3AF]">Scan Project</span>
                <div className="flex gap-6 pr-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9CA3AF]">Generate Tests</span>
                <div className="flex gap-6 pr-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="w-3.5" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9CA3AF]">Accept Patches</span>
                <div className="flex gap-6 pr-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="w-3.5" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9CA3AF]">Delete Projects</span>
                <div className="flex gap-6 pr-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="w-3.5" />
                  <span className="w-3.5" />
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
