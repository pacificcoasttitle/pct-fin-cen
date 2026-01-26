"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type EventType = "filing_accepted" | "expedite_fee" | "manual_adjustment" | "monthly_minimum"

const EVENT_TYPE_STYLES: Record<EventType, { label: string; className: string }> = {
  filing_accepted: { 
    label: "Filing Accepted", 
    className: "bg-emerald-100 text-emerald-700 border-emerald-200"
  },
  expedite_fee: { 
    label: "Expedite Fee", 
    className: "bg-amber-100 text-amber-700 border-amber-200"
  },
  manual_adjustment: { 
    label: "Adjustment", 
    className: "bg-purple-100 text-purple-700 border-purple-200"
  },
  monthly_minimum: { 
    label: "Monthly Min", 
    className: "bg-slate-100 text-slate-600 border-slate-200"
  },
}

interface EventTypeBadgeProps {
  type: EventType | string
  className?: string
}

export function EventTypeBadge({ type, className }: EventTypeBadgeProps) {
  const normalizedType = type.toLowerCase() as EventType
  const style = EVENT_TYPE_STYLES[normalizedType] || { label: type, className: "bg-slate-100 text-slate-600" }
  
  return (
    <Badge 
      variant="secondary" 
      className={cn("border font-medium", style.className, className)}
    >
      {style.label}
    </Badge>
  )
}
