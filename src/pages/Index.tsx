import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import MarqueeBanner from "@/components/MarqueeBanner";
import ServicesSection from "@/components/ServicesSection";
import PortfolioSection from "@/components/PortfolioSection";
import AboutSection from "@/components/AboutSection";
import CTASection from "@/components/CTASection";
import FAQSection from "@/components/FAQSection";
import FooterSection from "@/components/FooterSection";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <MarqueeBanner />
      <ServicesSection />
      <PortfolioSection />
      <AboutSection />
      <CTASection />
      <FAQSection />
      <FooterSection />
    </div>
  );
};

export default Index;
