"use client";

import { Check, Circle, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  id: string;
  title: string;
  description: string;
  status: "complete" | "current" | "pending";
}

interface VerticalStepperProps {
  steps: Step[];
  currentStepIndex: number;
  onStepClick?: (index: number) => void;
  children: React.ReactNode;
}

export function VerticalStepper({ steps, currentStepIndex, onStepClick, children }: VerticalStepperProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      {/* Stepper Sidebar - Mobile: Horizontal, Desktop: Vertical */}
      <div className="lg:w-64 flex-shrink-0">
        {/* Mobile: Horizontal progress bar */}
        <div className="lg:hidden mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
            <span className="text-sm text-gray-500">
              {steps[currentStepIndex]?.title}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-teal-500 to-cyan-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
          {/* Mobile: Step dots */}
          <div className="flex items-center justify-center gap-2 mt-3">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => onStepClick && index <= currentStepIndex && onStepClick(index)}
                disabled={index > currentStepIndex}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                  step.status === "complete" && "bg-teal-500 text-white cursor-pointer",
                  step.status === "current" && "bg-teal-500 text-white ring-4 ring-teal-100",
                  step.status === "pending" && "bg-gray-200 text-gray-500 cursor-default"
                )}
              >
                {step.status === "complete" ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop: Vertical stepper */}
        <nav className="hidden lg:block sticky top-20">
          <ol className="space-y-1">
            {steps.map((step, index) => (
              <li key={step.id} className="relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div 
                    className={cn(
                      "absolute left-4 top-10 w-0.5 h-full -ml-px",
                      step.status === "complete" ? "bg-teal-500" : "bg-gray-200"
                    )}
                  />
                )}
                
                <button
                  onClick={() => onStepClick && index <= currentStepIndex && onStepClick(index)}
                  disabled={index > currentStepIndex}
                  className={cn(
                    "relative flex items-start gap-3 p-3 rounded-lg transition-colors w-full text-left",
                    step.status === "current" && "bg-teal-50 border border-teal-200",
                    step.status === "complete" && "opacity-75 hover:opacity-100 cursor-pointer",
                    step.status === "pending" && "cursor-default"
                  )}
                >
                  {/* Status icon */}
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                    step.status === "complete" && "bg-teal-500 text-white",
                    step.status === "current" && "bg-teal-500 text-white ring-4 ring-teal-100",
                    step.status === "pending" && "bg-gray-200 text-gray-500"
                  )}>
                    {step.status === "complete" ? (
                      <Check className="w-4 h-4" />
                    ) : step.status === "current" ? (
                      <CircleDot className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </div>
                  
                  {/* Step info */}
                  <div className="min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      step.status === "current" ? "text-teal-900" : "text-gray-700"
                    )}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Main content area */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
