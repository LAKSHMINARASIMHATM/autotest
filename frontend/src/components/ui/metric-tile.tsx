"use client";

import { cn } from "@/lib/utils";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { type LucideIcon } from "lucide-react";

interface MetricTileProps {
  label: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  color?: "blue" | "purple" | "cyan" | "success" | "warning" | "danger";
  className?: string;
}

const colorMap = {
  blue: {
    icon: "text-[#3B82F6]",
    bg: "bg-[#3B82F6]/10",
    glow: "group-hover:shadow-[0_0_24px_rgba(59,130,246,0.12)]",
  },
  purple: {
    icon: "text-[#8B5CF6]",
    bg: "bg-[#8B5CF6]/10",
    glow: "group-hover:shadow-[0_0_24px_rgba(139,92,246,0.12)]",
  },
  cyan: {
    icon: "text-[#06B6D4]",
    bg: "bg-[#06B6D4]/10",
    glow: "group-hover:shadow-[0_0_24px_rgba(6,182,212,0.12)]",
  },
  success: {
    icon: "text-[#10B981]",
    bg: "bg-[#10B981]/10",
    glow: "group-hover:shadow-[0_0_24px_rgba(16,185,129,0.12)]",
  },
  warning: {
    icon: "text-[#F59E0B]",
    bg: "bg-[#F59E0B]/10",
    glow: "group-hover:shadow-[0_0_24px_rgba(245,158,11,0.12)]",
  },
  danger: {
    icon: "text-[#EF4444]",
    bg: "bg-[#EF4444]/10",
    glow: "group-hover:shadow-[0_0_24px_rgba(239,68,68,0.12)]",
  },
};

/**
 * Premium metric tile with animated counter, color-coded icon, and hover glow.
 */
export function MetricTile({
  label,
  value,
  change,
  icon: Icon,
  color = "blue",
  className,
}: MetricTileProps) {
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "glass-card group relative overflow-hidden p-5",
        c.glow,
        className
      )}
    >
      {/* Ambient corner glow */}
      <div
        className={cn(
          "absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-0 transition-opacity duration-500 blur-2xl",
          "group-hover:opacity-100",
          c.bg
        )}
      />

      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-[#9CA3AF] tracking-wide uppercase">
            {label}
          </p>
          <p className="text-[28px] font-bold tracking-tight text-[#F9FAFB]">
            {value}
          </p>
          {change !== undefined && (
            <p
              className={cn(
                "text-xs font-medium flex items-center gap-1",
                change >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
              )}
            >
              {change >= 0 ? "↑" : "↓"} {Math.abs(change)}%
              <span className="text-[#6B7280] ml-1">vs last run</span>
            </p>
          )}
        </div>
        <div className={cn("p-2.5 rounded-xl", c.bg)}>
          <Icon className={cn("w-5 h-5", c.icon)} />
        </div>
      </div>
    </motion.div>
  );
}
