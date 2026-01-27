"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, CheckCircle2 } from "lucide-react"

interface CertificationSectionProps {
  certified: boolean
  signature: string
  date: string
  certificationText: string
  onCertifiedChange: (checked: boolean) => void
  onSignatureChange: (value: string) => void
  disabled?: boolean
  entityName?: string
}

export function CertificationSection({
  certified,
  signature,
  date,
  certificationText,
  onCertifiedChange,
  onSignatureChange,
  disabled = false,
  entityName,
}: CertificationSectionProps) {
  // Replace [Entity Name] or [Trust Name] with actual name if provided
  const displayText = entityName 
    ? certificationText.replace(/\[Entity Name\]|\[Trust Name\]/g, entityName)
    : certificationText

  return (
    <Card className={certified ? "border-green-200 bg-green-50/50" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-5 w-5" />
          Certification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="certification"
            checked={certified}
            onCheckedChange={(checked) => onCertifiedChange(checked as boolean)}
            disabled={disabled}
            className="mt-1"
          />
          <label
            htmlFor="certification"
            className="text-sm leading-relaxed cursor-pointer"
          >
            {displayText}
          </label>
        </div>

        {certified && (
          <div className="pt-4 border-t space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="signature">Signature (Type Full Legal Name) *</Label>
                <Input
                  id="signature"
                  value={signature}
                  onChange={(e) => onSignatureChange(e.target.value)}
                  placeholder="John A. Smith"
                  disabled={disabled}
                  className="font-medium"
                />
              </div>
              <div>
                <Label htmlFor="cert-date">Date</Label>
                <Input
                  id="cert-date"
                  value={date}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            {signature && (
              <div className="flex items-center gap-2 text-green-700 bg-green-100 rounded-lg p-3">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Electronically signed by {signature}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Pre-built certification texts for different party types
export const CERTIFICATION_TEXTS = {
  seller_individual: `I certify that the information provided above is true, complete, and accurate to the best of my knowledge.`,
  
  seller_entity: `I certify that I am authorized to provide this information on behalf of the entity and that the information provided is true, complete, and accurate.`,
  
  seller_trust: `I certify that I am authorized to act on behalf of the trust and that the information provided is true, complete, and accurate.`,
  
  buyer_individual: `I certify that the information provided above is true, complete, and accurate to the best of my knowledge.`,
  
  buyer_entity: `I certify that:
• I am authorized to provide this information on behalf of [Entity Name]
• All information provided is true, complete, and accurate to the best of my knowledge
• All beneficial owners have been identified
• All payment sources have been disclosed`,
  
  buyer_trust: `I certify that:
• I am authorized to act on behalf of [Trust Name]
• All information provided is true, complete, and accurate
• All relevant trustees, settlors, and beneficiaries have been identified
• All payment sources have been disclosed`,
}
