"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ThinkingIndicatorProps {
  agentName?: string;
  className?: string;
}

/**
 * Animated thinking/processing indicator for agents.
 * Shows a typing-style animation with the agent name.
 */
export function ThinkingIndicator({ agentName = "Agent", className }: ThinkingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3 rounded-xl bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.1)]", className)}>
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      <span className="text-[12px] text-[#F59E0B] font-medium">
        {agentName} is thinking...
      </span>
    </div>
  );
}

/**
 * Animated reasoning chain — shows AI steps being processed.
 */
export function ReasoningChain({ steps }: { steps: string[] }) {
  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.15, duration: 0.3 }}
          className="flex items-start gap-2.5"
        >
          <div className="flex flex-col items-center mt-1">
            <div className={cn(
              "w-2 h-2 rounded-full",
              i < steps.length - 1 ? "bg-[#10B981]" : "bg-[#3B82F6] animate-pulse"
            )} />
            {i < steps.length - 1 && (
              <div className="w-px h-4 bg-[rgba(255,255,255,0.08)]" />
            )}
          </div>
          <p className={cn(
            "text-[12px] leading-relaxed",
            i < steps.length - 1 ? "text-[#9CA3AF]" : "text-[#F9FAFB] font-medium"
          )}>
            {step}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
