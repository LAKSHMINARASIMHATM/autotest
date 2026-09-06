"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconCheckCircle,
  IconLock,
  IconMail,
  IconShield,
  IconSparkles,
  IconSun,
  IconMoon,
  IconUser,
  IconZap,
  IconNetwork,
} from "@/components/icons";
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";

export default function LoginPage() {
  const { user, loading, login, register } = useAuth();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const [isRegister, setIsRegister] = useState(false);
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [fullName,   setFullName]   = useState("");
  const [error,      setError]      = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Read URL query parameters for pre-filling email and toggle signup
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get("email");
      const modeParam = params.get("mode");
      if (emailParam) setEmail(emailParam);
      if (modeParam === "signup" || modeParam === "register") setIsRegister(true);
    }
  }, []);

  // If already logged in, redirect to dashboard immediately
  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (isRegister) {
        if (!fullName.trim()) throw new Error("Full name is required");
        await register({ email, password, full_name: fullName });
      } else {
        await login({ email, password });
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "An authentication error occurred");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: "var(--color-bg-primary)" }}
      >
        <div
          className="absolute w-[450px] h-[450px] rounded-full blur-[120px] pointer-events-none"
          style={{ backgroundColor: "var(--color-brand-glow)" }}
        />
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-xl border border-[rgba(201,169,110,0.3)]"
          style={{
            background: "linear-gradient(135deg, #C9A96E 0%, #E0C58B 100%)",
          }}
        >
          <IconZap size={26} className="text-[#090A0C]" />
        </motion.div>
        <span
          className="text-xs font-bold tracking-widest uppercase animate-pulse"
          style={{ color: "var(--color-text-muted)" }}
        >
          Initializing Secure Session
        </span>
      </div>
    );
  }

  // Prevent flash if redirecting
  if (user) return null;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    paddingLeft: "2.75rem",
    paddingRight: "1rem",
    paddingTop: "0.75rem",
    paddingBottom: "0.75rem",
    backgroundColor: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "0.875rem",
    fontSize: "0.875rem",
    color: "var(--color-text-primary)",
    outline: "none",
    transition: "border-color 200ms, box-shadow 200ms",
  };

  return (
    <div
      className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 relative overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-primary)" }}
    >
      {/* ── LEFT HALF: LUXURY BRAND VISUAL & TELEMETRY SHOWCASE ── */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 xl:p-16 overflow-hidden select-none bg-[#090A0C]">
        {/* Full Cover Hero Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
          style={{
            backgroundImage: "url('/login-hero.jpg')",
            opacity: 0.65,
          }}
        />

        {/* Ambient Dark Gradient Overlays for Depth & Legibility */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(201,169,110,0.12) 0%, transparent 60%), linear-gradient(180deg, rgba(9,10,12,0.6) 0%, rgba(9,10,12,0.3) 50%, rgba(9,10,12,0.95) 100%)",
          }}
        />

        {/* Top Branding */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center p-1.5 border shadow-lg backdrop-blur-md"
            style={{
              backgroundColor: "rgba(14, 16, 19, 0.75)",
              borderColor: "rgba(201, 169, 110, 0.4)",
            }}
          >
            <img src="/logo.png" alt="AutoTestAI" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-[#F5F3EE]">
              AutoTest<span className="gradient-text">AI</span>
            </span>
            <span
              className="ml-2 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border"
              style={{
                backgroundColor: "rgba(201, 169, 110, 0.12)",
                color: "#C9A96E",
                borderColor: "rgba(201, 169, 110, 0.3)",
              }}
            >
              Enterprise
            </span>
          </div>
        </div>

        {/* Center Floating Telemetry Card */}
        <div className="relative z-10 max-w-md my-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="p-6 rounded-2xl border backdrop-blur-xl space-y-4"
            style={{
              backgroundColor: "rgba(14, 16, 19, 0.75)",
              borderColor: "rgba(201, 169, 110, 0.25)",
              boxShadow: "0 20px 48px -10px rgba(0,0,0,0.7), 0 0 30px rgba(201,169,110,0.1)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ backgroundColor: "#3FA77A" }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-2 w-2"
                    style={{ backgroundColor: "#3FA77A" }}
                  />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C9A96E]">
                  Autonomous Multi-Agent Core
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#8E969F]">13 Agents Active</span>
            </div>

            <h3 className="text-xl font-bold tracking-tight text-[#F5F3EE] leading-snug">
              Self-Reflective AST Verification & Automated Program Repair
            </h3>

            <p className="text-xs text-[#B8B5AE] leading-relaxed">
              Synthesizing multi-strategy test suites, isolating defect lines via spectrum matrices, and auto-committing validated patches in sandboxed containers.
            </p>

            <div className="pt-2 border-t border-[#292E36] grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-[#8E969F]">Pass Rate</p>
                <p className="text-sm font-extrabold text-[#3FA77A]">99.4%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[#8E969F]">Latency</p>
                <p className="text-sm font-extrabold text-[#C9A96E]">1.2s</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[#8E969F]">Integrity</p>
                <p className="text-sm font-extrabold text-[#F5F3EE]">100% AST</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Editorial Quote */}
        <div className="relative z-10">
          <p className="text-xs text-[#B8B5AE] italic leading-relaxed">
            &ldquo;Software quality is no longer an afterthought; it is mathematically verified autonomy.&rdquo;
          </p>
          <p className="text-[11px] font-semibold text-[#8E969F] mt-1.5 flex items-center gap-1.5">
            <IconShield size={13} style={{ color: "#C9A96E" }} />
            AutoTestAI Enterprise Defense Layer
          </p>
        </div>
      </div>

      {/* ── RIGHT HALF: AUTHENTICATION INTERACTION CONSOLE ── */}
      <div className="flex flex-col justify-between p-6 sm:p-12 lg:p-16 relative z-10 min-h-screen">
        {/* Top Actions: Back to Home & Theme Switcher */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold transition-colors duration-150 group"
            style={{ color: "var(--color-text-muted)" }}
          >
            <IconArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span>Return to Overview</span>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "Dark" : "Light"} mode`}
            title={`Switch to ${theme === "light" ? "Dark" : "Light"} mode`}
            className="rounded-xl border hover:scale-105 transition-all"
            style={{ borderColor: "var(--color-border)" }}
          >
            {theme === "light" ? (
              <IconMoon size={16} className="text-[#A88647]" />
            ) : (
              <IconSun size={16} className="text-[#E0C58B]" />
            )}
          </Button>
        </div>

        {/* Center Form Container */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          {/* Mobile Logo Display */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center p-1.5 border shadow-sm"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                borderColor: "var(--color-border)",
              }}
            >
              <img src="/logo.png" alt="AutoTestAI" className="w-full h-full object-contain" />
            </div>
            <span className="text-base font-extrabold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              AutoTest<span className="gradient-text">AI</span>
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              {isRegister ? "Create Enterprise Account" : "Access Workspace"}
            </h2>
            <p className="text-xs sm:text-sm mt-1.5 font-medium" style={{ color: "var(--color-text-muted)" }}>
              {isRegister
                ? "Join leading engineering teams automating test suites and program repair."
                : "Enter your credentials to access the autonomous quality engine."}
            </p>
          </div>

          {/* Segmented Mode Switcher */}
          <div
            className="mb-8 p-1 rounded-xl border flex items-center"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            {[
              { label: "Sign In",  value: false },
              { label: "Register", value: true },
            ].map(({ label, value }) => {
              const isActive = isRegister === value;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => { setIsRegister(value); setError(""); }}
                  className="relative flex-1 py-2 text-xs font-bold transition-all duration-200 rounded-lg cursor-pointer text-center"
                  style={{
                    color: isActive ? "var(--color-text-primary)" : "var(--color-text-muted)",
                    backgroundColor: isActive ? "var(--color-bg-secondary)" : "transparent",
                    boxShadow: isActive ? "var(--shadow-subtle)" : "none",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name (register only) */}
            <AnimatePresence mode="popLayout">
              {isRegister && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1.5"
                >
                  <label className="text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>
                    Full Name
                  </label>
                  <div className="relative">
                    <IconUser
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--color-text-placeholder)" }}
                    />
                    <input
                      type="text"
                      placeholder="Dr. Eleanor Vance"
                      required={isRegister}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={inputStyle}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "var(--color-brand-primary)";
                        e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-brand-subtle)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--color-border)";
                        e.currentTarget.style.boxShadow = "";
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>
                Enterprise Email
              </label>
              <div className="relative">
                <IconMail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--color-text-placeholder)" }}
                />
                <input
                  type="email"
                  placeholder="engineer@enterprise.io"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-brand-primary)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-brand-subtle)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-border)";
                    e.currentTarget.style.boxShadow = "";
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold" style={{ color: "var(--color-text-secondary)" }}>
                  Password
                </label>
                {!isRegister && (
                  <button
                    type="button"
                    className="text-[11px] font-semibold hover:underline"
                    style={{ color: "var(--color-brand-primary)" }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <IconLock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--color-text-placeholder)" }}
                />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-brand-primary)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-brand-subtle)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-border)";
                    e.currentTarget.style.boxShadow = "";
                  }}
                />
              </div>
            </div>

            {/* Error Banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="p-3 rounded-xl flex items-start gap-2.5 border"
                  style={{
                    backgroundColor: "rgba(201, 91, 91, 0.08)",
                    borderColor: "rgba(201, 91, 91, 0.25)",
                  }}
                >
                  <IconAlertCircle size={16} style={{ color: "var(--color-danger)", flexShrink: 0, marginTop: 1 }} />
                  <span className="text-xs font-semibold leading-relaxed" style={{ color: "var(--color-danger)" }}>
                    {error}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full mt-4 h-12 text-sm font-bold shadow-lg"
              variant="primary"
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div
                    className="w-4 h-4 border-2 rounded-full animate-spin"
                    style={{
                      borderColor: "rgba(9, 10, 12, 0.3)",
                      borderTopColor: "#090A0C",
                    }}
                  />
                  <span>Authenticating...</span>
                </div>
              ) : isRegister ? "Create Enterprise Account" : "Access Console"}
            </Button>
          </form>

          {/* Security Guarantee */}
          <div className="mt-8 pt-6 border-t flex items-center justify-center gap-2 text-xs" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
            <IconCheckCircle size={14} style={{ color: "var(--color-success)" }} />
            <span>Encrypted with SHA-256 Multi-Tenant Isolation</span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] leading-relaxed font-medium" style={{ color: "var(--color-text-muted)" }}>
          Protected by multi-factor cryptographic tokens.<br />
          AutoTestAI &copy; {new Date().getFullYear()} Autonomous Quality Systems.
        </p>
      </div>
    </div>
  );
}
