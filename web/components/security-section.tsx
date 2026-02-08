"use client";

import { Shield, Lock, FileText, KeyRound, HardDrive, Server } from "lucide-react";

export function SecuritySection() {
  const trustBadges = [
    { label: "SOC 2 Type II", sublabel: "Certified" },
    { label: "256-bit", sublabel: "Encryption" },
    { label: "CCPA", sublabel: "Compliant" },
    { label: "99.9%", sublabel: "Uptime SLA" },
  ];

  const securityFeatures = [
    { icon: Lock, text: "Bank-level encryption at rest and in transit" },
    { icon: Shield, text: "Role-based access controls" },
    { icon: FileText, text: "Complete audit logging" },
    { icon: KeyRound, text: "Multi-factor authentication" },
    { icon: HardDrive, text: "Daily encrypted backups" },
    { icon: Server, text: "US-based data centers" },
  ];

  return (
    <section id="security" className="py-16 lg:py-24 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance">
            Enterprise-Grade Security You Can Trust
          </h2>
          <p className="text-lg text-muted-foreground">
            Your compliance data is protected by industry-leading security measures
          </p>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6 max-w-4xl mx-auto mb-12">
          {trustBadges.map((badge, index) => (
            <div
              key={index}
              className="bg-card rounded-xl border border-border p-6 text-center hover:shadow-md transition-shadow"
            >
              <div className="text-2xl lg:text-3xl font-bold text-primary">{badge.label}</div>
              <div className="text-sm text-muted-foreground mt-1">{badge.sublabel}</div>
            </div>
          ))}
        </div>

        {/* Security Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 max-w-5xl mx-auto mb-12">
          {securityFeatures.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-4 bg-card rounded-xl border border-border p-4"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{feature.text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-lg text-muted-foreground mb-4">
            Ready to see how it works?
          </p>
          <a
            href="#get-started"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Schedule a Demo
          </a>
        </div>
      </div>
    </section>
  );
}
