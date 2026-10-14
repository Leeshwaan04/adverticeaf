"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import BoringVsAF from "@/components/BoringVsAF";
import AdRoaster from "@/components/AdRoaster";
import CreativeShowcase from "@/components/CreativeShowcase";
import RoiCalculator from "@/components/RoiCalculator";
import Pricing from "@/components/Pricing";
import LeadModal from "@/components/LeadModal";
import Footer from "@/components/Footer";

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPrefill, setModalPrefill] = useState<{
    brand?: string;
    niche?: string;
    plan?: string;
  }>({});

  const handleOpenAudit = (prefillInfo?: { brand?: string; niche?: string }) => {
    setModalPrefill(prefillInfo || {});
    setModalOpen(true);
  };

  const handleSelectPlan = (planName: string) => {
    setModalPrefill({ plan: planName });
    setModalOpen(true);
  };

  return (
    <main className="min-h-screen bg-[#030712] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Navigation */}
      <Navbar onOpenAudit={() => handleOpenAudit()} />

      {/* Hero with dynamic headline & metrics */}
      <Hero onOpenAudit={() => handleOpenAudit()} />

      {/* Interactive Ad Roaster & Hook Lab (Free Viral Lead Magnet) */}
      <AdRoaster onOpenAudit={handleOpenAudit} />

      {/* Interactive Comparison: Boring Ads vs Advertice AF */}
      <BoringVsAF />

      {/* Creative Showcase & Playbook Formats */}
      <CreativeShowcase />

      {/* Interactive ROI & Spend Growth Simulator */}
      <RoiCalculator onOpenAudit={() => handleOpenAudit()} />

      {/* Pricing & Engagement Models */}
      <Pricing onSelectPlan={handleSelectPlan} />

      {/* Footer */}
      <Footer />

      {/* Audit & Consultation Booking Modal */}
      <LeadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        prefill={modalPrefill}
      />
    </main>
  );
}
