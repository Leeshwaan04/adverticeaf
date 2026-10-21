"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Logo from "@/components/Logo";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const triggerOpenBid = () => {
    window.dispatchEvent(new CustomEvent("adv:open-bid"));
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b transition-colors duration-200 ${
        scrolled ? "border-line bg-ink/95 backdrop-blur-md" : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={triggerOpenBid}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#e2573f] px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-lg shadow-[#e2573f]/25 transition-all hover:bg-[#cf4b34] hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Add Your Site</span>
          </button>
        </div>
      </div>
    </header>
  );
}
