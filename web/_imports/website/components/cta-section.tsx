"use client";

import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-16 lg:py-24 bg-gradient-to-br from-[#1E3A5F] to-[#152A45] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(201,162,39,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(59,130,246,0.1),transparent_50%)]" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 text-balance">
            Ready to Simplify Your FinCEN Compliance?
          </h2>
          <p className="text-lg text-white/80 mb-10">
            Join hundreds of title companies who trust PCT FinCEN Solutions
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-teal-500 hover:bg-teal-600 text-white font-semibold px-8 h-12"
            >
              Start Your Free Trial
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent h-12 px-8"
            >
              Schedule a Demo
            </Button>
          </div>

          {/* Trust Text */}
          <p className="mt-8 text-sm text-white/60">
            No credit card required • Setup in 5 minutes • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}
