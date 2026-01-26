"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { AlertTriangle, Minus } from "lucide-react"

export type PriorityType = "urgent" | "normal" | "low"

const PRIORITY_STYLES: Record<PriorityType, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  urgent: { 
    label: "Urgent", 
    className: "bg-red-100 text-red-700 border-red-200",
    icon: AlertTriangle
  },
  normal: { 
    label: "Normal", 
    className: "bg-slate-100 text-slate-600 border-slate-200",
    icon: Minus
  },
  low: { 
    label: "Low", 
    className: "bg-slate-50 text-slate-500 border-slate-200",
    icon: Minus
  },
}

interface PriorityBadgeProps {
  priority: PriorityType | string
  showIcon?: boolean
  className?: string
}

export function PriorityBadge({ priority, showIcon = false, className }: PriorityBadgeProps) {
  const normalizedPriority = priority.toLowerCase() as PriorityType
  const style = PRIORITY_STYLES[normalizedPriority] || PRIORITY_STYLES.normal
  const Icon = style.icon
  
  return (
    <Badge 
      variant="secondary" 
      className={cn("border font-medium", style.className, className)}
    >
      {showIcon && normalizedPriority === "urgent" && <Icon className="h-3 w-3 mr-1" />}
      {style.label}
    </Badge>
  )
}
