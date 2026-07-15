"use client";

import { Bell, Command, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopNav() {
  return (
    <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-6 border-b border-[rgba(255,255,255,0.06)] bg-[#09090B]/60 backdrop-blur-2xl">
      {/* Search / Command Palette Trigger */}
      <button className="flex items-center gap-3 h-9 px-4 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-[13px] text-[#6B7280] hover:text-[#9CA3AF] hover:border-[rgba(255,255,255,0.1)] transition-all duration-200 min-w-[280px]">
        <Search className="w-3.5 h-3.5" />
        <span>Search anything...</span>
        <kbd className="ml-auto flex items-center gap-0.5 text-[10px] font-medium text-[#4B5563] bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded-md">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* AI Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.15)]">
          <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span className="text-xs font-medium text-[#3B82F6]">AI Active</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#EF4444]" />
        </Button>

        {/* User avatar */}
        <button className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] flex items-center justify-center text-xs font-bold text-white shadow-lg">
          U
        </button>
      </div>
    </header>
  );
}
