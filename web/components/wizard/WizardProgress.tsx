"use client";

import { StepId } from "./types";
import { DETERMINATION_STEPS, COLLECTION_STEPS } from "./constants";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

interface WizardProgressProps {
  phase: "determination" | "collection";
  currentStep: StepId;
  visibleSteps: StepId[];
  onStepClick?: (step: StepId) => void;
}

export function WizardProgress({
  phase,
  currentStep,
  visibleSteps,
  onStepClick,
}: WizardProgressProps) {
  const currentIndex = visibleSteps.indexOf(currentStep);
  
  // Calculate progress percentage
  const progress = visibleSteps.length > 1 
    ? (currentIndex / (visibleSteps.length - 1)) * 100 
    : 100;
  
  // Get phase-specific steps
  const phaseSteps = phase === "determination" 
    ? DETERMINATION_STEPS 
    : COLLECTION_STEPS;
  
  // Filter to only visible steps in current phase
  const displaySteps = phaseSteps.filter(s => visibleSteps.includes(s.id));
  
  return (
    <div className="space-y-4">
      {/* Phase Indicator */}
      <div className="flex items-center gap-2">
        <div className={cn(
          "px-3 py-1 rounded-full text-xs font-medium",
          phase === "determination" 
            ? "bg-blue-100 text-blue-700" 
            : "bg-green-100 text-green-700"
        )}>
          {phase === "determination" ? "Step 1: Determination" : "Step 2: Data Collection"}
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="relative">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      {/* Step Indicators (horizontal on large screens) */}
      <div className="hidden md:flex items-center justify-between">
        {displaySteps.map((step, idx) => {
          const stepIndex = visibleSteps.indexOf(step.id);
          const isComplete = stepIndex < currentIndex;
          const isCurrent = step.id === currentStep;
          const isClickable = stepIndex <= currentIndex && onStepClick;
          
          return (
            <button
              key={step.id}
              onClick={() => isClickable && onStepClick?.(step.id)}
              disabled={!isClickable}
              className={cn(
                "flex flex-col items-center gap-1 text-xs transition-colors",
                isClickable ? "cursor-pointer" : "cursor-default",
                isCurrent ? "text-primary font-medium" : 
                isComplete ? "text-primary/70" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors",
                isCurrent ? "border-primary bg-primary text-primary-foreground" :
                isComplete ? "border-primary bg-primary/10" : "border-muted"
              )}>
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span className="max-w-[80px] text-center truncate">
                {step.title}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Current Step Title (mobile) */}
      <div className="md:hidden text-center">
        <p className="text-sm font-medium">
          {displaySteps.find(s => s.id === currentStep)?.title}
        </p>
        <p className="text-xs text-muted-foreground">
          Step {currentIndex + 1} of {visibleSteps.length}
        </p>
      </div>
    </div>
  );
}
