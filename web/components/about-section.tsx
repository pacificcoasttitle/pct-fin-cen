"use client";

import { Building2, FileCheck, Check, BarChart3 } from "lucide-react";

export function AboutSection() {
  const stats = [
    { value: "6", label: "Office Locations", icon: Building2 },
    { value: "1000s", label: "Transactions Processed", icon: FileCheck },
    { value: "100%", label: "FNF Flowchart Coverage", icon: Check },
    { value: "35", label: "Exemption Types Covered", icon: BarChart3 },
  ];

  const expertise = [
    "How title workflows actually work",
    "The pressure of closing deadlines",
    "The complexity of multi-party transactions",
    "California and national title industry practices",
  ];

  return (
    <section id="about" className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 text-balance">
              Built by Title Professionals,{" "}
              <span className="text-primary">for Title Professionals</span>
            </h2>

            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                {`FinClear was built by title industry professionals who understood the complexity of the new FinCEN reporting requirements. We built the solution we wished existed - simple, comprehensive, and reliable.`}
              </p>
              <p>Unlike generic compliance software companies, we understand:</p>
            </div>

            <ul className="mt-6 space-y-3">
              {expertise.map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#10B981]/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-[#10B981]" />
                  </div>
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-muted-foreground leading-relaxed">
              {`Our platform is built on the FNF compliance flowchart—the industry standard—ensuring 
              you're aligned with how the largest title underwriter interprets the regulation.`}
            </p>
          </div>

          {/* Right - Stats Grid */}
          <div className="grid grid-cols-2 gap-4 lg:gap-6">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-card rounded-2xl border border-border p-6 lg:p-8 text-center hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
