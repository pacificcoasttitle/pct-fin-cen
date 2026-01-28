"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight } from "lucide-react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownSection() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const targetDate = new Date("2026-03-01T00:00:00").getTime();

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 sm:px-4 sm:py-3 min-w-[60px] sm:min-w-[80px]">
        <span className="text-2xl sm:text-4xl font-bold text-white tabular-nums">
          {value.toString().padStart(2, "0")}
        </span>
      </div>
      <span className="text-xs sm:text-sm text-white/70 mt-2 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );

  return (
    <section className="relative bg-gradient-to-r from-[#1E3A5F] to-[#2D4A6F] py-8 sm:py-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8">
          {/* Left - Warning */}
          <div className="flex items-center gap-3 text-white">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 animate-pulse" />
            <span className="text-sm sm:text-base font-medium">
              FinCEN Reporting Goes Live In:
            </span>
          </div>

          {/* Center - Countdown */}
          <div className="flex items-center gap-2 sm:gap-4">
            <TimeBlock value={timeLeft.days} label="Days" />
            <span className="text-2xl sm:text-3xl font-bold text-white/50">:</span>
            <TimeBlock value={timeLeft.hours} label="Hours" />
            <span className="text-2xl sm:text-3xl font-bold text-white/50">:</span>
            <TimeBlock value={timeLeft.minutes} label="Min" />
            <span className="text-2xl sm:text-3xl font-bold text-white/50">:</span>
            <TimeBlock value={timeLeft.seconds} label="Sec" />
          </div>

          {/* Right - CTA */}
          <div className="flex items-center gap-4">
            <span className="text-white/80 text-sm font-medium hidden sm:block">
              Are You Ready?
            </span>
            <Button 
              variant="outline" 
              className="border-white/30 text-white bg-transparent hover:bg-white/10 hover:text-white"
            >
              Check Your Readiness
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
