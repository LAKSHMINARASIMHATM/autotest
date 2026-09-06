"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, ArrowRight, BookOpen } from "lucide-react";
import { AboutSection } from "@/components/landing/AboutSection";
import { FeaturedVideoSection } from "@/components/landing/FeaturedVideoSection";
import { PhilosophySection } from "@/components/landing/PhilosophySection";
import { ServicesSection } from "@/components/landing/ServicesSection";

function IconGithub({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function IconTwitter({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4l11.733 16h4.267l-11.733-16z" />
      <path d="M4 20l6.768-6.768m2.46-2.46L20 4" />
    </svg>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fadingRef = useRef<boolean>(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Vanilla JS video crossfade loop logic via refs (no CSS transitions)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.style.opacity = "0";

    const fadeOpacity = (
      targetOpacity: number,
      durationMs = 500,
      callback?: () => void
    ) => {
      fadingRef.current = true;
      const startOpacity = parseFloat(video.style.opacity || "0");
      const startTime = performance.now();

      const step = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        const currentVal = startOpacity + (targetOpacity - startOpacity) * progress;
        video.style.opacity = currentVal.toString();

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          fadingRef.current = false;
          if (callback) callback();
        }
      };
      requestAnimationFrame(step);
    };

    const handleCanPlay = () => {
      video.play().catch(() => {});
      fadeOpacity(1, 500);
    };

    const handleTimeUpdate = () => {
      if (video.duration && !fadingRef.current) {
        const remaining = video.duration - video.currentTime;
        if (remaining <= 0.55 && parseFloat(video.style.opacity || "1") > 0.1) {
          fadeOpacity(0, 500);
        }
      }
    };

    const handleEnded = () => {
      video.style.opacity = "0";
      setTimeout(() => {
        video.currentTime = 0;
        video.play().catch(() => {});
        fadeOpacity(1, 500);
      }, 100);
    };

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);

    if (video.readyState >= 3) {
      handleCanPlay();
    }

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (cleanEmail) {
      router.push(`/login?mode=signup&email=${encodeURIComponent(cleanEmail)}`);
    } else {
      router.push("/login?mode=signup");
    }
  };

  return (
    <div className="bg-black text-white min-h-screen selection:bg-white/20 selection:text-white">
      {/* SECTION 1 — HERO (full-viewport) */}
      <div className="min-h-screen overflow-hidden relative flex flex-col justify-between">
        {/* Absolute Background Video */}
        <video
          ref={videoRef}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_074625_a81f018a-956b-43fb-9aee-4d1508e30e6a.mp4"
          className="absolute inset-0 w-full h-full object-cover object-bottom pointer-events-none"
          muted
          autoPlay
          playsInline
          preload="auto"
          aria-hidden="true"
        />

        {/* Navbar */}
        <nav className="relative z-20 px-6 py-6 w-full">
          <div className="liquid-glass rounded-full max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
            {/* Left Brand + Nav Links */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-2.5 text-white group">
                <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                  <img
                    src="/logo.png"
                    alt="AutoTest AI Logo"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                  />
                </div>
                <span className="font-semibold text-lg tracking-tight">AutoTest AI</span>
              </Link>
              <div className="hidden md:flex items-center gap-8 ml-8">
                <a href="#features" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                  Features
                </a>
                <a href="#pricing" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                  Pricing
                </a>
                <a href="/dashboard" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                  Docs
                </a>
              </div>
            </div>

            {/* Right Buttons */}
            <div className="flex items-center gap-4">
              <Link
                href="/login?mode=signup"
                className="text-white text-sm font-medium hover:text-white/80 transition-colors"
              >
                Sign Up
              </Link>
              <Link
                href="/login"
                className="liquid-glass rounded-full px-6 py-2 text-white text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Login
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center md:-translate-y-[10%]">
          {/* Main Heading */}
          <h1
            className="text-7xl md:text-8xl lg:text-9xl text-white tracking-tight whitespace-nowrap font-normal"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Ship it. Then <em className="italic font-normal">trust</em> it.
          </h1>

          {/* Email Input */}
          <form onSubmit={handleEmailSubmit} className="max-w-xl w-full mt-8">
            <div className="liquid-glass rounded-full pl-6 pr-2 py-2 flex items-center gap-3 w-full border border-white/25 bg-black/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] focus-within:border-white/60 focus-within:shadow-[0_0_24px_rgba(255,255,255,0.25)] transition-all">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={submitted ? "✓ Thank you! We'll be in touch shortly." : "Enter your work email"}
                className="text-white placeholder:text-white/50 bg-transparent outline-none flex-1 text-sm md:text-base font-normal h-10 min-w-0"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className="bg-white rounded-full w-10 h-10 flex items-center justify-center text-black shrink-0 hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-md"
              >
                <ArrowRight size={18} className="text-black" />
              </button>
            </div>
          </form>

          {/* Subtitle */}
          <p className="text-white text-sm leading-relaxed px-4 max-w-xl mx-auto mt-6 font-normal">
            Stay ahead of every regression. Get updates on autonomous test generation,
            self-healing pipelines, and release confidence — straight to your inbox.
          </p>

          {/* Manifesto Button */}
          <a
            href="#about"
            className="liquid-glass rounded-full px-8 py-3 text-white text-sm font-medium hover:bg-white/10 transition-colors mt-6 cursor-pointer border border-white/20 bg-black/30 backdrop-blur-md"
          >
            How AutoTest AI works
          </a>
        </div>

        {/* Social Icons Footer */}
        <div className="relative z-10 flex justify-center gap-4 pb-12">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <IconGithub size={20} />
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Twitter"
            className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <IconTwitter size={20} />
          </a>
          <Link
            href="/dashboard"
            aria-label="Documentation"
            className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <BookOpen size={20} />
          </Link>
        </div>
      </div>

      {/* SECTION 2 — ABOUT SECTION */}
      <AboutSection />

      {/* SECTION 3 — FEATURED VIDEO */}
      <FeaturedVideoSection />

      {/* SECTION 4 — AUTOMATION x CONFIDENCE */}
      <PhilosophySection />

      {/* SECTION 5 — CAPABILITIES / WHAT AUTOTEST AI DOES */}
      <ServicesSection />

      {/* Subtle Footer Note */}
      <footer className="bg-black border-t border-white/5 py-12 px-6 text-center text-xs text-white/40">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-white/60" />
            <span className="text-white/80 font-medium">AutoTest AI</span>
            <span>•</span>
            <span>Autonomous Quality Engineering</span>
          </div>
          <p>© {new Date().getFullYear()} AutoTest AI Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
