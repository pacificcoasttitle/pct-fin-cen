"use client";

import { StepId } from "./types";
import { DETERMINATION_STEPS, COLLECTION_STEPS } from "./constants";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";

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

  // Get visible steps for current phase only
  const determinationVisible = DETERMINATION_STEPS.filter(s => visibleSteps.includes(s.id));
  const collectionVisible = COLLECTION_STEPS.filter(s => visibleSteps.includes(s.id));

  // Determine phase completion
  const determinationComplete = phase === "collection";
  const collectionStarted = phase === "collection";

  // Progress within current phase
  const currentPhaseSteps = phase === "determination" ? determinationVisible : collectionVisible;
  const currentPhaseIndex = currentPhaseSteps.findIndex(s => s.id === currentStep);
  const phaseProgress = currentPhaseSteps.length > 1
    ? ((currentPhaseIndex) / (currentPhaseSteps.length - 1)) * 100
    : currentPhaseIndex === 0 ? 0 : 100;

  return (
    <div className="space-y-3">
      {/* ===== Phase Header — Always shows both phases ===== */}
      <div className="flex items-center gap-2">
        {/* Determination Phase Pill */}
        <button
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            phase === "determination"
              ? "bg-blue-100 text-blue-700"
              : determinationComplete
                ? "bg-blue-50 text-blue-400"
                : "bg-muted text-muted-foreground"
          )}
          onClick={() => {
            if (determinationComplete && determinationVisible.length > 0) {
              onStepClick?.(determinationVisible[0].id);
            }
          }}
          disabled={!determinationComplete}
        >
          {determinationComplete && <CheckCircle2 className="h-3 w-3" />}
          Determination
        </button>

        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />

        {/* Collection Phase Pill */}
        <div
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            phase === "collection"
              ? "bg-green-100 text-green-700"
              : "bg-muted text-muted-foreground/50"
          )}
        >
          {!collectionStarted && <Circle className="h-3 w-3" />}
          Collection & Filing
        </div>

        {/* Step Counter — right aligned */}
        <div className="ml-auto text-xs text-muted-foreground">
          Step {currentIndex + 1} of {visibleSteps.length}
        </div>
      </div>

      {/* ===== Progress Bar ===== */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            phase === "determination" ? "bg-blue-500" : "bg-green-500"
          )}
          style={{ width: `${phaseProgress}%` }}
        />
      </div>

      {/* ===== Step Dots — Desktop Only ===== */}
      <div className="hidden md:flex items-center justify-between">
        {currentPhaseSteps.map((step, idx) => {
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
                "flex flex-col items-center gap-1.5 text-xs transition-all group",
                isClickable ? "cursor-pointer" : "cursor-default",
                isCurrent
                  ? "text-foreground font-medium"
                  : isComplete
                    ? "text-muted-foreground"
                    : "text-muted-foreground/40"
              )}
            >
              <div
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-medium transition-all",
                  isCurrent
                    ? phase === "determination"
                      ? "bg-blue-500 text-white shadow-sm shadow-blue-200"
                      : "bg-green-500 text-white shadow-sm shadow-green-200"
                    : isComplete
                      ? "bg-muted text-muted-foreground"
                      : "bg-muted/50 text-muted-foreground/40"
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span className="max-w-[90px] text-center leading-tight">
                {step.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* ===== Mobile: Current Step Title ===== */}
      <div className="md:hidden text-center">
        <p className="text-sm font-medium">
          {currentPhaseSteps.find(s => s.id === currentStep)?.title}
        </p>
      </div>
    </div>
  );
}
