import { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Privacy Policy | FinClear",
  description: "Privacy Policy for FinClear - FinCEN Compliance Made Simple",
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="pt-32 lg:pt-40">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: February 2026</p>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p className="text-muted-foreground">
              Privacy Policy content is being finalized. Please contact{" "}
              <a href="mailto:clear@fincenclear.com" className="text-primary hover:underline">
                clear@fincenclear.com
              </a>{" "}
              with any questions.
            </p>
            
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground mb-4">
              We collect information you provide directly to us, such as when you create an account, 
              submit compliance reports, or contact us for support.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">
              We use the information we collect to provide, maintain, and improve our services, 
              process transactions, and comply with legal obligations.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">3. Data Security</h2>
            <p className="text-muted-foreground mb-4">
              We implement appropriate technical and organizational measures to protect your personal 
              information. Our platform is SOC 2 certified and CCPA compliant.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">4. Data Retention</h2>
            <p className="text-muted-foreground mb-4">
              We retain compliance records for a minimum of 5 years as required by FinCEN regulations. 
              Other data is retained only as long as necessary to provide our services.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">5. Contact Us</h2>
            <p className="text-muted-foreground mb-4">
              For privacy-related questions, please contact us at{" "}
              <a href="mailto:clear@fincenclear.com" className="text-primary hover:underline">
                clear@fincenclear.com
              </a>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
