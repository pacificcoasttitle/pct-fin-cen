"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQSection() {
  const faqs = [
    {
      question: "What transactions require FinCEN reporting?",
      answer:
        "Non-financed (cash) transfers of residential real estate (1-4 family, condos, townhomes, co-ops) to legal entities or trusts. Individual buyers are not reportable. Many exemptions exist for regulated entities, certain trusts, and specific transaction types.",
    },
    {
      question: "When does the FinCEN reporting requirement take effect?",
      answer:
        "March 1, 2026. Reports must be filed within 30 days of closing or by the last day of the month following closing, whichever is later.",
    },
    {
      question: "What if my transaction involves multiple LLCs or complex ownership?",
      answer:
        "Our platform is specifically designed to handle complex transactions including multiple buyer entities, nested LLC structures (LLC owned by LLC), trusts with multiple trustees and beneficiaries, and mixed entity/trust co-ownership.",
    },
    {
      question: "Can I pass the compliance cost to the closing?",
      answer:
        "In most states, yes. Our platform can generate documentation for including compliance fees on settlement statements. Check your state's specific regulations.",
    },
    {
      question: "What happens if I file incorrectly?",
      answer:
        "Our Complete and Enterprise plans include a filing guarantee with penalty protection. We review all filings for accuracy before submission and stand behind our work.",
    },
    {
      question: "How long do I need to keep records?",
      answer:
        "FinCEN requires 5-year record retention. All plans include compliant storage for the full retention period at no additional cost.",
    },
  ];

  return (
    <section className="py-16 lg:py-24 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about FinCEN compliance
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card rounded-xl border border-border px-6 data-[state=open]:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left text-base font-semibold text-foreground py-5 hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
