"use client";

import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

export function ComparisonSection() {
  const features = [
    {
      name: "Time per report",
      manual: "2-6.5 hours",
      other: "30-60 min",
      pct: "10 minutes",
      pctCheck: true,
    },
    {
      name: "All exemptions covered",
      manual: "Depends on knowledge",
      other: "Partial",
      pct: "Complete (35 types)",
      pctCheck: true,
    },
    {
      name: "Multi-entity transactions",
      manual: "Very complex",
      other: "Limited",
      pct: "Full support",
      pctCheck: true,
    },
    {
      name: "Party data collection",
      manual: "Manual calls/emails",
      other: "Basic forms",
      pct: "Automated + Support",
      pctCheck: true,
    },
    {
      name: "Deadline tracking",
      manual: "Spreadsheets",
      other: "Basic",
      pct: "Intelligent alerts",
      pctCheck: true,
    },
    {
      name: "Filing service option",
      manual: "N/A",
      other: "Some",
      pct: "Full service available",
      pctCheck: true,
    },
    {
      name: "Title industry expertise",
      manual: "Varies",
      other: "Generic",
      pct: "Built by title pros",
      pctCheck: true,
    },
    {
      name: "Cost per transaction",
      manual: "$100-$325 (labor)",
      other: "$120-$189",
      pct: "Starting at $59",
      pctCheck: true,
    },
  ];

  return (
    <section className="py-16 lg:py-24 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance">
            Why Title Companies Choose PCT FinCEN Solutions
          </h2>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-lg">
              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="px-4 py-5 text-left text-sm font-semibold text-foreground sm:px-6">
                      Feature
                    </th>
                    <th className="px-4 py-5 text-center text-sm font-semibold text-muted-foreground sm:px-6">
                      Manual/DIY
                    </th>
                    <th className="px-4 py-5 text-center text-sm font-semibold text-muted-foreground sm:px-6">
                      Other Software
                    </th>
                    <th className="px-4 py-5 text-center text-sm font-semibold text-primary sm:px-6 bg-primary/5">
                      PCT FinCEN Solutions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {features.map((feature, index) => (
                    <tr key={index} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-4 text-sm font-medium text-foreground sm:px-6">
                        {feature.name}
                      </td>
                      <td className="px-4 py-4 text-center sm:px-6">
                        <div className="flex items-center justify-center gap-2">
                          <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{feature.manual}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center sm:px-6">
                        <div className="flex items-center justify-center gap-2">
                          <X className="w-4 h-4 text-orange-400 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{feature.other}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center bg-primary/5 sm:px-6">
                        <div className="flex items-center justify-center gap-2">
                          <Check className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                          <span className="text-sm font-medium text-foreground">{feature.pct}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <Button size="lg" className="bg-teal-500 hover:bg-teal-600 text-white font-semibold px-8">
            Start Your Free Trial
          </Button>
        </div>
      </div>
    </section>
  );
}
