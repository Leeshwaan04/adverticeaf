"use client";

import React from "react";
import { Check, Flame, ArrowRight, Zap } from "lucide-react";

interface PricingProps {
  onSelectPlan: (planName: string) => void;
}

export default function Pricing({ onSelectPlan }: PricingProps) {
  const plans = [
    {
      name: "Creative Sprint",
      tagline: "For brands needing an immediate injection of winning creatives to beat ad fatigue.",
      price: "$3,450",
      period: "one-time sprint",
      popular: false,
      features: [
        "10 High-Velocity Scripted Hooks",
        "4 Full UGC & Motion Ad Variations",
        "Deep Competitive Creative Teardown",
        "Delivered in 7 Business Days",
        "Platform Optimized: TikTok, Reels & Shorts",
        "1 Round of Rapid Revisions",
      ],
      cta: "Book Creative Sprint",
      color: "border-white/10 hover:border-cyan-500/40",
    },
    {
      name: "Scale & Dominate",
      tagline: "Our flagship growth partnership. Continuous creative velocity that scales ROAS.",
      price: "$6,850",
      period: "per month",
      popular: true,
      features: [
        "20+ High-Velocity Ad Variations / Month",
        "Weekly Angle Testing & Iterative Drops",
        "3D CGI & VFX Product Reveals",
        "Dedicated Creator Talent Matching",
        "Weekly Performance Analytics & ROAS Sync",
        "Private Slack Channel with Creative Director",
        "Control Outperformance Guarantee",
      ],
      cta: "Scale Your Account",
      color: "border-cyan-400/60 ring-1 ring-cyan-400/40 shadow-2xl shadow-cyan-950/40",
    },
    {
      name: "Full Throttle Enterprise",
      tagline: "Full-stack omni-channel dominance for high-volume 7 & 8-figure brands.",
      price: "$12,500+",
      period: "custom scope",
      popular: false,
      features: [
        "Unlimited Creative Iterations & Volume",
        "Hollywood-Grade 3D CGI Commercials",
        "Direct-Response High CVR Landing Pages",
        "Celebrity & Tier-1 Creator Talent Integration",
        "End-to-End Media Buying & Spend Optimization",
        "24/7 Dedicated Growth Team",
      ],
      cta: "Schedule Enterprise Brief",
      color: "border-white/10 hover:border-indigo-500/40",
    },
  ];

  return (
    <section id="pricing" className="py-24 relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Zap className="w-3.5 h-3.5" />
            <span>Transparent Investment</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            No Hourly Fluff. Just Pure Creative Velocity.
          </h2>
          <p className="text-slate-300 text-base sm:text-lg">
            Choose the tier that matches your monthly growth targets. Every tier comes with our creative performance standard.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((p, idx) => (
            <div
              key={idx}
              className={`rounded-3xl glass-panel p-8 border ${p.color} transition-all duration-300 flex flex-col justify-between relative`}
            >
              {p.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-cyan-500/30 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Most Popular Growth Tier</span>
                </div>
              )}

              <div>
                <div className="mb-4">
                  <h3 className="text-2xl font-black text-white">{p.name}</h3>
                  <p className="text-xs text-slate-400 mt-2 min-h-[36px]">{p.tagline}</p>
                </div>

                <div className="py-4 border-y border-white/5 mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-white">{p.price}</span>
                    <span className="text-xs text-slate-400 font-mono">/ {p.period}</span>
                  </div>
                </div>

                {/* Features list */}
                <div className="space-y-3 mb-8">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    What is included:
                  </div>
                  {p.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                      <div className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-cyan-400" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <button
                  onClick={() => onSelectPlan(p.name)}
                  className={`w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    p.popular
                      ? "bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-600 text-white shadow-xl shadow-cyan-500/30 hover:opacity-95"
                      : "bg-slate-900 hover:bg-slate-800 text-white border border-white/10 hover:border-cyan-500/30"
                  }`}
                >
                  <span>{p.cta}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
