import { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Terms of Service | FinClear",
  description: "Terms of Service for FinClear - FinCEN Compliance Made Simple",
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="pt-32 lg:pt-40">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: February 2026</p>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p className="text-muted-foreground">
              Terms of Service content is being finalized. Please contact{" "}
              <a href="mailto:clear@fincenclear.com" className="text-primary hover:underline">
                clear@fincenclear.com
              </a>{" "}
              with any questions.
            </p>
            
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground mb-4">
              By accessing and using FinClear&apos;s services, you agree to be bound by these Terms of Service 
              and all applicable laws and regulations.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. Service Description</h2>
            <p className="text-muted-foreground mb-4">
              FinClear provides FinCEN compliance software and services for title companies and real estate 
              professionals. Our platform assists with regulatory reporting requirements under federal law.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">3. User Responsibilities</h2>
            <p className="text-muted-foreground mb-4">
              Users are responsible for maintaining the confidentiality of their account credentials and for 
              all activities that occur under their account.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">4. Contact</h2>
            <p className="text-muted-foreground mb-4">
              For questions about these terms, please contact us at{" "}
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
