"use client"

import { Badge } from "@/components/ui/badge"
import { User, Building2, Landmark, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface PartyTypeBadgeProps {
  type: string
  className?: string
  showIcon?: boolean
}

const typeConfig: Record<string, { 
  label: string
  icon: typeof User
  color: string 
}> = {
  individual: { 
    label: "Individual", 
    icon: User,
    color: "bg-purple-50 text-purple-700 border-purple-200"
  },
  entity: { 
    label: "Entity", 
    icon: Building2,
    color: "bg-blue-50 text-blue-700 border-blue-200"
  },
  llc: { 
    label: "LLC", 
    icon: Building2,
    color: "bg-blue-50 text-blue-700 border-blue-200"
  },
  llc_single: { 
    label: "LLC", 
    icon: Building2,
    color: "bg-blue-50 text-blue-700 border-blue-200"
  },
  llc_multi: { 
    label: "LLC", 
    icon: Building2,
    color: "bg-blue-50 text-blue-700 border-blue-200"
  },
  corporation: { 
    label: "Corporation", 
    icon: Building2,
    color: "bg-indigo-50 text-indigo-700 border-indigo-200"
  },
  corporation_c: { 
    label: "C-Corp", 
    icon: Building2,
    color: "bg-indigo-50 text-indigo-700 border-indigo-200"
  },
  corporation_s: { 
    label: "S-Corp", 
    icon: Building2,
    color: "bg-indigo-50 text-indigo-700 border-indigo-200"
  },
  partnership: { 
    label: "Partnership", 
    icon: Building2,
    color: "bg-cyan-50 text-cyan-700 border-cyan-200"
  },
  partnership_general: { 
    label: "Partnership", 
    icon: Building2,
    color: "bg-cyan-50 text-cyan-700 border-cyan-200"
  },
  partnership_lp: { 
    label: "LP", 
    icon: Building2,
    color: "bg-cyan-50 text-cyan-700 border-cyan-200"
  },
  partnership_llp: { 
    label: "LLP", 
    icon: Building2,
    color: "bg-cyan-50 text-cyan-700 border-cyan-200"
  },
  trust: { 
    label: "Trust", 
    icon: Landmark,
    color: "bg-amber-50 text-amber-700 border-amber-200"
  },
  revocable_living: { 
    label: "Revocable Trust", 
    icon: Landmark,
    color: "bg-amber-50 text-amber-700 border-amber-200"
  },
  irrevocable: { 
    label: "Irrevocable Trust", 
    icon: Landmark,
    color: "bg-amber-50 text-amber-700 border-amber-200"
  },
}

export function PartyTypeBadge({ 
  type, 
  className,
  showIcon = true 
}: PartyTypeBadgeProps) {
  const config = typeConfig[type] || { 
    label: type || "Unknown", 
    icon: HelpCircle,
    color: "bg-slate-50 text-slate-700 border-slate-200"
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

export function PartyRoleBadge({ 
  role,
  className 
}: { 
  role: string
  className?: string 
}) {
  const isbuyer = role === "buyer" || role === "transferee"
  
  return (
    <Badge 
      variant="outline"
      className={cn(
        "font-medium border",
        isbuyer 
          ? "bg-green-50 text-green-700 border-green-200"
          : "bg-orange-50 text-orange-700 border-orange-200",
        className
      )}
    >
      {isbuyer ? "Buyer" : "Seller"}
    </Badge>
  )
}
