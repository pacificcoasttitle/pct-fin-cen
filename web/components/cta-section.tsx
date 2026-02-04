"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-16 lg:py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-500/20 via-transparent to-transparent" />
      
      {/* Floating orbs for depth */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-slate-500/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 text-balance">
            Ready to Simplify Your FinCEN Compliance?
          </h2>
          <p className="text-lg text-slate-300 mb-10">
            Join hundreds of title companies who trust FinClear
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold px-10 h-12 shadow-lg shadow-teal-500/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
              asChild
            >
              <a href="mailto:clear@fincenclear.com">
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent h-12 px-10"
            >
              Schedule a Demo
            </Button>
          </div>

          {/* Contact Info */}
          <p className="mt-8 text-sm text-slate-400">
            Contact us at{" "}
            <a href="mailto:clear@fincenclear.com" className="text-teal-400 hover:text-teal-300 font-medium">
              clear@fincenclear.com
            </a>
            {" "}— our team will have you up and running in 24 hours
          </p>
        </div>
      </div>
    </section>
  );
}
