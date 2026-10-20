import Hero from "@/components/Hero";
import CampaignsTeaser from "@/components/campaigns/CampaignsTeaser";
import HookChecker from "@/components/HookChecker";
import DirectoryTeaser from "@/components/DirectoryTeaser";
import CreativeFormats from "@/components/CreativeFormats";
import BudgetPlanner from "@/components/BudgetPlanner";
import Services from "@/components/Services";
import Faq from "@/components/Faq";

export default function Home() {
  return (
    <>
      <Hero />
      <CampaignsTeaser />
      <HookChecker />
      <DirectoryTeaser />
      <CreativeFormats />
      <BudgetPlanner />
      <Services />
      <Faq />
    </>
  );
}
