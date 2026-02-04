import { Metadata } from "next"
import { InquiryForm } from "@/components/inquiry-form"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Contact Us | FinClear",
  description:
    "Get in touch with the FinClear team for FinCEN compliance solutions",
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-32 pb-16">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-foreground mb-3">
              Talk to Our Team
            </h1>
            <p className="text-lg text-muted-foreground">
              Whether you&apos;re evaluating compliance solutions or ready to get
              started, we&apos;re here to help.
            </p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
            <InquiryForm variant="standalone" />
          </div>

          <div className="mt-12 text-center text-sm text-muted-foreground">
            <p>
              Prefer email? Reach us at{" "}
              <a
                href="mailto:clear@fincenclear.com"
                className="text-teal-600 hover:text-teal-700 font-medium"
              >
                clear@fincenclear.com
              </a>
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
