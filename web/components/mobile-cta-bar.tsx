"use client";

import { Button } from "@/components/ui/button";

export function MobileCTABar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border p-4 lg:hidden z-50 shadow-lg">
      <Button className="w-full bg-[#C9A227] hover:bg-[#B8911F] text-[#1E293B] font-semibold h-12">
        Start Free Trial
      </Button>
    </div>
  );
}
