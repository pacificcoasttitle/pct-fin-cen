"use client"

import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ValidationMessagesProps {
  errors: string[]
  warnings: string[]
  className?: string
}

export function ValidationMessages({
  errors,
  warnings,
  className,
}: ValidationMessagesProps) {
  if (errors.length === 0 && warnings.length === 0) return null

  return (
    <div className={cn("space-y-3", className)}>
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>Please fix the following errors:</span>
          </div>
          <ul className="list-disc list-inside text-red-700 text-sm space-y-1 ml-7">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-800 font-medium mb-2">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span>Please review:</span>
          </div>
          <ul className="list-disc list-inside text-amber-700 text-sm space-y-1 ml-7">
            {warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

interface ValidationSuccessProps {
  message?: string
  className?: string
}

export function ValidationSuccess({
  message = "All required information has been provided",
  className,
}: ValidationSuccessProps) {
  return (
    <div
      className={cn(
        "bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3",
        className
      )}
    >
      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
      <span className="text-green-800 font-medium">{message}</span>
    </div>
  )
}

interface FieldErrorProps {
  error?: string
  className?: string
}

export function FieldError({ error, className }: FieldErrorProps) {
  if (!error) return null

  return (
    <p className={cn("text-sm text-red-600 mt-1 flex items-center gap-1", className)}>
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      {error}
    </p>
  )
}
