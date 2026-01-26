"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Users, Send, ArrowRight, Check } from "lucide-react";

export function SolutionSection() {
  const steps = [
    {
      icon: ClipboardCheck,
      number: 1,
      title: "Determine Requirements",
      description:
        "Answer a few questions about your transaction. Our smart wizard analyzes exemptions and tells you exactly what's needed.",
      badge: "2 Minutes",
      features: ["23 entity exemptions", "4 trust exemptions", "8 transaction exemptions"],
    },
    {
      icon: Users,
      number: 2,
      title: "Collect Information",
      description:
        "Send secure links to buyers and sellers. They complete their sections online with guided assistance. You track progress in real-time.",
      badge: "Automated Reminders",
      features: ["Secure party portals", "Real-time tracking", "Auto-reminders"],
    },
    {
      icon: Send,
      number: 3,
      title: "File & Store",
      description:
        "Generate filing-ready PDFs or let us file for you. Records stored securely for 5 years with full audit trail.",
      badge: "10 Minutes",
      features: ["PDF generation", "Direct FinCEN filing", "5-year storage"],
    },
  ];

  return (
    <section className="py-16 lg:py-24 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance">
            Compliance in Three Simple Steps
          </h2>
          <p className="text-lg text-muted-foreground">
            Our intelligent platform handles the complexity so you can focus on closings
          </p>
        </div>

        {/* Steps */}
        <div className="grid lg:grid-cols-3 gap-8 lg:gap-6 relative">
          {/* Connection Lines (Desktop) */}
          <div className="hidden lg:block absolute top-24 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="bg-card rounded-2xl border border-border p-6 lg:p-8 h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                {/* Step Number & Icon */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center relative">
                    <step.icon className="w-8 h-8 text-primary" />
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                      {step.number}
                    </div>
                  </div>
                  <Badge className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 hover:bg-[#10B981]/10">
                    {step.badge}
                  </Badge>
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">{step.description}</p>

                {/* Features */}
                <ul className="space-y-2">
                  {step.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent">
            See How It Works
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}
