"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { FileText, Send, CheckCircle2, AlertTriangle, XCircle } from "lucide-react"

export type InvoiceStatusType = "draft" | "sent" | "paid" | "overdue" | "void"

const STATUS_STYLES: Record<InvoiceStatusType, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { 
    label: "Draft", 
    className: "bg-slate-100 text-slate-600 border-slate-200",
    icon: FileText
  },
  sent: { 
    label: "Sent", 
    className: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Send
  },
  paid: { 
    label: "Paid", 
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2
  },
  overdue: { 
    label: "Overdue", 
    className: "bg-red-100 text-red-700 border-red-200",
    icon: AlertTriangle
  },
  void: { 
    label: "Void", 
    className: "bg-slate-100 text-slate-400 border-slate-200",
    icon: XCircle
  },
}

interface InvoiceStatusBadgeProps {
  status: InvoiceStatusType | string
  showIcon?: boolean
  className?: string
}

export function InvoiceStatusBadge({ status, showIcon = true, className }: InvoiceStatusBadgeProps) {
  const normalizedStatus = status.toLowerCase() as InvoiceStatusType
  const style = STATUS_STYLES[normalizedStatus] || STATUS_STYLES.draft
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
