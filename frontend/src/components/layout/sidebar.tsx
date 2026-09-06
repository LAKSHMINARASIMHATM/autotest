"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconDashboard,
  IconFolderGit,
  IconBot,
  IconNetwork,
  IconFlask,
  IconZap,
  IconBug,
  IconWrench,
  IconGitBranch,
  IconActivity,
  IconShield,
  IconSettings,
  IconChevronLeft,
  IconMenu,
  IconClose,
  IconSparkles,
} from "@/components/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useSidebar } from "@/context/SidebarContext";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const quickNavItems = [
  { label: "Overview",  href: "/dashboard",        icon: IconDashboard },
  { label: "Agents",    href: "/dashboard/agents",  icon: IconBot, badge: "13" },
  { label: "Tests",     href: "/dashboard/tests",   icon: IconFlask },
];

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard",  href: "/dashboard",          icon: IconDashboard },
      { label: "Projects",   href: "/dashboard/projects", icon: IconFolderGit },
    ],
  },
  {
    title: "AI Engine",
    items: [
      { label: "Agents",          href: "/dashboard/agents",    icon: IconBot,     badge: "13" },
      { label: "Knowledge Graph",  href: "/dashboard/knowledge", icon: IconNetwork },
    ],
  },
  {
    title: "Quality",
    items: [
      { label: "Test Suites", href: "/dashboard/tests",     icon: IconFlask },
      { label: "Execution",   href: "/dashboard/execution", icon: IconZap },
      { label: "Bugs",        href: "/dashboard/bugs",      icon: IconBug },
      { label: "Patches",     href: "/dashboard/patches",   icon: IconWrench },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Pipeline",   href: "/dashboard/pipeline",   icon: IconGitBranch },
      { label: "Monitoring", href: "/dashboard/monitoring", icon: IconActivity },
      { label: "Security",   href: "/dashboard/security",   icon: IconShield },
      { label: "Settings",   href: "/dashboard/settings",   icon: IconSettings },
    ],
  },
];

export function Sidebar() {
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen, toggleMobileOpen } = useSidebar();
  const pathname = usePathname();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  return (
    <>
      {/* Mobile Drawer Trigger (Floating) */}
      <button
        onClick={toggleMobileOpen}
        aria-label="Toggle Navigation Menu"
        className="lg:hidden fixed top-3.5 left-3.5 z-50 p-2.5 rounded-xl border focus:outline-none focus:ring-2 transition-all duration-200 shadow-sm cursor-pointer"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          borderColor: "var(--color-border)",
          color: "var(--color-text-primary)",
        }}
      >
        {mobileOpen ? (
          <IconClose size={20} style={{ color: "var(--color-brand-primary)" }} />
        ) : (
          <IconMenu size={20} style={{ color: "var(--color-text-secondary)" }} />
        )}
      </button>

      {/* Mobile Backdrop Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileOpen(false)}
            className="lg:hidden fixed inset-0 z-40 backdrop-blur-md"
            style={{ backgroundColor: "rgba(9, 13, 22, 0.45)" }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Content */}
      <motion.aside
        animate={{
          width: collapsed ? 72 : 260,
          x: typeof window !== "undefined" && window.innerWidth < 1024
            ? (mobileOpen ? 0 : -280)
            : 0,
        }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="fixed left-0 top-0 bottom-0 z-40 flex flex-col shadow-xl select-none"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          borderRight: "1px solid var(--color-border)",
        }}
      >
        {/* Brand Header */}
        <div
          className="flex items-center gap-3 px-4 h-16 shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 shadow-sm relative overflow-hidden p-1 border"
            style={{
              backgroundColor: "var(--color-bg-primary)",
              borderColor: "var(--color-border)",
            }}
          >
            <img src="/logo.png" alt="AutoTestAI Logo" className="w-full h-full object-contain" />
          </div>
          <AnimatePresence>
            {(!collapsed || mobileOpen) && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden min-w-0"
              >
                <div className="flex items-center gap-1.5">
                  <h1
                    className="text-[15px] font-extrabold tracking-tight leading-tight truncate"
                  >
                    <span style={{ color: "var(--color-navy-accent)" }}>AutoTest</span>
                    <span style={{ color: "var(--color-maroon-primary)" }}>AI</span>
                  </h1>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider badge-maroon"
                  >
                    PRO
                  </span>
                </div>
                <p
                  className="text-[10px] font-semibold tracking-wider uppercase flex items-center gap-1.5 mt-0.5"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  <span style={{ color: "var(--color-navy-accent)" }}>Quality Engine</span>
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: "var(--color-maroon-primary)" }}
                  />
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Access Segmented Control */}
        {(!collapsed || mobileOpen) && (
          <div
            className="p-3 mx-2.5 my-2 rounded-xl border transition-all"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2 px-1 flex items-center justify-between" style={{ color: "var(--color-text-placeholder)" }}>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-maroon-primary)" }} />
                <span>Quick Navigation</span>
              </span>
              <IconSparkles size={11} style={{ color: "var(--color-navy-accent)" }} />
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {quickNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[11px] font-medium transition-all duration-200 border text-center",
                      isActive
                        ? "maroon-glass-box font-bold"
                        : "border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                    )}
                  >
                    <item.icon
                      size={14}
                      className="mb-0.5"
                      style={{ color: isActive ? "#FFFFFF" : "currentColor" }}
                    />
                    <span className="truncate w-full">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-5">
          {navSections.map((section) => (
            <div key={section.title}>
              <AnimatePresence>
                {(!collapsed || mobileOpen) && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 mb-1.5 flex items-center gap-1.5"
                    style={{ color: "var(--color-text-placeholder)" }}
                  >
                    <span
                      className="w-1 h-1 rounded-full"
                      style={{
                        backgroundColor:
                          section.title === "Overview" ? "var(--color-navy-accent)" :
                          section.title === "Quality" ? "var(--color-maroon-primary)" :
                          "var(--color-brand-primary)",
                      }}
                    />
                    <span>{section.title}</span>
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group relative",
                        collapsed && !mobileOpen && "justify-center px-0",
                        isActive
                          ? "maroon-glass-box font-semibold shadow-md"
                          : "text-[var(--color-text-secondary)] border border-transparent hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active-indicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3.5px] h-6 rounded-r-full shadow-md"
                          style={{
                            background: "linear-gradient(180deg, #FF7597, #800020)",
                            boxShadow: "0 0 10px #FF7597",
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 32 }}
                        />
                      )}
                      <item.icon
                        size={17}
                        className="shrink-0 transition-colors duration-150"
                        style={{
                          color: isActive
                            ? "#FFFFFF"
                            : "var(--color-text-muted)",
                        }}
                      />
                      <AnimatePresence>
                        {(!collapsed || mobileOpen) && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            className="truncate"
                            style={{ color: isActive ? "#FFFFFF" : undefined }}
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {item.badge && (!collapsed || mobileOpen) && (
                        <span
                          className={cn(
                            "ml-auto text-[10px] font-bold px-1.5 py-0.2 rounded-full",
                            isActive
                              ? "bg-white/20 text-white"
                              : "badge-navy"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse Control Footer (Desktop) */}
        <div
          className="hidden lg:block p-2.5 shrink-0"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            className="flex items-center justify-center w-full h-9 rounded-xl transition-all duration-200 cursor-pointer border border-transparent hover:border-[var(--color-border)]"
            style={{ color: "var(--color-text-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
              e.currentTarget.style.color = "var(--color-text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "";
              e.currentTarget.style.color = "var(--color-text-muted)";
            }}
          >
            <IconChevronLeft
              size={16}
              className={cn("transition-transform duration-300", collapsed && "rotate-180")}
            />
          </button>
        </div>
      </motion.aside>
    </>
  );
}
