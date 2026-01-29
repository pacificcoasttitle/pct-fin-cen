"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { PartyStatusBadge } from "./PartyStatusBadge"
import { PartyTypeBadge, PartyRoleBadge } from "./PartyTypeBadge"
import { PartyCompletionProgress } from "./PartyCompletionProgress"
import { Users, Landmark, FileText, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"

export interface PartySummaryData {
  id: string
  party_role: string
  entity_type: string
  display_name: string
  status: string
  completion_percentage?: number
  beneficial_owners_count?: number | null
  trustees_count?: number | null
  payment_sources_count?: number | null
  payment_sources_total?: number | null
  documents_count?: number
  has_validation_errors?: boolean
  validation_error_count?: number
  submitted_at?: string | null
}

interface PartySummaryCardProps {
  party: PartySummaryData
  className?: string
  compact?: boolean
  onClick?: () => void
}

export function PartySummaryCard({ 
  party, 
  className,
  compact = false,
  onClick
}: PartySummaryCardProps) {
  const isBuyer = party.party_role === "buyer" || party.party_role === "transferee"
  
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100)
  }

  if (compact) {
    return (
      <div 
        className={cn(
          "flex items-center justify-between p-3 bg-muted/50 rounded-lg border",
          onClick && "cursor-pointer hover:bg-muted transition-colors",
          className
        )}
        onClick={onClick}
      >
        <div className="flex items-center gap-2">
          <PartyTypeBadge type={party.entity_type} showIcon />
          <span className="font-medium text-sm truncate max-w-[150px]">
            {party.display_name}
          </span>
          <PartyRoleBadge role={party.party_role} />
        </div>
        <div className="flex items-center gap-3">
          {party.completion_percentage !== undefined && (
            <PartyCompletionProgress 
              percentage={party.completion_percentage}
              hasErrors={party.has_validation_errors}
              errorCount={party.validation_error_count}
              size="sm"
            />
          )}
          <PartyStatusBadge status={party.status} showIcon={false} />
        </div>
      </div>
    )
  }

  return (
    <Card 
      className={cn(
        onClick && "cursor-pointer hover:border-primary/50 transition-colors",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PartyTypeBadge type={party.entity_type} />
            <span className="font-medium">{party.display_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <PartyRoleBadge role={party.party_role} />
            <PartyStatusBadge status={party.status} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          {party.completion_percentage !== undefined && (
            <PartyCompletionProgress 
              percentage={party.completion_percentage}
              hasErrors={party.has_validation_errors}
              errorCount={party.validation_error_count}
            />
          )}
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {/* Beneficial Owners count - for entity buyers */}
            {party.beneficial_owners_count !== null && party.beneficial_owners_count !== undefined && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{party.beneficial_owners_count} BO{party.beneficial_owners_count !== 1 ? "s" : ""}</span>
              </div>
            )}
            
            {/* Trustees count - for trusts */}
            {party.trustees_count !== null && party.trustees_count !== undefined && (
              <div className="flex items-center gap-1">
                <Landmark className="h-3 w-3" />
                <span>{party.trustees_count} trustee{party.trustees_count !== 1 ? "s" : ""}</span>
              </div>
            )}
            
            {/* Payment sources - for buyers */}
            {isBuyer && party.payment_sources_count !== null && party.payment_sources_count !== undefined && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span>
                  {party.payment_sources_count} source{party.payment_sources_count !== 1 ? "s" : ""}
                  {party.payment_sources_total ? ` (${formatCurrency(party.payment_sources_total)})` : ""}
                </span>
              </div>
            )}
            
            {/* Documents */}
            {party.documents_count !== undefined && party.documents_count > 0 && (
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>{party.documents_count} doc{party.documents_count !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface PartyListProps {
  parties: PartySummaryData[]
  compact?: boolean
  className?: string
  onPartyClick?: (party: PartySummaryData) => void
}

export function PartyList({ 
  parties, 
  compact = false, 
  className,
  onPartyClick 
}: PartyListProps) {
  const buyers = parties.filter(p => p.party_role === "buyer" || p.party_role === "transferee")
  const sellers = parties.filter(p => p.party_role === "seller" || p.party_role === "transferor")

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        {parties.map(party => (
          <PartySummaryCard 
            key={party.id} 
            party={party} 
            compact 
            onClick={() => onPartyClick?.(party)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {buyers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Buyer{buyers.length > 1 ? "s" : ""} ({buyers.length})
          </h4>
          {buyers.map(party => (
            <PartySummaryCard 
              key={party.id} 
              party={party}
              onClick={() => onPartyClick?.(party)}
            />
          ))}
        </div>
      )}
      
      {sellers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Seller{sellers.length > 1 ? "s" : ""} ({sellers.length})
          </h4>
          {sellers.map(party => (
            <PartySummaryCard 
              key={party.id} 
              party={party}
              onClick={() => onPartyClick?.(party)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
