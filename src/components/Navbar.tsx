"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Flame, Menu, X, ArrowRight, ShieldCheck } from "lucide-react";

interface NavbarProps {
  onOpenAudit: () => void;
}

export default function Navbar({ onOpenAudit }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#030712]/80 backdrop-blur-md border-b border-white/10 shadow-lg shadow-black/40 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600 p-[1px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-400/40 transition-all duration-300">
              <div className="w-full h-full bg-[#030712] rounded-[11px] flex items-center justify-center">
                <span className="text-xl font-black bg-gradient-to-r from-cyan-300 via-sky-200 to-white bg-clip-text text-transparent">
                  A
                </span>
                <span className="text-sm font-black text-cyan-400 -ml-0.5">❄</span>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-tight text-xl text-white">
                  advertice<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-300">af</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  v2.0
                </span>
              </div>
              <span className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold hidden sm:inline-block">
                Viral Ads • Cold Hard ROI
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a
              href="#roaster"
              className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 py-1"
            >
              <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Roast My Ad</span>
            </a>
            <a href="#showcase" className="hover:text-cyan-400 transition-colors py-1">
              Creative Lab
            </a>
            <a href="#comparison" className="hover:text-cyan-400 transition-colors py-1">
              Why Us
            </a>
            <a href="#calculator" className="hover:text-cyan-400 transition-colors py-1">
              ROI Simulator
            </a>
            <a href="#pricing" className="hover:text-cyan-400 transition-colors py-1">
              Pricing
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={onOpenAudit}
              className="relative inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-semibold rounded-xl group bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500 hover:text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all duration-300 active:scale-95"
            >
              <span className="relative px-4 py-2 transition-all ease-in duration-200 bg-[#070d1d] rounded-[10px] group-hover:bg-opacity-0 flex items-center gap-2 text-cyan-300 group-hover:text-white">
                <Sparkles className="w-4 h-4 text-cyan-400 group-hover:text-white" />
                <span>Get Free Ad Audit</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#070d1d]/95 backdrop-blur-xl border-b border-white/10 px-4 pt-4 pb-6 space-y-4">
          <nav className="flex flex-col space-y-3 text-base font-medium text-slate-200">
            <a
              href="#roaster"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 text-cyan-400 py-2 border-b border-slate-800/60"
            >
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Roast My Ad (Free Tool)</span>
            </a>
            <a
              href="#showcase"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-slate-800/60 hover:text-cyan-400"
            >
              Creative Lab & Formats
            </a>
            <a
              href="#comparison"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-slate-800/60 hover:text-cyan-400"
            >
              Boring Ads vs AdverticeAF
            </a>
            <a
              href="#calculator"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-slate-800/60 hover:text-cyan-400"
            >
              ROI Simulator
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 hover:text-cyan-400"
            >
              Plans & Pricing
            </a>
          </nav>
          <div className="pt-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAudit();
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-600 font-bold text-white text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Get Free Ad Audit</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
