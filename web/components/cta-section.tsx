"use client";

import { InquiryForm } from "@/components/inquiry-form";

export function CTASection() {
  return (
    <section
      id="get-started"
      className="py-16 lg:py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 relative overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-500/20 via-transparent to-transparent" />

      {/* Floating orbs for depth */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-slate-500/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 text-balance">
            Ready to Simplify Your FinCEN Compliance?
          </h2>
          <p className="text-lg text-slate-300">
            Get started with FinClear
          </p>
        </div>

        {/* Inquiry Form */}
        <div className="max-w-lg mx-auto">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl shadow-black/20 border border-white/10">
            <InquiryForm variant="embedded" />
          </div>
        </div>
      </div>
    </section>
  );
}
