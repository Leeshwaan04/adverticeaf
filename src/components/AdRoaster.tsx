"use client";

import React, { useState } from "react";
import { Flame, Sparkles, Copy, Check, RefreshCw, AlertTriangle, ArrowRight, Lightbulb, Zap } from "lucide-react";
import confetti from "canvas-confetti";

interface AdRoasterProps {
  onOpenAudit: (prefillInfo?: { brand: string; niche: string }) => void;
}

interface RoastResult {
  score: number;
  grade: string;
  gradeColor: string;
  verdict: string;
  critique: string[];
  reworkedHooks: {
    type: string;
    hook: string;
    psychology: string;
    visualDirection: string;
  }[];
}

const SAMPLE_ADS = [
  {
    brand: "AuraHydrate",
    niche: "Fitness & Wellness",
    channel: "TikTok / Reels",
    headline: "Buy our high quality electrolyte powder with 10 essential vitamins today!",
  },
  {
    brand: "TaskSprint",
    niche: "B2B SaaS",
    channel: "Meta Feed",
    headline: "The all-in-one project management software designed for agile teams.",
  },
  {
    brand: "LuxeGlow",
    niche: "D2C E-commerce / Skincare",
    channel: "YouTube Shorts",
    headline: "Our anti-aging peptide serum will make your skin look 10 years younger.",
  },
];

export default function AdRoaster({ onOpenAudit }: AdRoasterProps) {
  const [brand, setBrand] = useState("");
  const [niche, setNiche] = useState("D2C E-commerce");
  const [channel, setChannel] = useState("TikTok / Reels");
  const [headline, setHeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RoastResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const loadSample = (sample: (typeof SAMPLE_ADS)[0]) => {
    setBrand(sample.brand);
    setNiche(sample.niche);
    setChannel(sample.channel);
    setHeadline(sample.headline);
  };

  const handleRoast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headline.trim()) return;

    setLoading(true);

    // Simulate real-time marketing analysis engine
    setTimeout(() => {
      const charCount = headline.length;
      const lower = headline.toLowerCase();

      // Simple heuristic scoring for fun & realistic roasting
      const isTooLong = charCount > 75;
      const hasBoringWords = ["quality", "all-in-one", "software", "solution", "buy", "discount", "essential"].some(w => lower.includes(w));
      const hasUrgencyOrCuriosity = ["stop", "why", "secret", "never", "truth", "hack", "mistake"].some(w => lower.includes(w));

      let calculatedScore = 52;
      if (hasBoringWords) calculatedScore -= 18;
      if (isTooLong) calculatedScore -= 12;
      if (hasUrgencyOrCuriosity) calculatedScore += 24;
      calculatedScore = Math.max(28, Math.min(88, calculatedScore));

      let grade = "C-";
      let gradeColor = "text-amber-400";
      if (calculatedScore >= 80) {
        grade = "A-";
        gradeColor = "text-emerald-400";
      } else if (calculatedScore >= 60) {
        grade = "B";
        gradeColor = "text-sky-400";
      } else if (calculatedScore < 45) {
        grade = "D+ (Boring AF)";
        gradeColor = "text-rose-400";
      }

      const generatedResult: RoastResult = {
        score: calculatedScore,
        grade,
        gradeColor,
        verdict:
          calculatedScore < 50
            ? "This ad screams 'skip me in 0.4 seconds'. You are paying Mark Zuckerberg or ByteDance for people to ignore you."
            : "Decent foundation, but it lacks the visceral emotional friction that forces someone to stop their thumb.",
        critique: [
          "Zero pattern-interrupt: Sounds identical to 400 other brands in the exact same auction.",
          "Self-obsessed copy: Talks about your product features before establishing why the viewer should even give a damn.",
          "Weak Call-to-Emotion: Asking for a purchase before triggering curiosity or friction.",
        ],
        reworkedHooks: [
          {
            type: "🔥 The Contrarian Hot Take",
            hook: `“If you're still using standard ${niche.toLowerCase()} products in 2026, stop. Here's what your favorite brands don't want you noticing...”`,
            psychology: "Attacks existing habits, creating immediate FOMO and curiosity.",
            visualDirection: "Fast visual zoom into phone screen with dramatic SFX.",
          },
          {
            type: "⚡ The 0.5s Pattern Interrupt",
            hook: `“I spent $3,000 testing every major brand so you don't have to. Only one was actually worth it — and it wasn't the famous one.”`,
            psychology: "High perceived value + unbiased authority positioning.",
            visualDirection: "Split screen comparing unboxing with honest facial reaction.",
          },
          {
            type: "❄️ The Advertice AF Visual Spectacle",
            hook: `“This looks illegal, but it's just the new ${brand || "product"} drop hitting your feed.”`,
            psychology: "Hyperbolic curiosity gap; irresistible loop for short-form video.",
            visualDirection: "Hyper-real 3D CGI product explosion into slow-motion water/ice.",
          },
        ],
      };

      setResult(generatedResult);
      setLoading(false);

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ["#38bdf8", "#818cf8", "#f43f5e"],
        });
      } catch (err) {
        // Confetti fallback
      }
    }, 700);
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <section id="roaster" className="py-24 relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Flame className="w-3.5 h-3.5" />
            <span>Free Interactive Tool</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            The AI Ad Roaster & Hook Lab
          </h2>
          <p className="text-slate-300 text-base sm:text-lg">
            Paste your current ad headline or video hook. Our creative intelligence engine will roast it with brutal honesty and write 3 high-converting, viral alternatives.
          </p>
        </div>

        {/* Roaster Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Input Panel */}
          <div className="lg:col-span-6 rounded-2xl glass-panel p-6 sm:p-8 border border-white/10 shadow-xl shadow-cyan-950/20">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>Ad Diagnostics Parameters</span>
              </span>
              <div className="text-xs text-slate-400">Takes 5 seconds</div>
            </div>

            {/* Quick Samples Pill */}
            <div className="mb-6">
              <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider block mb-2">
                Need inspiration? Try a sample:
              </label>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_ADS.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => loadSample(s)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-cyan-300 border border-white/5 hover:border-cyan-500/30 transition-all"
                  >
                    {s.brand} ({s.niche})
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleRoast} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-300 tracking-wider block mb-1.5">
                    Brand / Product Name
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. HydroDrop, ZenMode"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 text-sm text-white placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-300 tracking-wider block mb-1.5">
                    Primary Niche
                  </label>
                  <select
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 text-sm text-white"
                  >
                    <option value="D2C E-commerce">D2C E-commerce / Physical Products</option>
                    <option value="B2B SaaS">B2B SaaS & Tech</option>
                    <option value="Fitness & Wellness">Fitness, Health & Supplements</option>
                    <option value="FinTech / Web3">FinTech, Wealth & Finance</option>
                    <option value="Fashion & Apparel">Streetwear & Apparel</option>
                    <option value="Mobile App">Mobile Apps & Gaming</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-300 tracking-wider block mb-1.5">
                  Target Ad Placement
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["TikTok / Reels", "Meta Feed", "YouTube Shorts", "Search / X"].map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setChannel(ch)}
                      className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all text-center ${
                        channel === ch
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                          : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-300 tracking-wider block mb-1.5">
                  Your Current Ad Hook / Headline
                </label>
                <textarea
                  rows={3}
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Paste your video opening hook, headline, or primary ad copy here..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 text-sm text-white placeholder-slate-500 resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !headline.trim()}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-cyan-500 hover:from-amber-400 hover:via-rose-400 hover:to-cyan-400 text-white font-extrabold text-sm shadow-xl shadow-rose-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Analyzing Hook Psychology...</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-5 h-5 text-yellow-200" />
                    <span>Roast This Ad & Generate 3 Viral Hooks</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Results Display Panel */}
          <div className="lg:col-span-6 rounded-2xl glass-panel p-6 sm:p-8 border border-white/10 shadow-xl min-h-[460px] flex flex-col justify-center">
            {!result && !loading && (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-white/5 flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <Flame className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Awaiting Your Creative</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                  Type your current ad or select one of the samples to see your performance score and viral hooks.
                </p>
              </div>
            )}

            {loading && (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 rounded-full border-4 border-cyan-400/20 border-t-cyan-400 animate-spin mx-auto" />
                <p className="text-sm font-semibold text-cyan-300">
                  Benchmarking against 14,000+ top-performing DTC & SaaS ads...
                </p>
              </div>
            )}

            {result && !loading && (
              <div className="space-y-6">
                {/* Score Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-white/5">
                  <div>
                    <span className="text-xs uppercase font-semibold text-slate-400">Hook Velocity Score</span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-4xl font-black text-white">{result.score}</span>
                      <span className="text-sm text-slate-400">/ 100</span>
                      <span className={`text-base font-extrabold ${result.gradeColor} ml-2`}>
                        Grade: {result.grade}
                      </span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-cyan-300 border border-cyan-500/20 font-mono font-medium">
                      {channel}
                    </span>
                  </div>
                </div>

                {/* Verdict Roast */}
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/20 text-rose-200 text-sm">
                  <div className="font-bold flex items-center gap-1.5 mb-1 text-rose-300">
                    <AlertTriangle className="w-4 h-4" />
                    <span>The Brutal Verdict:</span>
                  </div>
                  <p className="leading-relaxed">{result.verdict}</p>
                </div>

                {/* Spicy AF Hooks */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>3 High-Converting Hook Alternatives</span>
                    </span>
                    <span className="text-[11px] text-slate-400">Click to copy</span>
                  </div>

                  <div className="space-y-3">
                    {result.reworkedHooks.map((h, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl bg-slate-900/90 border border-white/5 hover:border-cyan-500/40 transition-all group"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                            {h.type}
                          </span>
                          <button
                            onClick={() => copyToClipboard(h.hook, i)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-all"
                            title="Copy hook"
                          >
                            {copiedIndex === i ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <p className="text-sm font-semibold text-white mb-2 leading-snug">
                          {h.hook}
                        </p>
                        <div className="text-[11px] text-slate-400 flex flex-col gap-0.5 border-t border-white/5 pt-1.5">
                          <div>
                            <strong className="text-slate-300">Psychology:</strong> {h.psychology}
                          </div>
                          <div>
                            <strong className="text-slate-300">Visual Cue:</strong> {h.visualDirection}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audit CTA */}
                <div className="pt-2">
                  <button
                    onClick={() => onOpenAudit({ brand, niche })}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-600 hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 group transition-all"
                  >
                    <span>Get Advertice AF to Produce These Full Creatives</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
