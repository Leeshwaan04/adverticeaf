"use client";

import React, { useState } from "react";
import { XCircle, CheckCircle2, TrendingDown, TrendingUp, Sparkles, Volume2, Video, Eye, ThumbsDown, Flame } from "lucide-react";

export default function BoringVsAF() {
  const [activeTab, setActiveTab] = useState<"boring" | "af">("af");

  return (
    <section id="comparison" className="py-24 relative bg-slate-950/40 border-y border-white/5 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Reality Check</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Why 90% of Paid Ads Burn Money
          </h2>
          <p className="text-slate-300 text-base sm:text-lg">
            Traditional agencies still produce ads like it's 2014. Modern feeds require thumb-stopping psychological velocity.
          </p>

          {/* Interactive Toggle Switch */}
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-900 border border-white/10 mt-8 shadow-inner">
            <button
              onClick={() => setActiveTab("boring")}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "boring"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              <span>The Boring Traditional Ad</span>
            </button>
            <button
              onClick={() => setActiveTab("af")}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "af"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-500/10"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Flame className="w-4 h-4 text-cyan-400" />
              <span>The Advertice AF Creative</span>
            </button>
          </div>
        </div>

        {/* Comparison Showcase Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Left: Traditional Ad Mockup */}
          <div
            className={`rounded-2xl p-6 sm:p-8 transition-all duration-300 border flex flex-col justify-between ${
              activeTab === "boring"
                ? "bg-slate-900/90 border-rose-500/40 ring-1 ring-rose-500/30 shadow-2xl shadow-rose-950/30 scale-[1.01]"
                : "bg-slate-950/50 border-white/5 opacity-60 hover:opacity-90"
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <XCircle className="w-5 h-5" />
                  <span>Standard Corporate Agency Ad</span>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 font-mono">
                  CTR: 0.42% (Abysmal)
                </span>
              </div>

              {/* Mock Video / Visual Container */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 mb-6 relative overflow-hidden">
                <div className="aspect-video w-full rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 flex flex-col items-center justify-center p-6 text-center border border-white/5">
                  <Video className="w-10 h-10 text-slate-600 mb-2" />
                  <p className="text-xs text-slate-400 font-mono italic max-w-xs">
                    "Stock footage of laughing office workers shaking hands in a sterile boardroom."
                  </p>
                </div>
                <div className="mt-4 space-y-1">
                  <div className="text-xs font-semibold text-slate-300">
                    Headline: "Synergize your operational workflows with our enterprise solutions."
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Audio: Generic elevator acoustic guitar strumming
                  </div>
                </div>
              </div>

              {/* Anatomy of Failure */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-rose-300">
                  Why this burns your ad budget:
                </div>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 font-black">•</span>
                    <span><strong>Hook takes 4 seconds:</strong> Scrollers have already scrolled past 5 TikToks before your logo even finishes fading in.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 font-black">•</span>
                    <span><strong>No emotional friction:</strong> Sounds like an MBA thesis rather than a human conversation.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 font-black">•</span>
                    <span><strong>Ad fatigue within 10 days:</strong> Only 1 or 2 static variations tested per month.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Negative Metric Box */}
            <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Estimated Cost Per Acquisition</span>
              <span className="text-rose-400 font-mono text-sm flex items-center gap-1">
                <TrendingDown className="w-4 h-4" />
                $68.50 CPA (Net Loss)
              </span>
            </div>
          </div>

          {/* Right: Advertice AF Creative Mockup */}
          <div
            className={`rounded-2xl p-6 sm:p-8 transition-all duration-300 border flex flex-col justify-between ${
              activeTab === "af"
                ? "bg-slate-900/90 border-cyan-400/50 ring-1 ring-cyan-400/40 shadow-2xl shadow-cyan-950/40 scale-[1.01]"
                : "bg-slate-950/50 border-white/5 opacity-60 hover:opacity-90"
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>The Advertice AF Creative Framework</span>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-bold">
                  CTR: 4.85% (Top 1%)
                </span>
              </div>

              {/* Mock Video / Visual Container */}
              <div className="rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 border border-cyan-500/30 p-4 mb-6 relative overflow-hidden shadow-lg shadow-cyan-500/10">
                <div className="aspect-video w-full rounded-lg bg-gradient-to-tr from-cyan-950/60 via-slate-900 to-indigo-900/80 flex flex-col items-center justify-center p-6 text-center border border-cyan-400/20 relative">
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-rose-500 text-white font-black text-[10px] animate-pulse">
                    0.4s HOOK
                  </div>
                  <Flame className="w-10 h-10 text-cyan-400 mb-2 animate-bounce" />
                  <p className="text-xs text-cyan-200 font-mono font-medium max-w-xs">
                    "Visceral POV pattern-interrupt, kinetic subtitle bursts, rapid 3D CGI product reveal."
                  </p>
                </div>
                <div className="mt-4 space-y-1">
                  <div className="text-xs font-semibold text-white">
                    Headline: "The $40 mistake 92% of founders make before noon (and how we fixed it in 3 clicks)."
                  </div>
                  <div className="text-[11px] text-cyan-300 font-mono flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Trending dynamic bass drop + ASMR tactile click</span>
                  </div>
                </div>
              </div>

              {/* Anatomy of Viral Success */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Why this prints conversions:
                </div>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 font-black">•</span>
                    <span><strong>0.6s thumb-stop guarantee:</strong> Pattern interrupts designed specifically for high-velocity scrolling habits.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 font-black">•</span>
                    <span><strong>Algorithmic resonance:</strong> Video assets structured to generate organic shares and high comment velocity.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 font-black">•</span>
                    <span><strong>Creative velocity:</strong> 15+ hook iterations and angles tested weekly to combat ad fatigue.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Positive Metric Box */}
            <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Optimized Cost Per Acquisition</span>
              <span className="text-emerald-400 font-mono text-sm flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                $18.20 CPA (4.2x ROAS)
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
