"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type RoleType = "pct_admin" | "pct_staff" | "client_admin" | "client_user"

const ROLE_STYLES: Record<RoleType, { label: string; className: string }> = {
  pct_admin: { label: "Admin", className: "bg-purple-100 text-purple-700 border-purple-200" },
  pct_staff: { label: "Staff", className: "bg-blue-100 text-blue-700 border-blue-200" },
  client_admin: { label: "Client Admin", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  client_user: { label: "Client User", className: "bg-slate-100 text-slate-600 border-slate-200" },
}

interface RoleBadgeProps {
  role: RoleType | string
  className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const normalizedRole = role.toLowerCase() as RoleType
  const style = ROLE_STYLES[normalizedRole] || { label: role, className: "bg-slate-100 text-slate-600" }
  
  return (
    <Badge 
      variant="secondary" 
      className={cn("border font-medium", style.className, className)}
    >
      {style.label}
    </Badge>
  )
}
