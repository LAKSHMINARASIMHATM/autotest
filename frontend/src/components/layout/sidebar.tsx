"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Bot,
  Bug,
  ChevronLeft,
  FlaskConical,
  FolderGit2,
  GitBranch,
  LayoutDashboard,
  Network,
  Search,
  Settings,
  Shield,
  Wrench,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Projects", href: "/dashboard/projects", icon: FolderGit2 },
    ],
  },
  {
    title: "AI Engine",
    items: [
      { label: "Agents", href: "/dashboard/agents", icon: Bot, badge: "13" },
      { label: "Knowledge Graph", href: "/dashboard/knowledge", icon: Network },
      { label: "RAG Pipeline", href: "/dashboard/rag", icon: Search },
    ],
  },
  {
    title: "Quality",
    items: [
      { label: "Test Suites", href: "/dashboard/tests", icon: FlaskConical },
      { label: "Execution", href: "/dashboard/execution", icon: Zap },
      { label: "Bugs", href: "/dashboard/bugs", icon: Bug },
      { label: "Patches", href: "/dashboard/patches", icon: Wrench },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Pipeline", href: "/dashboard/pipeline", icon: GitBranch },
      { label: "Monitoring", href: "/dashboard/monitoring", icon: Activity },
      { label: "Security", href: "/dashboard/security", icon: Shield },
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40",
        "flex flex-col",
        "bg-[#09090B]/80 backdrop-blur-2xl",
        "border-r border-[rgba(255,255,255,0.06)]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] shadow-lg">
          <Zap className="w-4.5 h-4.5 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="text-[15px] font-bold text-[#F9FAFB] tracking-tight">AutoTestAI</h1>
              <p className="text-[10px] text-[#6B7280] font-medium tracking-wider uppercase">AI Quality Engine</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-semibold text-[#4B5563] uppercase tracking-[0.1em] px-2.5 mb-2"
                >
                  {section.title}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 group relative",
                      isActive
                        ? "bg-[rgba(59,130,246,0.12)] text-[#3B82F6]"
                        : "text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[rgba(255,255,255,0.06)]",
                      collapsed && "justify-center px-0"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#3B82F6]"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <item.icon className={cn("w-[18px] h-[18px] shrink-0", isActive && "text-[#3B82F6]")} />
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          className="truncate"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {item.badge && !collapsed && (
                      <span className="ml-auto text-[10px] font-bold bg-[rgba(255,255,255,0.06)] text-[#6B7280] px-1.5 py-0.5 rounded-md">
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

      {/* Collapse button */}
      <div className="p-2.5 border-t border-[rgba(255,255,255,0.06)]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full h-9 rounded-xl text-[#6B7280] hover:text-[#F9FAFB] hover:bg-[rgba(255,255,255,0.06)] transition-all duration-200"
        >
          <ChevronLeft
            className={cn(
              "w-4 h-4 transition-transform duration-300",
              collapsed && "rotate-180"
            )}
          />
        </button>
      </div>
    </motion.aside>
  );
}
