"use client";

import { useAuth } from "@/hooks";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { motion } from "framer-motion";
import { IconZap } from "@/components/icons";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import MoltenMetal from "@/components/ui/MoltenMetal";

function DashboardInnerLayout({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div
      className="flex min-h-screen relative overflow-hidden bg-black"
      style={{ backgroundColor: "#000000" }}
    >
      {/* Dynamic Molten Metal Fluid Caustic Background */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-35 dark:opacity-45 transition-opacity duration-700"
        aria-hidden="true"
      >
        <MoltenMetal
          color1="#1E3A8A"
          color2="#800020"
          color3="#C9A96E"
          speed={0.22}
          scale={3.2}
          detail={3}
          glow={1.4}
          coreSize={0.08}
          swirl={0.7}
          fold={-0.18}
          blackPoint={0.06}
          brightness={1.2}
          colorMode="molten"
          grain={true}
          grainIntensity={0.04}
          mouseInteraction={true}
          mouseStrength={0.25}
          opacity={0.85}
          backgroundColor="#000000"
          lightMode={false}
        />
      </div>

      <Sidebar />
      <div
        className={`flex-1 flex flex-col min-w-0 relative z-10 transition-[margin] duration-300 ease-out ${
          collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]"
        } ml-0`}
      >
        <TopNav />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1680px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: "var(--color-bg-primary)" }}
      >
        {/* Subtle Sapphire Ambient Glow */}
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
          style={{ backgroundColor: "var(--color-brand-glow)" }}
        />

        {/* Pulsing Brand Mark */}
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            boxShadow: [
              "0 0 20px rgba(79, 70, 229, 0.2)",
              "0 0 45px rgba(79, 70, 229, 0.4)",
              "0 0 20px rgba(79, 70, 229, 0.2)",
            ],
          }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-xl border border-[rgba(255,255,255,0.15)]"
          style={{
            background: "linear-gradient(135deg, var(--color-brand-primary) 0%, var(--color-brand-secondary) 100%)",
          }}
        >
          <IconZap size={28} className="text-white" />
        </motion.div>

        <p
          className="text-xs font-semibold tracking-widest uppercase animate-pulse"
          style={{ color: "var(--color-text-muted)" }}
        >
          Authenticating Enterprise Session
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <DashboardInnerLayout>{children}</DashboardInnerLayout>
    </SidebarProvider>
  );
}
