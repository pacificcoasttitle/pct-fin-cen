"use client"

import { Badge } from "@/components/ui/badge"
import { Clock, Mail, Eye, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface PartyStatusBadgeProps {
  status: string
  className?: string
  showIcon?: boolean
}

const statusConfig: Record<string, { 
  label: string
  variant: "default" | "secondary" | "destructive" | "outline"
  icon: typeof Clock
  color: string 
}> = {
  pending: { 
    label: "Pending", 
    variant: "secondary",
    icon: Clock,
    color: "bg-slate-100 text-slate-700 border-slate-200"
  },
  link_sent: { 
    label: "Link Sent", 
    variant: "outline",
    icon: Mail,
    color: "bg-blue-50 text-blue-700 border-blue-200"
  },
  in_progress: { 
    label: "In Progress", 
    variant: "outline",
    icon: Eye,
    color: "bg-amber-50 text-amber-700 border-amber-200"
  },
  opened: { 
    label: "In Progress", 
    variant: "outline",
    icon: Eye,
    color: "bg-amber-50 text-amber-700 border-amber-200"
  },
  submitted: { 
    label: "Submitted", 
    variant: "default",
    icon: CheckCircle2,
    color: "bg-green-50 text-green-700 border-green-200"
  },
  verified: { 
    label: "Verified", 
    variant: "default",
    icon: CheckCircle2,
    color: "bg-green-100 text-green-800 border-green-300"
  },
}

export function PartyStatusBadge({ 
  status, 
  className,
  showIcon = true 
}: PartyStatusBadgeProps) {
  const config = statusConfig[status] || { 
    label: status, 
    variant: "secondary" as const,
    icon: Clock,
    color: "bg-slate-100 text-slate-700"
  }
  
  const Icon = config.icon
  
  return (
    <Badge 
      variant="outline"
      className={cn(
        "gap-1 font-medium border",
        config.color,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  )
}
