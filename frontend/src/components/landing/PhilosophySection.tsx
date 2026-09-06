"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export function PhilosophySection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="bg-black py-28 md:py-40 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto" ref={ref}>
        {/* Section Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl md:text-7xl lg:text-8xl text-white tracking-tight mb-16 md:mb-24"
        >
          Automation{" "}
          <span
            className="italic text-white/40 font-normal"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            x
          </span>{" "}
          Confidence
        </motion.h2>

        {/* Two-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left: Video */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl overflow-hidden aspect-[4/3] relative border border-white/5 shadow-2xl"
          >
            <video
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4"
              className="w-full h-full object-cover"
              muted
              autoPlay
              loop
              playsInline
              preload="auto"
            />
          </motion.div>

          {/* Right: Text Blocks */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-center"
          >
            {/* Block 1 */}
            <div>
              <span className="text-white/40 text-xs tracking-widest uppercase mb-4 block font-medium">
                Continuous testing
              </span>
              <p className="text-white/70 text-base md:text-lg leading-relaxed font-normal">
                AutoTest AI&apos;s agent watches every branch and pull request, generating and running tests
                continuously across your environments — no nightly cron jobs, no stale suites.
              </p>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-white/10 my-8" />

            {/* Block 2 */}
            <div>
              <span className="text-white/40 text-xs tracking-widest uppercase mb-4 block font-medium">
                Self-healing pipelines
              </span>
              <p className="text-white/70 text-base md:text-lg leading-relaxed font-normal">
                When a test fails, AutoTest AI diagnoses the root cause, drafts a fix, and opens a pull
                request for review — cutting the time between red and green from hours to minutes.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
