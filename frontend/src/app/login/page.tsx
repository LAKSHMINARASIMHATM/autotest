"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Lock, Mail, Sparkles, User, Zap } from "lucide-react";

export default function LoginPage() {
  const { user, loading, login, register } = useAuth();
  const router = useRouter();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
        if (!fullName.trim()) {
          throw new Error("Full name is required");
        }
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#09090B] relative overflow-hidden">
        <div className="absolute w-[400px] h-[400px] bg-[#3B82F6]/5 rounded-full blur-[100px]" />
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] mb-4"
        >
          <Zap className="w-6 h-6 text-white" />
        </motion.div>
        <span className="text-xs text-[#6B7280] font-semibold tracking-wider uppercase animate-pulse">
          Loading Page
        </span>
      </div>
    );
  }

  // Prevent flash if redirecting
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden bg-[#09090B]">
      {/* Dynamic Background elements */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#3B82F6]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-[#8B5CF6]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Header Branding */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center shadow-lg mb-4"
          >
            <Zap className="w-6 h-6 text-white" />
          </motion.div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#F9FAFB]">
            AutoTest<span className="gradient-text">AI</span>
          </h2>
          <p className="text-xs text-[#6B7280] mt-1.5 font-medium tracking-wider uppercase flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#3B82F6]" /> Secure Access Portal
          </p>
        </div>

        {/* Auth Card Container */}
        <GlassCard glow="blue" flat className="p-8">
          <div className="mb-6 flex justify-center border-b border-[rgba(255,255,255,0.06)] pb-4">
            <button
              onClick={() => {
                setIsRegister(false);
                setError("");
              }}
              className={`relative px-4 py-2 text-sm font-semibold transition-colors duration-200 cursor-pointer ${
                !isRegister ? "text-[#F9FAFB]" : "text-[#6B7280] hover:text-[#9CA3AF]"
              }`}
            >
              Sign In
              {!isRegister && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute bottom-[-17px] left-0 right-0 h-[2px] bg-[#3B82F6]"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
            <button
              onClick={() => {
                setIsRegister(true);
                setError("");
              }}
              className={`relative px-4 py-2 text-sm font-semibold transition-colors duration-200 cursor-pointer ${
                isRegister ? "text-[#F9FAFB]" : "text-[#6B7280] hover:text-[#9CA3AF]"
              }`}
            >
              Register
              {isRegister && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute bottom-[-17px] left-0 right-0 h-[2px] bg-[#3B82F6]"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {isRegister && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1.5"
                >
                  <label className="text-xs font-semibold text-[#9CA3AF]">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B5563]" />
                    <input
                      type="text"
                      placeholder="Jane Doe"
                      required={isRegister}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm text-[#F9FAFB] placeholder-[#4B5563] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/50 transition-all duration-200"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#9CA3AF]">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B5563]" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm text-[#F9FAFB] placeholder-[#4B5563] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/50 transition-all duration-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-[#9CA3AF]">Password</label>
                {!isRegister && (
                  <button type="button" className="text-[11px] text-[#3B82F6] hover:underline">
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B5563]" />
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm text-[#F9FAFB] placeholder-[#4B5563] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/50 transition-all duration-200"
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-red-200 leading-relaxed">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full mt-2"
              variant="primary"
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : isRegister ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </GlassCard>

        {/* Footer info */}
        <p className="text-center text-[11px] text-[#4B5563] mt-8 leading-relaxed">
          By signing in, you agree to our Terms of Service & Privacy Policy.<br />
          AutoTestAI &copy; {new Date().getFullYear()} All Rights Reserved.
        </p>
      </div>
    </div>
  );
}
