"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Clock, Play, CheckCircle2, XCircle, Loader2 } from "lucide-react"

export type RequestStatusType = "pending" | "assigned" | "in_progress" | "completed" | "cancelled"

const STATUS_STYLES: Record<RequestStatusType, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { 
    label: "Pending", 
    className: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Clock
  },
  assigned: { 
    label: "Assigned", 
    className: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Loader2
  },
  in_progress: { 
    label: "In Progress", 
    className: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Play
  },
  completed: { 
    label: "Completed", 
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2
  },
  cancelled: { 
    label: "Cancelled", 
    className: "bg-slate-100 text-slate-500 border-slate-200",
    icon: XCircle
  },
}

interface RequestStatusBadgeProps {
  status: RequestStatusType | string
  showIcon?: boolean
  className?: string
}

export function RequestStatusBadge({ status, showIcon = true, className }: RequestStatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(/ /g, "_") as RequestStatusType
  const style = STATUS_STYLES[normalizedStatus] || STATUS_STYLES.pending
  const Icon = style.icon
  
  return (
    <Badge 
      variant="secondary" 
      className={cn("border font-medium", style.className, className)}
    >
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {style.label}
    </Badge>
  )
}
