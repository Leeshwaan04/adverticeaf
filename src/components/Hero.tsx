"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Play, TrendingUp, Zap, Flame, Eye, CheckCircle2 } from "lucide-react";

interface HeroProps {
  onOpenAudit: () => void;
}

const ROTATING_TEXTS = [
  "Ads That Go Viral AF.",
  "Cold Hard Measurable ROI.",
  "Hooks Scrollers Can't Skip.",
  "3D CGI & Culture-Jacking.",
];

export default function Hero({ onOpenAudit }: HeroProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % ROTATING_TEXTS.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] md:w-[900px] md:h-[500px] bg-gradient-to-tr from-cyan-600/20 via-sky-500/15 to-indigo-600/20 blur-[130px] rounded-full pointer-events-none -z-10 animate-pulse-slow" />
      <div className="absolute top-20 right-10 w-72 h-72 bg-sky-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Decorative Grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none -z-10"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-cyan-300 text-xs sm:text-sm font-semibold shadow-inner shadow-cyan-500/10 mb-8 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-slate-300">The Next-Gen Creative Lab</span>
            <span className="text-cyan-400 font-bold">•</span>
            <span className="text-cyan-400">TikTok, Meta & 3D Visuals</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.08] mb-6">
            Stop running ads that feel like homework. We build{" "}
            <span className="block mt-2 min-h-[1.2em] bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent text-glow-cyan transition-all duration-500">
              {ROTATING_TEXTS[index]}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl leading-relaxed mb-10 font-normal">
            We fuse <strong>algorithmic short-form psychology</strong>, <strong>hyper-real 3D visuals</strong>, and <strong>ruthless creative testing</strong> to turn dead ad accounts into high-velocity customer printers.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-16">
            <a
              href="#roaster"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-600 text-white font-bold text-base shadow-xl shadow-cyan-500/25 hover:shadow-cyan-400/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 group"
            >
              <Flame className="w-5 h-5 text-amber-300 group-hover:scale-110 transition-transform" />
              <span>Roast My Ad (Instant AI Free)</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>

            <button
              onClick={onOpenAudit}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-slate-200 hover:text-white font-semibold text-base transition-all duration-200 backdrop-blur-md flex items-center justify-center gap-2 group shadow-lg shadow-black/40"
            >
              <Sparkles className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform" />
              <span>Book Strategic Growth Call</span>
            </button>
          </div>

          {/* Hero Feature Preview Box */}
          <div className="w-full relative mt-4 rounded-2xl glass-panel p-4 sm:p-6 border border-white/10 shadow-2xl shadow-cyan-950/40">
            {/* Window Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-mono text-slate-400 hidden sm:inline-block">adverticeaf-engine://creative-performance.v2</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400 font-mono font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>3.94x ROAS ACTIVE OPTIMIZATION</span>
              </div>
            </div>

            {/* Interactive Grid Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
              {/* Metric 1 */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 hover:border-cyan-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Tracked Ad Spend</span>
                  <Zap className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-black text-white">$24.8M+</div>
                <div className="text-xs text-emerald-400 font-medium flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>+142% MoM Scale</span>
                </div>
              </div>

              {/* Metric 2 */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 hover:border-sky-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Average ROAS</span>
                  <TrendingUp className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-2xl font-black text-white">4.18x</div>
                <div className="text-xs text-sky-300 font-medium mt-1">
                  Vs 1.4x Industry Benchmark
                </div>
              </div>

              {/* Metric 3 */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 hover:border-indigo-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Viral Impressions</span>
                  <Eye className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-black text-white">192.4M</div>
                <div className="text-xs text-indigo-300 font-medium mt-1">
                  Organic + Paid Combined
                </div>
              </div>

              {/* Metric 4 */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 hover:border-emerald-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Hook Retention</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-white">68.2%</div>
                <div className="text-xs text-emerald-300 font-medium mt-1">
                  Watch time past 3s mark
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
