"use client";

import React, { useState } from "react";
import { Sparkles, Play, TrendingUp, Layers, Eye, Smartphone, Box, Zap } from "lucide-react";

const CREATIVE_ITEMS = [
  {
    id: 1,
    title: "The 'Secret Lab' 3D Hyper-Real Reveal",
    category: "3D CGI & VFX",
    platform: "TikTok & Instagram",
    stats: "+340% ROAS • 4.8M Views",
    client: "HydraZero (Electrolyte Brand)",
    description: "Cold-pressed can freezing mid-air inside a zero-gravity glacier chamber before exploding into real fruit slices.",
    color: "from-cyan-500/20 to-blue-600/20",
    border: "border-cyan-500/30",
    badge: "3D CGI",
    icon: Box,
  },
  {
    id: 2,
    title: "Contrarian Unboxing & Brutal Competitor Teardown",
    category: "TikTok & UGC",
    platform: "TikTok Ads & Spark Ads",
    stats: "5.2x ROAS • $420k Rev/Mo",
    client: "AuraSleep (Wellness Tech)",
    description: "Creator filming with low-fi phone camera, calling out the $300 competitor ring and showing why it failed in 7 days.",
    color: "from-sky-500/20 to-indigo-600/20",
    border: "border-sky-500/30",
    badge: "UGC Viral",
    icon: Smartphone,
  },
  {
    id: 3,
    title: "Culture-Jacking Meme Ad That Broke Meta Feeds",
    category: "Meme & Culture",
    platform: "Meta Feed & Stories",
    stats: "18k Shares • $12 CPA",
    client: "FinPulse (Neo-Banking App)",
    description: "Parodying viral corporate HR onboarding videos to reveal zero-fee international banking in a hilarious 18s sketch.",
    color: "from-purple-500/20 to-pink-600/20",
    border: "border-purple-500/30",
    badge: "Culture Hack",
    icon: Zap,
  },
  {
    id: 4,
    title: "Kinetic Dark-Mode Interactive Direct-Response Lander",
    category: "Landing Pages",
    platform: "Omnichannel Funnel",
    stats: "9.4% CVR • 2.8s Load",
    client: "DevCore (Developer Tools SaaS)",
    description: "Terminal-styled interactive landing page with instant live code playground that converts cold developer traffic.",
    color: "from-emerald-500/20 to-teal-600/20",
    border: "border-emerald-500/30",
    badge: "High CVR Lander",
    icon: Layers,
  },
  {
    id: 5,
    title: "The ASMR Sensory Overload Micro-Hook",
    category: "TikTok & UGC",
    platform: "Reels & YouTube Shorts",
    stats: "78% 3s Hold Rate",
    client: "VelvetGrain (Direct-to-Consumer Coffee)",
    description: "Ultra-crisp macro shots of espresso brewing over artisanal ice cubes with tactile audio and bold kinetic text pops.",
    color: "from-amber-500/20 to-orange-600/20",
    border: "border-amber-500/30",
    badge: "ASMR Hook",
    icon: Smartphone,
  },
  {
    id: 6,
    title: "The Fake Podcast Controversy Snippet",
    category: "Meme & Culture",
    platform: "TikTok & Meta",
    stats: "8.6M Organic Views",
    client: "StriveSkin (Acne Care)",
    description: "Two hosts in professional studio debating a controversial skincare ingredient, cutting seamlessly into founder revelation.",
    color: "from-rose-500/20 to-red-600/20",
    border: "border-rose-500/30",
    badge: "Podcast Cut",
    icon: Zap,
  },
];

const CATEGORIES = [
  "All Formats",
  "TikTok & UGC",
  "3D CGI & VFX",
  "Meme & Culture",
  "Landing Pages",
];

export default function CreativeShowcase() {
  const [selectedCategory, setSelectedCategory] = useState("All Formats");

  const filteredItems =
    selectedCategory === "All Formats"
      ? CREATIVE_ITEMS
      : CREATIVE_ITEMS.filter((item) => item.category === selectedCategory);

  return (
    <section id="showcase" className="py-24 relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Creative Portfolio & Playbook</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Ads Engineered for the Modern Attention Span
          </h2>
          <p className="text-slate-300 text-base sm:text-lg">
            We don't do boring corporate decks. We engineer formats that capture eyes, trigger algorithmic distribution, and drive cold hard cash.
          </p>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  selectedCategory === cat
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20"
                    : "bg-slate-900/80 text-slate-400 hover:text-white border border-white/5 hover:border-white/10"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Showcase Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <div
                key={item.id}
                className={`rounded-2xl glass-panel p-6 border ${item.border} hover:border-cyan-400/50 transition-all duration-300 group flex flex-col justify-between shadow-xl`}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-900 text-cyan-300 border border-white/10 font-bold flex items-center gap-1.5">
                      <IconComponent className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{item.badge}</span>
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{item.platform}</span>
                  </div>

                  {/* Card Visual / Thumbnail Simulation */}
                  <div
                    className={`aspect-video w-full rounded-xl bg-gradient-to-br ${item.color} border border-white/10 mb-5 flex flex-col items-center justify-center p-4 text-center relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-300`}
                  >
                    <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white mb-2 group-hover:scale-110 transition-transform shadow-lg">
                      <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                    </div>
                    <span className="text-[11px] font-mono text-cyan-200 tracking-wider font-semibold">
                      {item.client}
                    </span>
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors mb-2 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
                    {item.description}
                  </p>
                </div>

                {/* Footer Stats */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-bold text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    <span>{item.stats}</span>
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">VERIFIED ROAS</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
