"use client";

import { useAuth } from "@/hooks";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#09090B] relative overflow-hidden">
        {/* Background ambient light */}
        <div className="absolute w-[400px] h-[400px] bg-[#3B82F6]/5 rounded-full blur-[100px]" />
        
        {/* Pulsing Logo */}
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            boxShadow: [
              "0 0 20px rgba(59, 130, 246, 0.2)",
              "0 0 40px rgba(139, 92, 246, 0.4)",
              "0 0 20px rgba(59, 130, 246, 0.2)"
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] mb-4"
        >
          <Zap className="w-8 h-8 text-white" />
        </motion.div>
        
        <p className="text-xs font-semibold tracking-wider text-[#6B7280] uppercase animate-pulse">
          Authenticating Session
        </p>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[260px] transition-[margin] duration-300">
        <TopNav />
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
