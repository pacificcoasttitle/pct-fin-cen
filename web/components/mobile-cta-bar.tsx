"use client";

import { Button } from "@/components/ui/button";

export function MobileCTABar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border p-4 lg:hidden z-50 shadow-lg">
      <Button className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold h-12 shadow-md shadow-teal-500/25" asChild>
        <a href="mailto:clear@fincenclear.com">Contact Us</a>
      </Button>
    </div>
  );
}
