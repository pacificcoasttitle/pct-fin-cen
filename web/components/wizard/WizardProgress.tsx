"use client"

import { cn } from "@/lib/utils"
import { Check, FileSearch, ClipboardList, FileCheck } from "lucide-react"

interface WizardPhase {
  id: string
  title: string
  shortTitle: string
  icon: React.ComponentType<{ className?: string }>
  isComplete: boolean
  isActive: boolean
  isAccessible: boolean
}

interface WizardProgressProps {
  phases: WizardPhase[]
  onPhaseClick: (phaseId: string) => void
  className?: string
}

/**
 * Modern visual step progress indicator for the wizard
 * Matches the FinClear website theme (teal gradients, rounded corners, shadows)
 */
export function WizardProgress({ phases, onPhaseClick, className }: WizardProgressProps) {
  const currentIndex = phases.findIndex(p => p.isActive)
  
  return (
    <div className={cn("relative py-6", className)}>
      {/* Background progress track */}
      <div className="absolute top-1/2 left-8 right-8 h-1 bg-gray-200 rounded-full -translate-y-1/2" />
      
      {/* Active progress fill */}
      <div 
        className="absolute top-1/2 left-8 h-1 bg-gradient-to-r from-teal-500 to-teal-600 rounded-full -translate-y-1/2 transition-all duration-500 ease-out"
        style={{ 
          width: currentIndex >= 0 
            ? `calc(${(currentIndex / Math.max(phases.length - 1, 1)) * 100}% - 4rem + ${currentIndex === phases.length - 1 ? '4rem' : '0px'})` 
            : '0%' 
        }}
      />
      
      {/* Step indicators */}
      <div className="relative flex justify-between items-center">
        {phases.map((phase, index) => {
          const Icon = phase.icon
          const isComplete = phase.isComplete
          const isActive = phase.isActive
          const isAccessible = phase.isAccessible
          
          return (
            <button
              key={phase.id}
              onClick={() => isAccessible && onPhaseClick(phase.id)}
              disabled={!isAccessible}
              className={cn(
                "flex flex-col items-center gap-2 group transition-all duration-200",
                isAccessible ? "cursor-pointer" : "cursor-not-allowed"
              )}
            >
              {/* Circle indicator */}
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                isComplete && "bg-gradient-to-br from-teal-500 to-teal-600 border-teal-500 text-white shadow-lg shadow-teal-500/30",
                isActive && !isComplete && "bg-white border-teal-500 text-teal-600 ring-4 ring-teal-100 shadow-lg",
                !isComplete && !isActive && isAccessible && "bg-white border-gray-200 text-gray-400 group-hover:border-teal-300 group-hover:text-teal-500",
                !isComplete && !isActive && !isAccessible && "bg-gray-50 border-gray-200 text-gray-300"
              )}>
                {isComplete ? (
                  <Check className="w-5 h-5" strokeWidth={3} />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              
              {/* Label */}
              <div className="flex flex-col items-center">
                <span className={cn(
                  "text-xs font-semibold transition-colors",
                  isActive ? "text-teal-600" : isComplete ? "text-teal-600" : "text-gray-500"
                )}>
                  {phase.shortTitle}
                </span>
                {isActive && (
                  <span className="text-[10px] text-teal-500 font-medium mt-0.5">Current</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Pre-configured phases for the RRER wizard
export const WIZARD_PHASES = [
  {
    id: "determination",
    title: "Filing Determination",
    shortTitle: "Determination",
    icon: FileSearch,
  },
  {
    id: "collection",
    title: "Data Collection",
    shortTitle: "Collection",
    icon: ClipboardList,
  },
  {
    id: "summary",
    title: "Review & File",
    shortTitle: "Review",
    icon: FileCheck,
  },
] as const

export type WizardPhaseId = typeof WIZARD_PHASES[number]["id"]
