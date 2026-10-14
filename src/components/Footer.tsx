"use client";

import React from "react";
import { Send } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#02050e] border-t border-white/5 pt-16 pb-12 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/5">
          {/* Brand Manifesto */}
          <div className="lg:col-span-2 space-y-4">
            <a href="#" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-600 p-[1px]">
                <div className="w-full h-full bg-[#030712] rounded-[7px] flex items-center justify-center">
                  <span className="text-base font-black text-cyan-300">A</span>
                  <span className="text-xs font-black text-cyan-400">❄</span>
                </div>
              </div>
              <span className="font-extrabold tracking-tight text-xl text-white">
                advertice<span className="text-cyan-400">af</span>
              </span>
            </a>
            <p className="text-slate-400 text-xs sm:text-sm max-w-sm leading-relaxed">
              The creative growth engine transforming DTC brands, high-growth SaaS, and disruptors into viral powerhouses. High ROAS, zero fluff, cold as ice.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>All Systems Operational • Q4 Creative Pipeline Open</span>
            </div>
          </div>

          {/* Nav column 1 */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">
              Creative Lab
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li><a href="#roaster" className="hover:text-cyan-400 transition-colors">AI Ad Roaster</a></li>
              <li><a href="#showcase" className="hover:text-cyan-400 transition-colors">TikTok & UGC Hooks</a></li>
              <li><a href="#showcase" className="hover:text-cyan-400 transition-colors">3D CGI Product Reveals</a></li>
              <li><a href="#showcase" className="hover:text-cyan-400 transition-colors">Meme Culture-Jacking</a></li>
              <li><a href="#comparison" className="hover:text-cyan-400 transition-colors">Boring vs AdverticeAF</a></li>
            </ul>
          </div>

          {/* Nav column 2 */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">
              Platform & Growth
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li><a href="#calculator" className="hover:text-cyan-400 transition-colors">ROI Simulator</a></li>
              <li><a href="#pricing" className="hover:text-cyan-400 transition-colors">Creative Sprint ($3.4k)</a></li>
              <li><a href="#pricing" className="hover:text-cyan-400 transition-colors">Scale & Dominate ($6.8k)</a></li>
              <li><a href="#pricing" className="hover:text-cyan-400 transition-colors">Full Throttle Enterprise</a></li>
              <li><a href="#" className="hover:text-cyan-400 transition-colors">Case Studies & Metrics</a></li>
            </ul>
          </div>

          {/* Column 3: Newsletter */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">
              &ldquo;The Viral AF Drop&rdquo;
            </h4>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Weekly teardowns of top 0.1% ads currently printing money on TikTok & Meta.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); alert("Subscribed to The Viral AF Drop!"); }} className="space-y-2">
              <input
                type="email"
                placeholder="your.email@brand.com"
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Get Weekly Drops</span>
              </button>
            </form>
          </div>
        </div>

        {/* Bottom row */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} AdverticeAF Inc. All rights reserved. Built for velocity.
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-slate-400">Privacy Policy</a>
            <span>•</span>
            <a href="#" className="hover:text-slate-400">Terms of Service</a>
            <span>•</span>
            <a href="#" className="hover:text-slate-400">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
