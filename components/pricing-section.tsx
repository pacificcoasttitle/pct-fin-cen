"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export function PricingSection() {
  const plans = [
    {
      name: "Essentials",
      subtitle: "Self-Service",
      recommended: "Small agencies (1-10 reports/month)",
      price: "$79",
      priceUnit: "/report",
      altPrice: "or $149/month (includes 5 reports)",
      features: [
        "Full decision wizard",
        "All exemption analysis",
        "Data collection forms",
        "PDF generation for filing",
        "5-year record storage",
        "Email support",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Complete",
      subtitle: "Full Service",
      recommended: "Mid-size agencies (10-50 reports/month)",
      price: "$149",
      priceUnit: "/report",
      altPrice: "50-pack: $110/report",
      features: [
        "Everything in Essentials",
        "We contact parties for you",
        "Phone support for your clients",
        "Quality review before filing",
        "We file with FinCEN",
        "Filing guarantee (penalty protection)",
        "Clear-to-close notifications",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      subtitle: "Custom Solutions",
      recommended: "Large agencies, underwriters, networks",
      price: "Custom",
      priceUnit: "",
      altPrice: "Contact us for volume pricing",
      features: [
        "Everything in Complete",
        "White-label branding",
        "API integration",
        "Dedicated account manager",
        "Multi-office dashboard",
        "Volume discounts",
        "SLA guarantees",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground">
            Choose the plan that fits your volume. No hidden fees.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-card rounded-2xl border-2 p-6 lg:p-8 transition-all duration-300 hover:shadow-xl ${
                plan.popular
                  ? "border-teal-500 shadow-lg scale-[1.02] lg:scale-105"
                  : "border-border hover:border-primary/30"
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-500 text-white font-semibold px-4 py-1 hover:bg-teal-500">
                  Most Popular
                </Badge>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
              </div>

              {/* Recommended For */}
              <p className="text-sm text-muted-foreground text-center mb-6 pb-6 border-b border-border">
                Recommended for: <span className="text-foreground font-medium">{plan.recommended}</span>
              </p>

              {/* Price */}
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl lg:text-5xl font-bold text-foreground">{plan.price}</span>
                  {plan.priceUnit && (
                    <span className="text-lg text-muted-foreground">{plan.priceUnit}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">{plan.altPrice}</p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                className={`w-full ${
                  plan.popular
                    ? "bg-teal-500 hover:bg-teal-600 text-white font-semibold"
                    : plan.name === "Enterprise"
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                    : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                }`}
                size="lg"
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        {/* Footer Notes */}
        <div className="text-center mt-10 space-y-3">
          <p className="text-sm text-muted-foreground">
            All plans include: <span className="text-foreground">SOC 2 security</span> •{" "}
            <span className="text-foreground">5-year storage</span> •{" "}
            <span className="text-foreground">Unlimited users</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Complex transactions? Additional entities +$25, Additional beneficial owners +$10
          </p>
        </div>
      </div>
    </section>
  );
}
