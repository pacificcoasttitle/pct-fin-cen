"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type StatusType = "active" | "pending" | "suspended" | "disabled" | "invited" | "inactive"

const STATUS_STYLES: Record<StatusType, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700 border-amber-200" },
  suspended: { label: "Suspended", className: "bg-red-100 text-red-700 border-red-200" },
  disabled: { label: "Disabled", className: "bg-slate-100 text-slate-500 border-slate-200" },
  invited: { label: "Invited", className: "bg-blue-100 text-blue-700 border-blue-200" },
  inactive: { label: "Inactive", className: "bg-slate-100 text-slate-500 border-slate-200" },
}

interface StatusBadgeProps {
  status: StatusType | string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase() as StatusType
  const style = STATUS_STYLES[normalizedStatus] || STATUS_STYLES.inactive
  
  return (
    <Badge 
      variant="secondary" 
      className={cn("border font-medium", style.className, className)}
    >
      {style.label}
    </Badge>
  )
}
