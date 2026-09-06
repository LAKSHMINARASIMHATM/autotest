"use client";

import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "text-sm font-semibold whitespace-nowrap",
    "rounded-xl transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-40",
    "cursor-pointer select-none relative overflow-hidden",
  ].join(" "),
  {
    variants: {
      variant: {
        /** Champagne Gold gradient — primary luxury action */
        primary: [
          "text-[#090A0C] font-bold",
          "shadow-[0_4px_16px_rgba(201,169,110,0.25)]",
          "hover:shadow-[0_8px_24px_rgba(201,169,110,0.38)]",
          "hover:brightness-105 active:scale-[0.98]",
          "border border-[rgba(255,255,255,0.3)]",
          "[background:linear-gradient(135deg,#C9A96E_0%,#E0C58B_100%)]",
          "focus-visible:ring-[#C9A96E]",
          "focus-visible:ring-offset-[var(--color-bg-primary)]",
        ].join(" "),
        /** Subtle surface with champagne/graphite border */
        secondary: [
          "border",
          "hover:shadow-sm active:scale-[0.98]",
          "[background-color:var(--color-bg-secondary)]",
          "[border-color:var(--color-border)]",
          "[color:var(--color-text-primary)]",
          "hover:[background-color:var(--color-surface-hover)]",
          "hover:[border-color:var(--color-border-hover)]",
          "focus-visible:ring-[#C9A96E]",
          "focus-visible:ring-offset-[var(--color-bg-primary)]",
        ].join(" "),
        /** Ghost — minimal, text-only */
        ghost: [
          "[color:var(--color-text-muted)]",
          "hover:[color:var(--color-text-primary)]",
          "hover:[background-color:var(--color-surface-hover)]",
          "active:scale-[0.98]",
          "focus-visible:ring-[#C9A96E]",
          "focus-visible:ring-offset-[var(--color-bg-primary)]",
        ].join(" "),
        /** Error Crimson */
        danger: [
          "text-white",
          "[background:linear-gradient(135deg,#B84848_0%,#C95B5B_100%)]",
          "shadow-[0_4px_16px_rgba(201,91,91,0.28)]",
          "hover:shadow-[0_8px_24px_rgba(201,91,91,0.4)]",
          "hover:brightness-105 active:scale-[0.98]",
          "border border-[rgba(255,255,255,0.18)]",
          "focus-visible:ring-[#C95B5B]",
          "focus-visible:ring-offset-[var(--color-bg-primary)]",
        ].join(" "),
        /** Emerald Jade success */
        success: [
          "text-white",
          "[background:linear-gradient(135deg,#2A845C_0%,#3FA77A_100%)]",
          "shadow-[0_4px_16px_rgba(63,167,122,0.28)]",
          "hover:shadow-[0_8px_24px_rgba(63,167,122,0.4)]",
          "hover:brightness-105 active:scale-[0.98]",
          "border border-[rgba(255,255,255,0.18)]",
          "focus-visible:ring-[#3FA77A]",
          "focus-visible:ring-offset-[var(--color-bg-primary)]",
        ].join(" "),
        /** Deep Obsidian slate */
        navy: [
          "text-[#F5F3EE]",
          "[background:linear-gradient(135deg,#0E1013_0%,#1C2026_100%)]",
          "shadow-[0_4px_16px_rgba(14,16,19,0.3)]",
          "hover:shadow-[0_8px_24px_rgba(14,16,19,0.45)]",
          "hover:brightness-110 active:scale-[0.98]",
          "border border-[var(--color-border)]",
          "focus-visible:ring-[#C9A96E]",
          "focus-visible:ring-offset-[var(--color-bg-primary)]",
        ].join(" "),
        /** Emerald accent variant */
        emerald: [
          "text-white",
          "[background:linear-gradient(135deg,#2A845C_0%,#3FA77A_100%)]",
          "shadow-[0_4px_16px_rgba(63,167,122,0.28)]",
          "hover:shadow-[0_8px_24px_rgba(63,167,122,0.4)]",
          "hover:brightness-105 active:scale-[0.98]",
          "border border-[rgba(255,255,255,0.18)]",
          "focus-visible:ring-[#3FA77A]",
          "focus-visible:ring-offset-[var(--color-bg-primary)]",
        ].join(" "),
        /** Outline */
        outline: [
          "bg-transparent",
          "[border:1px_solid_var(--color-border)]",
          "[color:var(--color-text-primary)]",
          "hover:[background-color:var(--color-surface-hover)]",
          "hover:[border-color:var(--color-border-hover)]",
          "active:scale-[0.98]",
          "focus-visible:ring-[#C9A96E]",
          "focus-visible:ring-offset-[var(--color-bg-primary)]",
        ].join(" "),
      },
      size: {
        sm:   "h-8  px-3   text-xs  rounded-lg  gap-1.5",
        md:   "h-10 px-4.5 text-sm  rounded-xl  gap-2",
        lg:   "h-12 px-6.5 text-base rounded-xl gap-2.5",
        icon: "h-10 w-10   p-0      rounded-xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size:    "md",
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

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
