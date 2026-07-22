"use client";

import { Bell, Command, LogOut, Search, Sparkles, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function TopNav() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U";

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

        {/* User profile dropdown container */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] flex items-center justify-center text-xs font-bold text-white shadow-lg cursor-pointer hover:brightness-110 active:scale-95 transition-all duration-200"
          >
            {initial}
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-56 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#09090B]/95 backdrop-blur-2xl p-2.5 shadow-2xl z-50"
              >
                {/* User info header */}
                <div className="px-2.5 py-2 border-b border-[rgba(255,255,255,0.06)] mb-1.5">
                  <p className="text-[13px] font-bold text-[#F9FAFB] truncate">
                    {user?.full_name || "AutoTest User"}
                  </p>
                  <p className="text-[10px] text-[#6B7280] truncate mt-0.5">
                    {user?.email || "user@autotest.ai"}
                  </p>
                </div>

                {/* Profile action */}
                <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs font-medium text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[rgba(255,255,255,0.06)] transition-colors duration-200">
                  <UserIcon className="w-3.5 h-3.5" />
                  My Profile
                </button>

                {/* Logout action */}
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors duration-200 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
