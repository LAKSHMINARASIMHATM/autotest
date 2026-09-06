"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

const CARDS = [
  {
    tag: "Detection",
    title: "Autonomous Test Generation",
    description:
      "AutoTest AI reads your codebase and specs to generate unit, integration, and end-to-end tests automatically — keeping coverage current as your code evolves.",
    videoUrl:
      "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4",
  },
  {
    tag: "Remediation",
    title: "Self-Healing & Auto-Fix",
    description:
      "When something breaks, AutoTest AI isolates the cause, proposes a patch, and opens a reviewable pull request — no more flaky-test firefighting.",
    videoUrl:
      "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4",
  },
];

export function ServicesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" className="bg-black py-28 md:py-40 px-6 overflow-hidden relative">
      {/* Subtle Radial Gradient */}
      <div
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.02)_0%,_transparent_60%)]"
        aria-hidden="true"
      />

      <div className="max-w-6xl mx-auto relative z-10" ref={ref}>
        {/* Header Row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-between"
        >
          <h2 className="text-3xl md:text-5xl text-white tracking-tight font-normal">
            What AutoTest AI does
          </h2>
          <span className="text-white/40 text-sm tracking-widest uppercase hidden md:inline-block font-medium">
            Capabilities
          </span>
        </motion.div>

        {/* Two-Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mt-12">
          {CARDS.map((card, idx) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
              transition={{
                duration: 0.8,
                delay: idx * 0.15,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="liquid-glass rounded-3xl overflow-hidden group flex flex-col justify-between"
            >
              {/* Video Area */}
              <div className="aspect-video w-full overflow-hidden relative">
                <video
                  src={card.videoUrl}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  muted
                  autoPlay
                  loop
                  playsInline
                  preload="auto"
                />
                <div
                  className="bg-gradient-to-t from-black/40 to-transparent absolute inset-0 pointer-events-none"
                  aria-hidden="true"
                />
              </div>

              {/* Card Body */}
              <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/40 text-xs font-semibold uppercase tracking-widest">
                      {card.tag}
                    </span>
                    <Link
                      href="/dashboard"
                      className="liquid-glass rounded-full p-2 text-white/80 group-hover:text-white transition-colors"
                      aria-label={card.title}
                    >
                      <ArrowUpRight size={16} />
                    </Link>
                  </div>
                  <h3 className="text-white text-xl md:text-2xl mb-3 mt-3 tracking-tight font-semibold">
                    {card.title}
                  </h3>
                  <p className="text-white/50 text-sm leading-relaxed font-normal">
                    {card.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
