"use client";

import React, { useState } from "react";
import { Calculator, ArrowRight, ShieldCheck, Zap } from "lucide-react";

interface RoiCalculatorProps {
  onOpenAudit: () => void;
}

export default function RoiCalculator({ onOpenAudit }: RoiCalculatorProps) {
  const [budget, setBudget] = useState(15000);

  // Benchmarks
  const cpm = 14; // $14 per 1,000 impressions
  const projectedImpressions = Math.round((budget / cpm) * 1000);
  const creativeVariations = Math.max(8, Math.round(budget / 1200));

  const standardRoas = 1.6;
  const standardRevenue = Math.round(budget * standardRoas);

  const adverticeAfRoas = 3.85;
  const adverticeAfRevenue = Math.round(budget * adverticeAfRoas);
  const additionalProfit = adverticeAfRevenue - standardRevenue;

  return (
    <section id="calculator" className="py-24 relative bg-slate-950/60 border-t border-white/5 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Calculator className="w-3.5 h-3.5" />
            <span>Interactive Profit Model</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Simulate Your Growth Velocity
          </h2>
          <p className="text-slate-300 text-base sm:text-lg">
            Slide your planned monthly ad budget to project impressions, creative testing frequency, and the bottom-line ROAS multiplier.
          </p>
        </div>

        {/* Calculator Widget Container */}
        <div className="max-w-4xl mx-auto rounded-3xl glass-panel p-6 sm:p-10 border border-cyan-500/30 shadow-2xl shadow-cyan-950/30">
          {/* Slider Header */}
          <div className="mb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <span className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Monthly Media Spend Budget
              </span>
              <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-200">
                ${budget.toLocaleString()} <span className="text-sm text-slate-400 font-normal">/ month</span>
              </div>
            </div>

            {/* Range Input Slider */}
            <input
              type="range"
              min={2500}
              max={100000}
              step={2500}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-xs text-slate-500 font-mono mt-2">
              <span>$2.5k (Starter)</span>
              <span>$25k (Growth)</span>
              <span>$50k (Scaling)</span>
              <span>$100k+ (Enterprise)</span>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
              <span className="text-xs text-slate-400 font-medium uppercase">Est. Monthly Impressions</span>
              <div className="text-xl sm:text-2xl font-black text-white mt-1">
                {(projectedImpressions / 1000000).toFixed(1)}M+
              </div>
              <span className="text-[11px] text-cyan-400 font-mono">Hyper-targeted eyes</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
              <span className="text-xs text-slate-400 font-medium uppercase">Creative Testing Sprints</span>
              <div className="text-xl sm:text-2xl font-black text-white mt-1">
                {creativeVariations} Ads / mo
              </div>
              <span className="text-[11px] text-sky-400 font-mono">Hooks, CGI & UGC variants</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
              <span className="text-xs text-slate-400 font-medium uppercase">Projected Net Lift</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
                +${additionalProfit.toLocaleString()}
              </div>
              <span className="text-[11px] text-emerald-300 font-mono">Over baseline agencies</span>
            </div>
          </div>

          {/* Comparison Revenue Bars */}
          <div className="space-y-4 p-5 rounded-2xl bg-slate-900/90 border border-white/5 mb-8">
            {/* Standard Agency */}
            <div>
              <div className="flex justify-between text-xs sm:text-sm font-semibold mb-1.5">
                <span className="text-slate-400">Typical Agency Return (1.6x ROAS)</span>
                <span className="text-slate-300 font-mono">${standardRevenue.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3">
                <div
                  className="bg-slate-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(standardRevenue / adverticeAfRevenue) * 100}%` }}
                />
              </div>
            </div>

            {/* Advertice AF Return */}
            <div>
              <div className="flex justify-between text-xs sm:text-sm font-semibold mb-1.5">
                <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  <span>Advertice AF Performance (3.85x ROAS)</span>
                </span>
                <span className="text-emerald-400 font-mono font-bold">${adverticeAfRevenue.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3">
                <div className="bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400 h-3 rounded-full shadow-lg shadow-cyan-500/30 transition-all duration-300 w-full" />
              </div>
            </div>
          </div>

          {/* Bottom Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Projections based on verified aggregate client campaign averages across TikTok and Meta.</span>
            </div>
            <button
              onClick={onOpenAudit}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-600 hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all whitespace-nowrap"
            >
              <span>Build Custom Growth Forecast</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
