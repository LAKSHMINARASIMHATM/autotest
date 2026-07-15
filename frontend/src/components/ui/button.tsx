"use client";

import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { forwardRef, type ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "text-sm font-semibold whitespace-nowrap",
    "rounded-xl transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50",
    "disabled:pointer-events-none disabled:opacity-50",
    "cursor-pointer select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: [
          "bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6]",
          "text-white shadow-lg",
          "hover:shadow-[0_0_24px_rgba(59,130,246,0.3)]",
          "hover:brightness-110 active:scale-[0.98]",
        ].join(" "),
        secondary: [
          "bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)]",
          "text-[#F9FAFB] backdrop-blur-xl",
          "hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]",
          "active:scale-[0.98]",
        ].join(" "),
        ghost: [
          "text-[#9CA3AF]",
          "hover:text-[#F9FAFB] hover:bg-[rgba(255,255,255,0.06)]",
          "active:scale-[0.98]",
        ].join(" "),
        danger: [
          "bg-gradient-to-r from-[#EF4444] to-[#DC2626]",
          "text-white shadow-lg",
          "hover:shadow-[0_0_24px_rgba(239,68,68,0.3)]",
          "hover:brightness-110 active:scale-[0.98]",
        ].join(" "),
        success: [
          "bg-gradient-to-r from-[#10B981] to-[#059669]",
          "text-white shadow-lg",
          "hover:shadow-[0_0_24px_rgba(16,185,129,0.3)]",
          "hover:brightness-110 active:scale-[0.98]",
        ].join(" "),
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-lg",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

/**
 * Gradient button with glow hover, press scale, and variant system.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
