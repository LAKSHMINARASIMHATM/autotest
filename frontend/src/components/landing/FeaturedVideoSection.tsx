"use client";

import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";

export function FeaturedVideoSection() {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Slow down playback to 0.75x for longer, clearer showcase
    video.playbackRate = 0.75;

    let timeoutId: NodeJS.Timeout;

    const handleEnded = () => {
      // Hold on the final frame for 4.5 seconds before repeating
      timeoutId = setTimeout(() => {
        if (!video) return;
        video.currentTime = 0;
        video.playbackRate = 0.75;
        video.play().catch(() => {});
      }, 4500);
    };

    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("ended", handleEnded);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <section className="bg-black py-10 md:py-16 px-4 md:px-8 overflow-hidden" ref={ref}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full h-[75vh] min-h-[520px] max-h-[760px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col justify-end"
        >
          {/* Background Video */}
          <video
            ref={videoRef}
            src="/autotest.mov"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300"
            muted
            autoPlay
            playsInline
            preload="auto"
            aria-hidden="true"
          />

          {/* Gradient Overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20 pointer-events-none"
            aria-hidden="true"
          />

          {/* Bottom Overlay Content */}
          <div className="relative z-10 w-full p-6 md:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            {/* Left Liquid Glass Card */}
            <div className="liquid-glass rounded-2xl p-6 md:p-8 max-w-lg backdrop-blur-xl border border-white/10 shadow-2xl">
              <span className="text-white/60 text-xs tracking-widest uppercase mb-3 block font-medium">
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
                className="liquid-glass rounded-full px-8 py-3.5 text-white text-sm font-medium hover:bg-white/10 transition-all cursor-pointer shrink-0 shadow-lg border border-white/10"
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
