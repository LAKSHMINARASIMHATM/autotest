"use client";

import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  /** Add a colored glow on hover */
  glow?: "blue" | "purple" | "success" | "none";
  /** Remove hover lift effect */
  flat?: boolean;
}

const glowMap = {
  blue: "hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]",
  purple: "hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]",
  success: "hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]",
  none: "",
};

/**
 * Glassmorphism card with backdrop blur, subtle border, and hover elevation.
 * Wraps Framer Motion for enter animations.
 */
const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, glow = "none", flat = false, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "glass-card p-5",
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
