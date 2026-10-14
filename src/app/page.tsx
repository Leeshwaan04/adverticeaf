"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import MarketplaceDirectory from "@/components/MarketplaceDirectory";
import AgencyProfileModal from "@/components/AgencyProfileModal";
import SubmitAgencyModal from "@/components/SubmitAgencyModal";
import BoringVsAF from "@/components/BoringVsAF";
import AdRoaster from "@/components/AdRoaster";
import CreativeShowcase from "@/components/CreativeShowcase";
import RoiCalculator from "@/components/RoiCalculator";
import Pricing from "@/components/Pricing";
import LeadModal from "@/components/LeadModal";
import Footer from "@/components/Footer";
import { Agency } from "@/data/agencies";

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPrefill, setModalPrefill] = useState<{
    brand?: string;
    niche?: string;
    plan?: string;
  }>({});

  // Marketplace Modals State
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [submitAgencyOpen, setSubmitAgencyOpen] = useState(false);

  const handleOpenAudit = (prefillInfo?: { brand?: string; niche?: string }) => {
    setModalPrefill(prefillInfo || {});
    setModalOpen(true);
  };

  const handleSelectPlan = (planName: string) => {
    setModalPrefill({ plan: planName });
    setModalOpen(true);
  };

  const handleRequestQuote = (agency: Agency) => {
    setModalPrefill({
      brand: `Inquiry for ${agency.name}`,
      niche: agency.category,
    });
    setModalOpen(true);
  };

  return (
    <main className="min-h-screen bg-[#030712] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Navigation with Agency Directory shortcuts */}
      <Navbar
        onOpenAudit={() => handleOpenAudit()}
        onOpenSubmitAgency={() => setSubmitAgencyOpen(true)}
      />

      {/* Hero with dynamic rotating headline & metrics */}
      <Hero onOpenAudit={() => handleOpenAudit()} />

      {/* The Global Marketplace & 38k+ Agency Directory */}
      <MarketplaceDirectory
        onSelectAgency={(agency) => setSelectedAgency(agency)}
        onRequestQuote={handleRequestQuote}
        onOpenSubmitAgency={() => setSubmitAgencyOpen(true)}
      />

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

      {/* Agency Dossier Profile Modal */}
      <AgencyProfileModal
        agency={selectedAgency}
        onClose={() => setSelectedAgency(null)}
        onRequestQuote={handleRequestQuote}
      />

      {/* List Your Agency Modal */}
      <SubmitAgencyModal
        isOpen={submitAgencyOpen}
        onClose={() => setSubmitAgencyOpen(false)}
      />

      {/* Audit & Consultation Booking Modal */}
      <LeadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        prefill={modalPrefill}
      />
    </main>
  );
}
