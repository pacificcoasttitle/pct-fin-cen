"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Check, Shield, Clock, FileCheck } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative pt-32 lg:pt-40 pb-16 lg:pb-24 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/30" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(30,58,95,0.05),transparent_50%)]" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="max-w-xl">
            <Badge 
              variant="outline" 
              className="mb-6 py-2 px-4 text-sm border-teal-500/30 bg-teal-500/10 text-teal-700 font-medium"
            >
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              New Regulation Effective March 1, 2026
            </Badge>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight text-balance">
              FinCEN Real Estate Reporting{" "}
              <span className="text-primary">Made Simple</span>
            </h1>
            
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              The most comprehensive compliance platform for title companies. 
              Determine reporting requirements in <strong className="text-foreground">2 minutes</strong>. 
              File in <strong className="text-foreground">10 minutes</strong>. 
              Store records for <strong className="text-foreground">5 years</strong>.
            </p>
            
            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold px-8 h-12 shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 transition-all duration-300"
                asChild
              >
                <a href="mailto:clear@fincenclear.com">Get Started</a>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="h-12 px-8 border-teal-500/50 text-teal-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-500 bg-transparent transition-all duration-300"
              >
                <Play className="w-4 h-4 mr-2" />
                Watch Demo
              </Button>
            </div>
            
            {/* Trust Indicators */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 sm:gap-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-[#10B981]" />
                <span>Trusted by title companies across California</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-[#10B981]" />
                <span>SOC 2 Certified</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-[#10B981]" />
                <span>5-Year Storage Included</span>
              </div>
            </div>
          </div>
          
          {/* Right Visual */}
          <div className="relative lg:pl-8">
            <div className="relative">
              {/* Main Card */}
              <div className="bg-card rounded-2xl shadow-2xl border border-border p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                
                {/* Wizard Steps */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-[#10B981]/10 rounded-xl border border-[#10B981]/20">
                    <div className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Transaction Details</p>
                      <p className="text-sm text-muted-foreground">Property type, financing verified</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-[#10B981]/10 rounded-xl border border-[#10B981]/20">
                    <div className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Exemption Analysis</p>
                      <p className="text-sm text-muted-foreground">All 35 exemptions checked</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white text-sm font-bold">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Party Information</p>
                      <p className="text-sm text-muted-foreground">Collecting buyer details...</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-secondary rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                      <span className="text-muted-foreground text-sm font-bold">4</span>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">File & Store</p>
                      <p className="text-sm text-muted-foreground">Generate report</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-card rounded-xl shadow-lg border border-border p-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-500" />
                <span className="text-sm font-semibold text-foreground">10 min</span>
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-card rounded-xl shadow-lg border border-border p-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#10B981]" />
                <span className="text-sm font-semibold text-foreground">SOC 2</span>
              </div>
              
              <div className="absolute top-1/2 -right-8 bg-[#10B981] rounded-full shadow-lg p-3 hidden lg:flex">
                <FileCheck className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
