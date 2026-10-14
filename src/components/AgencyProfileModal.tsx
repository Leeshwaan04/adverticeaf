"use client";

import React from "react";
import { Agency } from "@/data/agencies";
import { X, CheckCircle2, Star, ExternalLink, Globe, MapPin, Users, Calendar, DollarSign, Sparkles, MessageSquare, ArrowRight } from "lucide-react";

interface AgencyProfileModalProps {
  agency: Agency | null;
  onClose: () => void;
  onRequestQuote: (agency: Agency) => void;
}

export default function AgencyProfileModal({ agency, onClose, onRequestQuote }: AgencyProfileModalProps) {
  if (!agency) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl glass-panel p-6 sm:p-8 border border-cyan-500/40 shadow-2xl shadow-cyan-950/60 bg-[#070d1d]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Section */}
        <div className="pr-10 mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xl">{agency.flag}</span>
            <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              {agency.city}, {agency.country}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold uppercase tracking-wider">
              {agency.category}
            </span>
            {agency.verified && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Verified AF
              </span>
            )}
          </div>

          <h3 className="text-2xl sm:text-3xl font-black text-white">
            {agency.name}
          </h3>
          <p className="text-sm font-medium text-cyan-300 mt-1">
            "{agency.tagline}"
          </p>

          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg text-xs font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{agency.rating}</span>
              <span className="text-slate-400 font-normal">({agency.reviewsCount} verified reviews)</span>
            </div>
            <a
              href={agency.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 underline underline-offset-2 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{agency.website.replace("https://", "")}</span>
            </a>
          </div>
        </div>

        {/* Agency Key Stats */}
        <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-900/80 border border-white/5 mb-6 text-center sm:text-left">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <Calendar className="w-3 h-3 text-cyan-400 hidden sm:inline" />
              Founded
            </span>
            <div className="text-base sm:text-lg font-bold text-white mt-0.5">{agency.founded}</div>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <Users className="w-3 h-3 text-cyan-400 hidden sm:inline" />
              Team Size
            </span>
            <div className="text-base sm:text-lg font-bold text-white mt-0.5">{agency.teamSize}</div>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-cyan-400 hidden sm:inline" />
              Starting Retainer
            </span>
            <div className="text-base sm:text-lg font-bold text-emerald-400 mt-0.5">{agency.minBudget}</div>
          </div>
        </div>

        {/* Agency Dossier / About */}
        <div className="space-y-6 mb-8 text-sm">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Agency Overview & Positioning
            </h4>
            <p className="text-slate-300 leading-relaxed text-xs sm:text-sm">
              {agency.description}
            </p>
          </div>

          {/* Core Specialties */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Core Creative & Marketing Disciplines
            </h4>
            <div className="flex flex-wrap gap-2">
              {agency.specialties.map((spec, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-white/10 text-xs font-medium"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>

          {/* Client Portfolio Highlights */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Notable Client Highlights & Brands
            </h4>
            <div className="flex flex-wrap gap-2">
              {agency.clientHighlights.map((client, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-xs font-bold"
                >
                  ⚡ {client}
                </span>
              ))}
            </div>
          </div>

          {/* Active Platforms */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Distribution Channels & Ad Formats
            </h4>
            <div className="flex flex-wrap gap-2">
              {agency.platforms.map((plat, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-white/5 text-xs font-mono"
                >
                  {plat}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => {
              onClose();
              onRequestQuote(agency);
            }}
            className="w-full sm:flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-600 hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Request Pitch / Brief {agency.name}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <a
            href={agency.website}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto py-3.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-cyan-500/30 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
          >
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>Visit Agency Site</span>
          </a>
        </div>
      </div>
    </div>
  );
}
