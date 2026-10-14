"use client";

import React, { useState } from "react";
import { X, Sparkles, CheckCircle2, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";
import confetti from "canvas-confetti";

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefill?: {
    brand?: string;
    niche?: string;
    plan?: string;
  };
}

export default function LeadModal({ isOpen, onClose, prefill }: LeadModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(prefill?.brand || "");
  const [budget, setBudget] = useState("$10k - $25k / mo");
  const [bottleneck, setBottleneck] = useState("Ad fatigue / High CPA");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#38bdf8", "#818cf8", "#34d399", "#f43f5e"],
        });
      } catch (err) {
        // Fallback
      }
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl glass-panel p-6 sm:p-8 border border-cyan-500/40 shadow-2xl shadow-cyan-950/60 bg-[#070d1d]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Zero Fluff Creative Audit</span>
              </div>
              <h3 className="text-2xl font-black text-white">
                Turn Your Ad Account Into A Customer Printer
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Tell us about your brand. We'll tear down your existing creatives and pitch 3 high-probability angles on our call.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-300 tracking-wider block mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Mercer"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-300 tracking-wider block mb-1">
                  Work Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@yourbrand.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder-slate-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-300 tracking-wider block mb-1">
                    Brand / Website
                  </label>
                  <input
                    type="text"
                    required
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="yourbrand.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-300 tracking-wider block mb-1">
                    Monthly Ad Budget
                  </label>
                  <select
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white"
                  >
                    <option value="<$5k / mo">&lt; $5,000 / mo</option>
                    <option value="$5k - $10k / mo">$5,000 - $10,000 / mo</option>
                    <option value="$10k - $25k / mo">$10,000 - $25,000 / mo</option>
                    <option value="$25k - $50k / mo">$25,000 - $50,000 / mo</option>
                    <option value="$50k+ / mo">$50,000+ / mo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-300 tracking-wider block mb-1">
                  Current Biggest Creative Pain Point
                </label>
                <select
                  value={bottleneck}
                  onChange={(e) => setBottleneck(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white"
                >
                  <option value="Ad fatigue / High CPA">Creatives fatigue in 1-2 weeks; high CPA</option>
                  <option value="Lack of short-form video volume">Cannot produce enough TikTok / Reels hooks</option>
                  <option value="Need 3D CGI / High production">Need high-end 3D visuals & CGI reveals</option>
                  <option value="Scaling past $50k/mo">Stuck at spend ceiling without tanking ROAS</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-600 hover:opacity-95 text-white font-extrabold text-sm shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all mt-6"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Preparing Custom Audit...</span>
                  </>
                ) : (
                  <>
                    <span>Claim Free Ad Audit & Strategy Call</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>100% Confidential. Zero spam. Response within 4 business hours.</span>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white">Application Received!</h3>
            <p className="text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
              Thanks <strong>{name}</strong>! Our Creative Director is reviewing <strong>{website}</strong> right now. We will email your audit briefing to <strong>{email}</strong> shortly.
            </p>
            <div className="pt-4">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all"
              >
                Back to AdverticeAF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
