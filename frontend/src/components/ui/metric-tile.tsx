"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MetricTileProps {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color?: "brand" | "brown" | "success" | "danger" | "warning" | "info" | "muted" | "navy" | "emerald" | "maroon";
  className?: string;
  subtext?: string;
}

const colorMap = {
  brand: {
    icon:       "var(--color-brand-primary)",
    iconBg:     "var(--color-brand-subtle)",
    iconBorder: "rgba(201, 169, 110, 0.28)",
    glow:       "group-hover:shadow-[0_12px_32px_rgba(201,169,110,0.18)] group-hover:border-[rgba(201,169,110,0.45)]",
    gradient:   "rgba(201, 169, 110, 0.1)",
  },
  brown: {
    icon:       "var(--color-brand-primary)",
    iconBg:     "var(--color-brand-subtle)",
    iconBorder: "rgba(201, 169, 110, 0.28)",
    glow:       "group-hover:shadow-[0_12px_32px_rgba(201,169,110,0.18)] group-hover:border-[rgba(201,169,110,0.45)]",
    gradient:   "rgba(201, 169, 110, 0.1)",
  },
  navy: {
    icon:       "var(--color-navy-accent)",
    iconBg:     "var(--color-navy-subtle)",
    iconBorder: "rgba(96, 165, 250, 0.35)",
    glow:       "group-hover:shadow-[0_12px_32px_rgba(30,58,138,0.3)] group-hover:border-[rgba(96,165,250,0.45)]",
    gradient:   "rgba(30, 58, 138, 0.15)",
  },
  maroon: {
    icon:       "var(--color-maroon-primary)",
    iconBg:     "var(--color-maroon-subtle)",
    iconBorder: "rgba(226, 92, 128, 0.35)",
    glow:       "group-hover:shadow-[0_12px_32px_rgba(128,0,32,0.35)] group-hover:border-[rgba(226,92,128,0.45)]",
    gradient:   "rgba(128, 0, 32, 0.15)",
  },
  emerald: {
    icon:       "var(--color-accent-primary)",
    iconBg:     "var(--color-accent-subtle)",
    iconBorder: "rgba(63, 167, 122, 0.25)",
    glow:       "group-hover:shadow-[0_12px_32px_rgba(63,167,122,0.18)] group-hover:border-[rgba(63,167,122,0.4)]",
    gradient:   "rgba(63, 167, 122, 0.08)",
  },
  success: {
    icon:       "var(--color-success)",
    iconBg:     "var(--color-accent-subtle)",
    iconBorder: "rgba(63, 167, 122, 0.25)",
    glow:       "group-hover:shadow-[0_12px_32px_rgba(63,167,122,0.18)] group-hover:border-[rgba(63,167,122,0.4)]",
    gradient:   "rgba(63, 167, 122, 0.08)",
  },
  danger: {
    icon:       "var(--color-danger)",
    iconBg:     "rgba(201, 91, 91, 0.1)",
    iconBorder: "rgba(201, 91, 91, 0.25)",
    glow:       "group-hover:shadow-[0_12px_32px_rgba(201,91,91,0.18)] group-hover:border-[rgba(201,91,91,0.4)]",
    gradient:   "rgba(201, 91, 91, 0.08)",
  },
  warning: {
    icon:       "var(--color-warning)",
    iconBg:     "rgba(196, 146, 69, 0.1)",
    iconBorder: "rgba(196, 146, 69, 0.25)",
    glow:       "group-hover:shadow-[0_12px_32px_rgba(196,146,69,0.18)] group-hover:border-[rgba(196,146,69,0.4)]",
    gradient:   "rgba(196, 146, 69, 0.08)",
  },
  info: {
    icon:       "var(--color-info)",
    iconBg:     "rgba(58, 126, 158, 0.1)",
    iconBorder: "rgba(58, 126, 158, 0.25)",
    glow:       "group-hover:shadow-[0_12px_32px_rgba(58,126,158,0.18)] group-hover:border-[rgba(58,126,158,0.4)]",
    gradient:   "rgba(58, 126, 158, 0.08)",
  },
  muted: {
    icon:       "var(--color-text-muted)",
    iconBg:     "var(--color-surface)",
    iconBorder: "var(--color-border)",
    glow:       "group-hover:shadow-[0_12px_32px_rgba(148,163,184,0.15)] group-hover:border-[var(--color-border-hover)]",
    gradient:   "rgba(148, 163, 184, 0.06)",
  },
};

/**
 * Premium metric tile with standardized 8px spatial grid,
 * high-contrast value typography, color-coded status badges,
 * and subtle hover elevation.
 */
export function MetricTile({
  label,
  value,
  change,
  icon: Icon,
  color = "brand",
  className,
  subtext,
}: MetricTileProps) {
  const c = colorMap[color] || colorMap.brand;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "glass-card group relative overflow-hidden p-6 border transition-all duration-200",
        c.glow,
        className
      )}
    >
      {/* Ambient corner glow backdrop */}
      <div
        className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-0 transition-opacity duration-300 blur-2xl pointer-events-none group-hover:opacity-100"
        style={{ backgroundColor: c.gradient }}
      />

      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{ color: "var(--color-text-muted)" }}
          >
            {label}
          </p>
          <p
            className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-none"
            style={{ color: "var(--color-text-primary)" }}
          >
            {value}
          </p>
          {change !== undefined ? (
            <p
              className="text-xs font-semibold flex items-center gap-1 mt-1"
              style={{ color: change >= 0 ? "var(--color-success)" : "var(--color-danger)" }}
            >
              <span>{change >= 0 ? "↑" : "↓"} {Math.abs(change)}%</span>
              <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }} className="ml-1">
                vs target benchmark
              </span>
            </p>
          ) : subtext ? (
            <p className="text-xs font-medium mt-1" style={{ color: "var(--color-text-muted)" }}>
              {subtext}
            </p>
          ) : null}
        </div>
        <div
          className="p-3 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105"
          style={{
            backgroundColor: c.iconBg,
            borderColor: c.iconBorder,
          }}
        >
          <Icon size={22} style={{ color: c.icon }} />
        </div>
      </div>
    </motion.div>
  );
}
