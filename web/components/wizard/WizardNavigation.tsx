"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WizardNavigationProps {
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  backLabel?: string;
  showNext?: boolean;
}

export function WizardNavigation({
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  nextLabel = "Continue",
  backLabel = "Back",
  showNext = true,
}: WizardNavigationProps) {
  return (
    <div className="flex items-center justify-between">
      <Button
        variant="ghost"
        onClick={onBack}
        disabled={!canGoBack}
        className={!canGoBack ? "invisible" : ""}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        {backLabel}
      </Button>
      
      {showNext && (
        <Button
          onClick={onNext}
          disabled={!canGoNext}
        >
          {nextLabel}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )}
    </div>
  );
}
