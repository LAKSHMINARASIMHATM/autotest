"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Key, Trash2, Plus, ShieldCheck, RefreshCw, AlertCircle, Clock, User, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  getAuditLog,
  getMe,
  type ApiKeyItem,
  type AuditLogEntry,
} from "@/lib/api";

const RBAC: Record<string, { scan: boolean; generate: boolean; patch: boolean; delete: boolean }> = {
  admin:    { scan: true,  generate: true,  patch: true,  delete: true  },
  engineer: { scan: true,  generate: true,  patch: true,  delete: false },
  viewer:   { scan: true,  generate: false, patch: false, delete: false },
};

export default function SecurityPage() {
  const [tokens, setTokens] = useState<ApiKeyItem[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [userRole, setUserRole] = useState<string>("engineer");
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenRole, setNewTokenRole] = useState("Engineer");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newlyCreated, setNewlyCreated] = useState<ApiKeyItem | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [keys, log, me] = await Promise.all([
        listApiKeys(),
        getAuditLog(30),
        getMe(),
      ]);
      setTokens(keys);
      setAuditLog(log);
      setUserRole(me.role.toLowerCase());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;
    setGenerating(true);
    setNewlyCreated(null);
    try {
      const created = await createApiKey(newTokenName.trim(), newTokenRole);
      setNewlyCreated(created);        // show the one-time full token
      setNewTokenName("");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeApiKey(id);
      if (newlyCreated?.id === id) setNewlyCreated(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const rbac = RBAC[userRole] ?? RBAC.viewer;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">
            <span className="gradient-text">Security</span> &amp; Access Control
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Manage API keys, define role-based access control policies, and audit access logs.
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* One-time token reveal banner */}
      {newlyCreated && (
        <GlassCard className="p-4 border border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-emerald-400 mb-1">
                Copy your new API key — it won't be shown again
              </p>
              <code className="text-[11px] font-mono text-white break-all bg-black/30 rounded px-2 py-1 block">
                {newlyCreated.token}
              </code>
            </div>
            <button
              onClick={() => setNewlyCreated(null)}
              className="text-[#6B7280] hover:text-white text-xs shrink-0"
            >
              Dismiss
            </button>
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token Management */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-5 h-5 text-[#3B82F6]" />
              <h3 className="text-[15px] font-semibold text-[#F9FAFB]">API Keys &amp; Access Tokens</h3>
            </div>

            {/* Create form */}
            <form onSubmit={handleGenerate} className="flex gap-3 mb-6 items-end">
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
              <Button type="submit" disabled={generating} className="gap-1.5 text-xs h-[34px] px-3">
                {generating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Generate Key
              </Button>
            </form>

            {/* Token list */}
            {loading ? (
              <div className="text-xs text-[#6B7280] py-4 text-center">Loading keys…</div>
            ) : tokens.length === 0 ? (
              <p className="text-xs text-[#6B7280] py-4 text-center">No API keys yet. Generate one above.</p>
            ) : (
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
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[#9CA3AF] font-medium">
                          {tk.role}
                        </span>
                        <span className="text-[10px] text-[#6B7280]">Created {tk.created}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevoke(tk.id)}
                      className="text-red-400/80 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Audit Log */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-[#8B5CF6]" />
              <h3 className="text-[15px] font-semibold text-[#F9FAFB]">Audit Log</h3>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {auditLog.length === 0 ? (
                <p className="text-xs text-[#6B7280] text-center py-4">No audit events yet.</p>
              ) : (
                auditLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-2.5 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]"
                  >
                    <Clock className="w-3.5 h-3.5 text-[#6B7280] mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono text-[#3B82F6]">{entry.action}</span>
                        {entry.resource_type && (
                          <span className="text-[10px] text-[#6B7280]">on {entry.resource_type}</span>
                        )}
                        {entry.resource_id && (
                          <span className="text-[10px] font-mono text-[#4B5563]">#{entry.resource_id.slice(0, 8)}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#6B7280] mt-0.5">{entry.timestamp}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>

        {/* RBAC Matrix */}
        <div className="lg:col-span-1">
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#8B5CF6]" />
              <h3 className="text-[15px] font-semibold text-[#F9FAFB]">RBAC Matrix</h3>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.15)]">
              <User className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span className="text-[11px] text-[#9CA3AF]">Your role:</span>
              <span className="text-[11px] font-semibold text-white capitalize">{userRole}</span>
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

              {[
                { label: "Scan Project",    adm: true,  eng: true,  vie: true  },
                { label: "Generate Tests",  adm: true,  eng: true,  vie: false },
                { label: "Accept Patches",  adm: true,  eng: true,  vie: false },
                { label: "Delete Projects", adm: true,  eng: false, vie: false },
                { label: "Manage API Keys", adm: true,  eng: false, vie: false },
              ].map(({ label, adm, eng, vie }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-[#9CA3AF]">{label}</span>
                  <div className="flex gap-6 pr-1.5">
                    {[adm, eng, vie].map((allowed, i) => (
                      allowed
                        ? <ShieldCheck key={i} className="w-3.5 h-3.5 text-[#10B981]" />
                        : <span key={i} className="w-3.5 h-3.5 flex items-center justify-center text-[#374151] text-[10px]">✕</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
