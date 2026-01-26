"use client";

import { Brain, Building2, UserCheck, CalendarClock, FileSignature, Database } from "lucide-react";

export function FeaturesSection() {
  const features = [
    {
      icon: Brain,
      title: "Intelligent Exemption Analysis",
      description:
        "Our wizard covers ALL 23 entity exemptions, 4 trust exemptions, and 8 transaction exemptions. No more guessing.",
    },
    {
      icon: Building2,
      title: "Complex Transaction Ready",
      description:
        "Multiple buyers? Nested LLCs? Trusts with multiple beneficiaries? We handle it all seamlessly.",
    },
    {
      icon: UserCheck,
      title: "Automated Outreach",
      description:
        "Secure links sent to all parties. Built-in support helps them complete forms correctly the first time.",
    },
    {
      icon: CalendarClock,
      title: "Never Miss a Deadline",
      description:
        "Automatic reminders for closing dates and filing deadlines. Dashboard shows status at a glance.",
    },
    {
      icon: FileSignature,
      title: "Liability Protection",
      description:
        "Generate certification forms that establish reasonable reliance and document party attestations.",
    },
    {
      icon: Database,
      title: "Compliant Record Keeping",
      description:
        "All documents, certifications, and audit trails stored securely for the required 5-year retention period.",
    },
  ];

  return (
    <section id="features" className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance">
            Everything You Need for FinCEN Compliance
          </h2>
          <p className="text-lg text-muted-foreground">
            Comprehensive tools designed specifically for title professionals
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-card rounded-2xl border border-border p-6 lg:p-8 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
