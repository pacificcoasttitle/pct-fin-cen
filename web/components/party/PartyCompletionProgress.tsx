"use client"

import { Progress } from "@/components/ui/progress"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface PartyCompletionProgressProps {
  percentage: number
  hasErrors?: boolean
  errorCount?: number
  className?: string
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
}

export function PartyCompletionProgress({ 
  percentage, 
  hasErrors = false,
  errorCount = 0,
  className,
  showLabel = true,
  size = "md"
}: PartyCompletionProgressProps) {
  const sizeClasses = {
    sm: "w-12",
    md: "w-20",
    lg: "w-32"
  }
  
  const isComplete = percentage >= 100

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Progress 
        value={percentage} 
        className={cn(
          sizeClasses[size],
          hasErrors && "bg-red-100 [&>div]:bg-red-500",
          isComplete && !hasErrors && "bg-green-100 [&>div]:bg-green-500"
        )}
      />
      {showLabel && (
        <span className={cn(
          "text-xs",
          hasErrors ? "text-red-600" : isComplete ? "text-green-600" : "text-muted-foreground"
        )}>
          {percentage}%
        </span>
      )}
      {hasErrors && (
        <div className="flex items-center gap-1 text-red-500">
          <AlertCircle className="h-4 w-4" />
          {errorCount > 0 && <span className="text-xs">{errorCount}</span>}
        </div>
      )}
      {isComplete && !hasErrors && (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      )}
    </div>
  )
}
