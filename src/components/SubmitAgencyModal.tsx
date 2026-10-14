"use client";

import React, { useState } from "react";
import { X, CheckCircle2, ArrowRight, ShieldCheck, RefreshCw, Flame } from "lucide-react";
import confetti from "canvas-confetti";

interface SubmitAgencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SubmitAgencyModal({ isOpen, onClose }: SubmitAgencyModalProps) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [category, setCategory] = useState("Meme Marketing");
  const [country, setCountry] = useState("India");
  const [city, setCity] = useState("");
  const [teamSize, setTeamSize] = useState("10-50");
  const [minBudget, setMinBudget] = useState("$3,000 - $5,000 / mo");
  const [clients, setClients] = useState("");
  const [email, setEmail] = useState("");
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
          particleCount: 75,
          spread: 65,
          origin: { y: 0.6 },
          colors: ["#38bdf8", "#818cf8", "#f43f5e", "#fbbf24"],
        });
      } catch {
        // Fallback
      }
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl glass-panel p-6 sm:p-8 border border-cyan-500/40 shadow-2xl shadow-cyan-950/60 bg-[#070d1d]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Flame className="w-3.5 h-3.5" />
                <span>Join The Global 38,000+ Index</span>
              </div>
              <h3 className="text-2xl font-black text-white">
                List or Claim Your Agency Profile
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Get discovered by high-budget brands seeking modern meme marketing, UGC, 3D CGI, and performance campaigns.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-300 tracking-wider block mb-1">
                    Agency / Studio Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. NeonMeme Labs"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-300 tracking-wider block mb-1">
                    Website URL
                  </label>
                  <input
                    type="text"
                    required
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://youragency.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-300 tracking-wider block mb-1">
                    Primary Discipline
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white"
                  >
                    <option value="Meme Marketing">Meme Marketing & Trend Hijacking</option>
                    <option value="TikTok & UGC">TikTok & UGC Video Production</option>
                    <option value="3D CGI & VFX">3D CGI & VFX Commercials</option>
                    <option value="Performance Ads">Performance Marketing & Paid Ads</option>
                    <option value="Full-Service Creative">Full-Service Creative & Brand Strategy</option>
                    <option value="Influencer Marketing">Influencer Marketing & Creator Talent</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-300 tracking-wider block mb-1">
                    Country
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white"
                  >
                    <option value="India">India 🇮🇳</option>
                    <option value="United States">United States 🇺🇸</option>
                    <option value="United Kingdom">United Kingdom 🇬🇧</option>
                    <option value="United Arab Emirates">United Arab Emirates 🇦🇪</option>
                    <option value="Canada">Canada 🇨🇦</option>
                    <option value="Australia">Australia 🇦🇺</option>
                    <option value="Singapore / SE Asia">Singapore & SE Asia 🇸🇬</option>
                    <option value="Global / Remote">Global / Remote 🌐</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-300 tracking-wider block mb-1">
                    Headquarters City
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Mumbai, New York, London, Dubai"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-300 tracking-wider block mb-1">
                    Agency Team Size
                  </label>
                  <select
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white"
                  >
                    <option value="1-10 creators">1-10 creators (Boutique)</option>
                    <option value="10-50">10-50 (Growth Studio)</option>
                    <option value="50-250">50-250 (Mid-Scale)</option>
                    <option value="250-1,000+">250-1,000+ (Global Network)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-300 tracking-wider block mb-1">
                    Starting Monthly Retainer
                  </label>
                  <select
                    value={minBudget}
                    onChange={(e) => setMinBudget(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white"
                  >
                    <option value="<$2,500 / mo">&lt; $2,500 / mo</option>
                    <option value="$3,000 - $5,000 / mo">$3,000 - $5,000 / mo</option>
                    <option value="$5,000 - $10,000 / mo">$5,000 - $10,000 / mo</option>
                    <option value="$10,000+ / mo">$10,000+ / mo</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-300 tracking-wider block mb-1">
                    Official Verification Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@youragency.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-300 tracking-wider block mb-1">
                  Notable Clients / Viral Campaigns
                </label>
                <input
                  type="text"
                  value={clients}
                  onChange={(e) => setClients(e.target.value)}
                  placeholder="e.g. Swiggy, Netflix, Gymshark, Nike, Fabletics"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder-slate-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-600 hover:opacity-95 text-white font-extrabold text-sm shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all mt-6"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Verifying Agency Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Agency for Free Verification</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified profiles receive the &ldquo;Verified AF&rdquo; badge and client inquiry routing.</span>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white">Agency Profile Submitted!</h3>
            <p className="text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
              We have queued <strong>{name}</strong> for indexing in the AdverticeAF global directory. Our team will verify your listing via <strong>{email}</strong> within 24 hours.
            </p>
            <div className="pt-4">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

