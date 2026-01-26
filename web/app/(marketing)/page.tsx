import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { CountdownSection } from "@/components/countdown-section"
import { ProblemSection } from "@/components/problem-section"
import { SolutionSection } from "@/components/solution-section"
import { FeaturesSection } from "@/components/features-section"
import { ComparisonSection } from "@/components/comparison-section"
import { PricingSection } from "@/components/pricing-section"
import { SecuritySection } from "@/components/security-section"
import { AboutSection } from "@/components/about-section"
import { FAQSection } from "@/components/faq-section"
import { CTASection } from "@/components/cta-section"
import { Footer } from "@/components/footer"
import { MobileCTABar } from "@/components/mobile-cta-bar"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <CountdownSection />
      <ProblemSection />
      <SolutionSection />
      <FeaturesSection />
      <ComparisonSection />
      <PricingSection />
      <SecuritySection />
      <AboutSection />
      <FAQSection />
      <CTASection />
      <Footer />
      <MobileCTABar />
      {/* Spacer for mobile CTA bar */}
      <div className="h-20 lg:hidden" />
    </main>
  )
}
