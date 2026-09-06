"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";

export function FeaturedVideoSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="bg-black pt-6 md:pt-10 pb-20 md:pb-32 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl overflow-hidden aspect-video relative shadow-2xl border border-white/5"
        >
          {/* Background Video */}
          <video
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260402_054547_9875cfc5-155a-4229-8ec8-b7ba7125cbf8.mp4"
            className="w-full h-full object-cover"
            muted
            autoPlay
            loop
            playsInline
            preload="auto"
          />

          {/* Gradient Overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"
            aria-hidden="true"
          />

          {/* Bottom Overlay Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6 z-10">
            {/* Left Liquid Glass Card */}
            <div className="liquid-glass rounded-2xl p-6 md:p-8 max-w-md">
              <span className="text-white/50 text-xs tracking-widest uppercase mb-3 block font-medium">
                How AutoTest AI Tests
              </span>
              <p className="text-white text-sm md:text-base leading-relaxed font-normal">
                Every commit triggers an autonomous agent that reads your diff, writes the missing test cases,
                runs the full suite, and opens a fix when something breaks — so your team ships without crossing fingers.
              </p>
            </div>

            {/* Right Action Button */}
            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="liquid-glass rounded-full px-8 py-3 text-white text-sm font-medium hover:bg-white/5 transition-colors cursor-pointer shrink-0"
              >
                See it in action
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
