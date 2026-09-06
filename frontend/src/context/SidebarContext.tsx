"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (val: boolean | ((prev: boolean) => boolean)) => void;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  setMobileOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  toggleMobileOpen: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restore collapsed preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("autotest_sidebar_collapsed");
    if (saved !== null) {
      setCollapsed(saved === "true");
    }
  }, []);

  const handleSetCollapsed = (val: boolean | ((prev: boolean) => boolean)) => {
    setCollapsed((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      localStorage.setItem("autotest_sidebar_collapsed", String(next));
      return next;
    });
  };

  const toggleCollapsed = () => {
    handleSetCollapsed((prev) => !prev);
  };

  const toggleMobileOpen = () => {
    setMobileOpen((prev) => !prev);
  };

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        setCollapsed: handleSetCollapsed,
        toggleCollapsed,
        mobileOpen,
        setMobileOpen,
        toggleMobileOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
