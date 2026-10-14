"use client";

import React, { useState, useMemo } from "react";
import { Agency, GLOBAL_AGENCIES, DIRECTORY_METRICS } from "@/data/agencies";
import { Search, MapPin, Star, CheckCircle2, Globe, Filter, ArrowRight, PlusCircle } from "lucide-react";

interface MarketplaceDirectoryProps {
  onSelectAgency: (agency: Agency) => void;
  onRequestQuote: (agency: Agency) => void;
  onOpenSubmitAgency: () => void;
}

export default function MarketplaceDirectory({
  onSelectAgency,
  onRequestQuote,
  onOpenSubmitAgency,
}: MarketplaceDirectoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const categories = [
    { label: "All Categories", value: "ALL" },
    { label: "Meme Marketing 🔥", value: "Meme Marketing" },
    { label: "TikTok & UGC 📱", value: "TikTok & UGC" },
    { label: "3D CGI & VFX 🧊", value: "3D CGI & VFX" },
    { label: "Performance Ads ⚡", value: "Performance Ads" },
    { label: "Full-Service Creative 🎨", value: "Full-Service Creative" },
  ];

  const filteredAgencies = useMemo(() => {
    return GLOBAL_AGENCIES.filter((agency) => {
      // Country Filter
      if (selectedCountry !== "ALL") {
        if (selectedCountry === "GLOBAL") {
          if (agency.countryCode !== "GLOBAL") return false;
        } else if (agency.countryCode !== selectedCountry) {
          return false;
        }
      }

      // Category Filter
      if (selectedCategory !== "ALL" && agency.category !== selectedCategory) {
        return false;
      }

      // Search Query (matches name, tagline, city, country, specialties, client highlights)
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase();
        const matchesName = agency.name.toLowerCase().includes(query);
        const matchesTagline = agency.tagline.toLowerCase().includes(query);
        const matchesCity = agency.city.toLowerCase().includes(query);
        const matchesCountry = agency.country.toLowerCase().includes(query);
        const matchesSpecialty = agency.specialties.some((s) => s.toLowerCase().includes(query));
        const matchesClient = agency.clientHighlights.some((c) => c.toLowerCase().includes(query));

        if (!matchesName && !matchesTagline && !matchesCity && !matchesCountry && !matchesSpecialty && !matchesClient) {
          return false;
        }
      }

      return true;
    });
  }, [searchTerm, selectedCountry, selectedCategory]);

  return (
    <section id="marketplace" className="py-24 relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Marketplace Section Header */}
        <div className="text-center max-w-4xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Globe className="w-3.5 h-3.5" />
            <span>The Global Creative Directory</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            The Worldwide Index of Advertising, Meme & Creative Studios
          </h2>
          <p className="text-slate-300 text-base sm:text-lg max-w-3xl mx-auto">
            Explore <strong>{DIRECTORY_METRICS.totalAgenciesListed}</strong> top-tier advertising agencies, meme marketing specialists, UGC creators, and 3D CGI powerhouses across India, the US, UK, UAE, and beyond.
          </p>

          {/* Directory Stats Ticker */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-6 pt-4 border-t border-white/5 text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span><strong>38,450+</strong> Agencies Tracked</span>
            </div>
            <div>•</div>
            <div><strong>64+</strong> Countries</div>
            <div>•</div>
            <div><strong>4,200+</strong> Meme & Culture Studios</div>
            <div>•</div>
            <div><strong>100%</strong> Independent & Verified</div>
          </div>
        </div>

        {/* Search & Filter Bar Controls */}
        <div className="rounded-2xl glass-panel p-5 sm:p-6 border border-white/10 mb-8 shadow-xl shadow-cyan-950/20 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by agency name, city (e.g. Mumbai, New York, London), specialty or client (e.g. Swiggy, Netflix)..."
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder-slate-400 shadow-inner"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-md"
                >
                  Clear
                </button>
              )}
            </div>

            {/* List Agency CTA button */}
            <button
              onClick={onOpenSubmitAgency}
              className="px-5 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-cyan-300 hover:text-white border border-cyan-500/30 hover:border-cyan-400 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4 text-cyan-400" />
              <span>List Your Agency (Free)</span>
            </button>
          </div>

          {/* Country Filter Tabs */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400 mb-2">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>Filter by Region:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {DIRECTORY_METRICS.topCountries.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setSelectedCountry(c.code)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    selectedCountry === c.code
                      ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                      : "bg-slate-900/80 text-slate-300 hover:text-white border border-white/5 hover:border-cyan-500/20"
                  }`}
                >
                  <span>{c.flag}</span>
                  <span>{c.name}</span>
                  {c.count && <span className="text-[10px] opacity-75">({c.count})</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400 mb-2">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span>Filter by Agency Discipline:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedCategory === cat.value
                      ? "bg-gradient-to-r from-sky-400 to-indigo-500 text-white font-bold shadow-md shadow-sky-500/20"
                      : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/5"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Counter & Controls */}
        <div className="flex items-center justify-between mb-6 text-xs text-slate-400 font-mono">
          <div>
            Showing <strong className="text-cyan-300">{filteredAgencies.length}</strong> featured agencies{" "}
            {selectedCountry !== "ALL" && `in ${selectedCountry}`}{" "}
            {selectedCategory !== "ALL" && `under ${selectedCategory}`}
          </div>
          <div>Sorted by Verified Viral Rank</div>
        </div>

        {/* Agency Cards Grid */}
        {filteredAgencies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredAgencies.map((agency) => (
              <div
                key={agency.id}
                className="rounded-2xl glass-panel p-6 border border-white/10 hover:border-cyan-400/40 transition-all duration-300 group flex flex-col justify-between shadow-xl shadow-cyan-950/10 hover:shadow-cyan-950/30"
              >
                <div>
                  {/* Top Header: Location, Category & Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
                      <span>{agency.flag}</span>
                      <span>{agency.city}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {agency.verified && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                      {agency.featured && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          Featured AF
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Name & Tagline */}
                  <h3 className="text-xl font-black text-white group-hover:text-cyan-300 transition-colors mb-1.5 flex items-center justify-between">
                    <span>{agency.name}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5 font-mono">
                      {agency.category}
                    </span>
                  </h3>
                  <p className="text-xs text-cyan-300 font-medium mb-3 italic">
                    &ldquo;{agency.tagline}&rdquo;
                  </p>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4 line-clamp-3">
                    {agency.description}
                  </p>

                  {/* Specialties Pills */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {agency.specialties.slice(0, 3).map((spec, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-white/5"
                      >
                        {spec}
                      </span>
                    ))}
                    {agency.specialties.length > 3 && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-slate-900 text-slate-500">
                        +{agency.specialties.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Client Highlights */}
                  <div className="mb-4 pt-3 border-t border-white/5">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1.5">
                      Client Portfolio:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {agency.clientHighlights.map((client, i) => (
                        <span
                          key={i}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/15 font-semibold"
                        >
                          {client}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Rating, Starting Budget, CTAs */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 font-bold text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{agency.rating}</span>
                      <span className="text-slate-400 font-normal">({agency.reviewsCount})</span>
                    </div>
                    <div className="text-slate-400">
                      Starts from <strong className="text-emerald-400 font-mono">{agency.minBudget}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => onSelectAgency(agency)}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-white/10 text-xs font-semibold transition-all"
                    >
                      View Dossier
                    </button>
                    <button
                      onClick={() => onRequestQuote(agency)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:opacity-95 text-slate-950 font-extrabold text-xs shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-1"
                    >
                      <span>Brief Agency</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 rounded-2xl glass-panel border border-white/10">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Search className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No agencies match your search</h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto mb-6">
              Try searching for different keywords, clear your filters, or list this agency yourself!
            </p>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCountry("ALL");
                setSelectedCategory("ALL");
              }}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Bottom Scale Banner: 30k - 40k Agencies Roadmap */}
        <div className="mt-16 p-8 rounded-3xl glass-panel border border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 via-slate-950 to-indigo-950/40 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-2">
              <span className="text-xs uppercase font-mono font-bold text-cyan-400 tracking-wider">
                Scalable Directory Infrastructure
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                Mapping the entire 40,000+ agency ecosystem
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                AdverticeAF is systematically indexing advertising agencies, boutique meme shops, influencer managers, and CGI studios across 64+ countries. Whether you run a 3-person meme page agency in Delhi or a 500-person commercial house in London, this is where brands find you.
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-center">
              <button
                onClick={onOpenSubmitAgency}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-600 font-bold text-white text-xs sm:text-sm shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>List an Agency on AdverticeAF</span>
              </button>
              <a
                href="#pricing"
                className="w-full py-3.5 px-6 rounded-xl bg-slate-900 border border-white/10 hover:border-cyan-500/30 font-semibold text-slate-200 text-xs sm:text-sm flex items-center justify-center gap-2 text-center"
              >
                <span>Partner as a Verified Agency</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

