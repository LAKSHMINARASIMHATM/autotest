"use client";

import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  /** Add a colored aura on hover */
  glow?: "brand" | "brown" | "emerald" | "danger" | "warning" | "info" | "none";
  /** Remove hover lift effect */
  flat?: boolean;
}

const glowMap: Record<NonNullable<GlassCardProps["glow"]>, string> = {
  brand:   "hover:shadow-[0_12px_36px_rgba(201,169,110,0.18)] hover:border-[rgba(201,169,110,0.4)]",
  brown:   "hover:shadow-[0_12px_36px_rgba(201,169,110,0.18)] hover:border-[rgba(201,169,110,0.4)]",
  emerald: "hover:shadow-[0_12px_36px_rgba(63,167,122,0.18)] hover:border-[rgba(63,167,122,0.4)]",
  danger:  "hover:shadow-[0_12px_36px_rgba(201,91,91,0.18)] hover:border-[rgba(201,91,91,0.4)]",
  warning: "hover:shadow-[0_12px_36px_rgba(196,146,69,0.18)] hover:border-[rgba(196,146,69,0.4)]",
  info:    "hover:shadow-[0_12px_36px_rgba(58,126,158,0.18)] hover:border-[rgba(58,126,158,0.4)]",
  none:    "",
};

/**
 * High-end glass card with subtle border, diffuse elevation shadow,
 * smooth hover elevation, and calibrated aura highlights.
 */
const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, glow = "none", flat = false, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "glass-card p-6 relative overflow-hidden",
          !flat && "hover:-translate-y-0.5",
          glowMap[glow],
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
GlassCard.displayName = "GlassCard";

export { GlassCard };
