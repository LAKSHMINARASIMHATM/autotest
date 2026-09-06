"use client";

import { useState, useEffect, useCallback } from "react";
import {
  IconShield, IconKey, IconTrash, IconPlus, IconShieldCheck, IconRefreshCw, IconAlertCircle, IconClock, IconUser, IconActivity
} from "@/components/icons";
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
          <h1 className="text-[28px] font-extrabold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            <span className="gradient-text">Security</span> &amp; Access Control
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Manage API keys, define role-based access control policies, and audit access logs.
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
          style={{ color: "var(--color-text-muted)" }}
        >
          <IconRefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[rgba(139,26,26,0.1)] border border-[rgba(139,26,26,0.3)] text-[var(--color-danger)] text-xs">
          <IconAlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* One-time token reveal banner */}
      {newlyCreated && (
        <GlassCard className="p-4 border border-[rgba(46,107,62,0.3)] bg-[rgba(46,107,62,0.06)]">
          <div className="flex items-start gap-3">
            <IconShieldCheck size={18} className="text-[var(--color-success)] mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--color-success)] mb-1">
                Copy your new API key — it won't be shown again
              </p>
              <code className="text-[11px] font-mono break-all bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded px-2 py-1 block" style={{ color: "var(--color-text-primary)" }}>
                {newlyCreated.token}
              </code>
            </div>
            <button
              onClick={() => setNewlyCreated(null)}
              className="text-xs shrink-0 cursor-pointer"
              style={{ color: "var(--color-text-muted)" }}
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
              <IconKey size={20} className="text-[var(--color-brown-primary)]" />
              <h3 className="text-[15px] font-semibold" style={{ color: "var(--color-text-primary)" }}>API Keys &amp; Access Tokens</h3>
            </div>

            {/* Create form */}
            <form onSubmit={handleGenerate} className="flex gap-3 mb-6 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] uppercase tracking-wider block font-semibold" style={{ color: "var(--color-text-muted)" }}>Token Description</label>
                <input
                  type="text"
                  required
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  placeholder="e.g. GitHub deploy pipeline"
                  className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[var(--color-brown-primary)]"
                  style={{ color: "var(--color-text-primary)" }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider block font-semibold" style={{ color: "var(--color-text-muted)" }}>Role Type</label>
                <select
                  value={newTokenRole}
                  onChange={(e) => setNewTokenRole(e.target.value)}
                  className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-xs focus:outline-none"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  <option value="Admin">Admin</option>
                  <option value="Engineer">Engineer</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
              <Button type="submit" disabled={generating} className="gap-1.5 text-xs h-[34px] px-3">
                {generating ? <IconRefreshCw size={14} className="animate-spin" /> : <IconPlus size={14} />}
                Generate Key
              </Button>
            </form>

            {/* Token list */}
            {loading ? (
              <div className="text-xs py-4 text-center" style={{ color: "var(--color-text-muted)" }}>Loading keys…</div>
            ) : tokens.length === 0 ? (
              <p className="text-xs py-4 text-center" style={{ color: "var(--color-text-muted)" }}>No API keys yet. Generate one above.</p>
            ) : (
              <div className="space-y-2">
                {tokens.map((tk) => (
                  <div
                    key={tk.id}
                    className="flex items-center justify-between p-3.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>{tk.name}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono" style={{ color: "var(--color-text-muted)" }}>{tk.token}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(107,79,47,0.1)] font-medium" style={{ color: "var(--color-brown-primary)" }}>
                          {tk.role}
                        </span>
                        <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>Created {tk.created}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevoke(tk.id)}
                      className="text-[var(--color-danger)] opacity-80 hover:opacity-100 p-2 hover:bg-[rgba(139,26,26,0.1)] rounded-lg transition-colors cursor-pointer"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Audit Log */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <IconActivity size={20} className="text-[var(--color-brown-primary)]" />
              <h3 className="text-[15px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Audit Log</h3>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {auditLog.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: "var(--color-text-muted)" }}>No audit events yet.</p>
              ) : (
                auditLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]"
                  >
                    <IconClock size={14} className="mt-0.5 shrink-0" style={{ color: "var(--color-text-muted)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono text-[var(--color-brown-primary)]">{entry.action}</span>
                        {entry.resource_type && (
                          <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>on {entry.resource_type}</span>
                        )}
                        {entry.resource_id && (
                          <span className="text-[10px] font-mono opacity-70" style={{ color: "var(--color-text-muted)" }}>#{entry.resource_id.slice(0, 8)}</span>
                        )}
                      </div>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{entry.timestamp}</p>
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
              <IconShield size={20} className="text-[var(--color-brown-primary)]" />
              <h3 className="text-[15px] font-semibold" style={{ color: "var(--color-text-primary)" }}>RBAC Matrix</h3>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[rgba(107,79,47,0.08)] border border-[rgba(107,79,47,0.2)]">
              <IconUser size={14} className="text-[var(--color-brown-primary)]" />
              <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Your role:</span>
              <span className="text-[11px] font-semibold capitalize" style={{ color: "var(--color-text-primary)" }}>{userRole}</span>
            </div>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Role permission privileges config matrix.</p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[var(--color-border)]" style={{ color: "var(--color-text-muted)" }}>
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
                  <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
                  <div className="flex gap-6 pr-1.5">
                    {[adm, eng, vie].map((allowed, i) => (
                      allowed
                        ? <IconShieldCheck key={i} size={14} className="text-[var(--color-success)]" />
                        : <span key={i} className="w-3.5 h-3.5 flex items-center justify-center text-[10px]" style={{ color: "var(--color-text-muted)" }}>✕</span>
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
