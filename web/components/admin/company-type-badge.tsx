"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Building2, Shield } from "lucide-react"

export type CompanyType = "internal" | "client"

const COMPANY_TYPE_STYLES: Record<CompanyType, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  internal: { 
    label: "Internal", 
    className: "bg-purple-100 text-purple-700 border-purple-200",
    icon: Shield
  },
  client: { 
    label: "Client", 
    className: "bg-slate-100 text-slate-600 border-slate-200",
    icon: Building2
  },
}

interface CompanyTypeBadgeProps {
  type: CompanyType | string
  showIcon?: boolean
  className?: string
}

export function CompanyTypeBadge({ type, showIcon = false, className }: CompanyTypeBadgeProps) {
  const normalizedType = type.toLowerCase() as CompanyType
  const style = COMPANY_TYPE_STYLES[normalizedType] || COMPANY_TYPE_STYLES.client
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
