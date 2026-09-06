"use client";

import {
  IconBell,
  IconCommand,
  IconLogOut,
  IconSearch,
  IconSparkles,
  IconUser,
  IconShieldCheck,
  IconSun,
  IconMoon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks";
import { useTheme } from "@/context/ThemeContext";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function TopNav() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen]         = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef    = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U";

  return (
    <header
      className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 sm:px-6 transition-all backdrop-blur-xl"
      style={{
        backgroundColor: "var(--color-glass)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      {/* Search / Command Palette Trigger */}
      <div className="flex items-center gap-2 pl-10 lg:pl-0">
        <button
          aria-label="Search agents, test runs, and bugs"
          className="flex items-center gap-2.5 h-9 px-3.5 rounded-xl text-xs transition-all duration-200 w-44 sm:w-64 md:w-80 cursor-pointer group border"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
            color: "var(--color-text-muted)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
            e.currentTarget.style.borderColor = "var(--color-border-hover)";
            e.currentTarget.style.color = "var(--color-text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--color-surface)";
            e.currentTarget.style.borderColor = "var(--color-border)";
            e.currentTarget.style.color = "var(--color-text-muted)";
          }}
        >
          <IconSearch size={14} className="shrink-0 transition-colors group-hover:text-[var(--color-brand-primary)]" />
          <span className="truncate">Search agents, test runs, bugs...</span>
          <kbd
            className="ml-auto hidden sm:flex items-center gap-0.5 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md border shrink-0"
            style={{
              color: "var(--color-text-muted)",
              backgroundColor: "var(--color-bg-secondary)",
              borderColor: "var(--color-border)",
            }}
          >
            <IconCommand size={10} />K
          </kbd>
        </button>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2.5">
        {/* AI Status Badge — Navy & Maroon styling */}
        <div
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-navy-blue)" }} />
          <span className="text-xs font-bold" style={{ color: "var(--color-text-primary)" }}>
            <span style={{ color: "var(--color-navy-accent)" }}>13 Agents</span> Ready
          </span>
          <span
            className="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider badge-maroon"
          >
            LIVE
          </span>
        </div>

        {/* Light / Dark Theme Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "Dark" : "Light"} mode`}
          title={`Switch to ${theme === "light" ? "Dark" : "Light"} mode`}
          className="relative rounded-xl transition-all duration-200 hover:scale-105"
          style={{ border: "1px solid var(--color-border)" }}
        >
          {theme === "light" ? (
            <IconMoon size={16} className="text-[#A88647] transition-transform duration-200 rotate-0 hover:-rotate-12" />
          ) : (
            <IconSun size={16} className="text-[#E0C58B] transition-transform duration-200 rotate-0 hover:rotate-45" />
          )}
        </Button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Open notifications"
            className="relative rounded-xl"
            style={{ border: "1px solid var(--color-border)" }}
          >
            <IconBell size={16} style={{ color: "var(--color-text-secondary)" }} />
            <span
              className="absolute top-2 right-2 w-2 h-2 rounded-full ring-2 animate-pulse"
              style={{
                backgroundColor: "var(--color-maroon-primary)",
                boxShadow: "0 0 0 2px var(--color-bg-secondary)",
              }}
            />
          </Button>

          <AnimatePresence>
            {notificationsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.16 }}
                className="absolute right-0 mt-2 w-80 rounded-2xl p-4 shadow-2xl z-50 space-y-3"
                style={{
                  backgroundColor: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <div
                  className="flex items-center justify-between pb-2.5"
                  style={{ borderBottom: "1px solid var(--color-border)" }}
                >
                  <h4
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    Live System Telemetry
                  </h4>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md badge-maroon"
                  >
                    3 New Events
                  </span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <div
                    className="p-3 rounded-xl text-xs space-y-1 transition-all"
                    style={{
                      backgroundColor: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <p
                      className="font-semibold flex items-center gap-1.5"
                      style={{ color: "var(--color-success)" }}
                    >
                      <IconShieldCheck size={14} /> Patch Synthesis Active
                    </p>
                    <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                      Multi-agent program repair generated verified patch candidates.
                    </p>
                  </div>
                  <div
                    className="p-3 rounded-xl text-xs space-y-1 transition-all"
                    style={{
                      backgroundColor: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <p
                      className="font-semibold flex items-center gap-1.5"
                      style={{ color: "var(--color-navy-accent)" }}
                    >
                      <IconSparkles size={14} /> AST Verification Passed
                    </p>
                    <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                      Static analysis verified 100% abstract syntax tree symbol integrity.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label="Open user profile menu"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold text-white shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 border"
            style={{
              background: "linear-gradient(135deg, var(--color-maroon-primary) 0%, var(--color-navy-blue) 100%)",
              borderColor: "rgba(255, 255, 255, 0.2)",
            }}
          >
            {initial}
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.16 }}
                className="absolute right-0 mt-2 w-64 rounded-2xl p-3 shadow-2xl z-50"
                style={{
                  backgroundColor: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  backdropFilter: "blur(20px)",
                }}
              >
                {/* User info header */}
                <div
                  className="px-3 py-2.5 mb-1.5"
                  style={{ borderBottom: "1px solid var(--color-border)" }}
                >
                  <p className="text-xs font-bold truncate" style={{ color: "var(--color-text-primary)" }}>
                    {user?.full_name || "Enterprise Engineer"}
                  </p>
                  <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                    {user?.email || "engineer@autotest.ai"}
                  </p>
                </div>

                {/* Profile action */}
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium transition-colors duration-150 cursor-pointer"
                  style={{ color: "var(--color-text-secondary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
                    e.currentTarget.style.color = "var(--color-text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "";
                    e.currentTarget.style.color = "var(--color-text-secondary)";
                  }}
                >
                  <IconUser size={14} style={{ color: "var(--color-brand-primary)" }} />
                  Workspace Profile
                </button>

                {/* Logout action */}
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold transition-colors duration-150 cursor-pointer mt-1"
                  style={{ color: "var(--color-danger)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(220, 38, 38, 0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "";
                  }}
                >
                  <IconLogOut size={14} />
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
