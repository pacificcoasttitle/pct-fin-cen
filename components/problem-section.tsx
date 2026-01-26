"use client";

import { Clock, Shuffle, ShieldX, ArrowRight } from "lucide-react";

export function ProblemSection() {
  const painPoints = [
    {
      icon: Clock,
      stat: "2-6.5 Hours",
      title: "Average time to manually complete each Real Estate Report according to FinCEN",
      subtext: "That's $100-$325 in labor costs per transaction",
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      icon: Shuffle,
      stat: "111 Fields",
      title: "Required data points across buyers, sellers, beneficial owners, and payment sources",
      subtext: "Miss one field and risk rejection or penalties",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      icon: ShieldX,
      stat: "$50,000+",
      title: "Potential civil penalties per violation under the Bank Secrecy Act",
      subtext: "Criminal penalties possible for willful violations",
      color: "text-red-600",
      bgColor: "bg-red-600/10",
    },
  ];

  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground text-balance">
            Manual FinCEN Compliance is a{" "}
            <span className="text-red-500">Nightmare</span>
          </h2>
        </div>

        {/* Pain Point Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {painPoints.map((point, index) => (
            <div
              key={index}
              className="bg-card rounded-2xl border border-border p-6 lg:p-8 hover:shadow-lg transition-shadow duration-300"
            >
              <div className={`w-14 h-14 rounded-xl ${point.bgColor} flex items-center justify-center mb-6`}>
                <point.icon className={`w-7 h-7 ${point.color}`} />
              </div>
              <div className={`text-4xl lg:text-5xl font-bold ${point.color} mb-4`}>
                {point.stat}
              </div>
              <p className="text-foreground font-medium mb-3 leading-relaxed">
                {point.title}
              </p>
              <p className="text-sm text-muted-foreground">
                {point.subtext}
              </p>
            </div>
          ))}
        </div>

        {/* Transition */}
        <div className="text-center mt-12">
          <p className="inline-flex items-center gap-2 text-lg font-medium text-[#10B981]">
            {"There's a better way"}
            <ArrowRight className="w-5 h-5" />
          </p>
        </div>
      </div>
    </section>
  );
}
