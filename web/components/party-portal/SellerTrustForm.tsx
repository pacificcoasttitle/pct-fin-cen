"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Landmark, Users, Plus, Info } from "lucide-react"
import { TrusteeCard, createEmptyTrustee } from "./TrusteeCard"
import { CertificationSection, CERTIFICATION_TEXTS } from "./CertificationSection"
import { 
  type PartySubmissionData, 
  type TrusteeData,
  TRUST_TYPES,
} from "./types"

interface SellerTrustFormProps {
  data: Partial<PartySubmissionData>
  onChange: (data: Partial<PartySubmissionData>) => void
  disabled?: boolean
  email?: string
}

export function SellerTrustForm({
  data,
  onChange,
  disabled = false,
  email,
}: SellerTrustFormProps) {
  const update = <K extends keyof PartySubmissionData>(
    field: K,
    value: PartySubmissionData[K]
  ) => {
    onChange({ ...data, [field]: value })
  }

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Use pre-filled email if available
  const displayEmail = email || data.email || ""

  // Trustees management
  const trustees = data.trustees || []
  
  const addTrustee = () => {
    update("trustees", [...trustees, createEmptyTrustee()])
  }

  const updateTrustee = (index: number, updated: TrusteeData) => {
    const newTrustees = [...trustees]
    newTrustees[index] = updated
    update("trustees", newTrustees)
  }

  const removeTrustee = (index: number) => {
    update("trustees", trustees.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Trust Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="h-5 w-5" />
            Section 1: Trust Information
          </CardTitle>
          <CardDescription>
            Details about the selling trust
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="col-span-2">
            <Label>Trust Name *</Label>
            <Input
              value={data.trust_name || ""}
              onChange={(e) => update("trust_name", e.target.value)}
              placeholder="The Smith Family Trust dated January 1, 2010"
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Full title as it appears on the trust agreement
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Trust Type *</Label>
              <Select
                value={data.trust_type || ""}
                onValueChange={(val) => update("trust_type", val)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trust type" />
                </SelectTrigger>
                <SelectContent>
                  {TRUST_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date Executed *</Label>
              <Input
                type="date"
                value={data.trust_date || ""}
                onChange={(e) => update("trust_date", e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Tax ID (TIN/EIN)</Label>
              <Input
                value={data.trust_ein || ""}
                onChange={(e) => update("trust_ein", e.target.value)}
                placeholder="##-#######"
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground mt-1">
                May be trust EIN or grantor&apos;s SSN for revocable trusts
              </p>
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={displayEmail}
                onChange={(e) => update("email", e.target.value)}
                placeholder="trustee@email.com"
                disabled={disabled || !!email}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Trustees */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" />
            Section 2: Trustees
          </CardTitle>
          <CardDescription>
            All trustees authorized to act on behalf of the trust
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              List <strong>all trustees</strong> of this trust. At least one trustee who will 
              sign the deed is required. Trustees may be individuals or entities.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {trustees.map((trustee, index) => (
              <TrusteeCard
                key={trustee.id}
                index={index}
                data={trustee}
                onChange={(updated) => updateTrustee(index, updated)}
                onRemove={() => removeTrustee(index)}
                disabled={disabled}
                canRemove={trustees.length > 1}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addTrustee}
            disabled={disabled}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {trustees.length === 0 ? "Trustee" : "Another Trustee"}
          </Button>

          {trustees.length > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              {trustees.length} trustee{trustees.length > 1 ? "s" : ""} added
            </p>
          )}
        </CardContent>
      </Card>

      {/* Certification */}
      <CertificationSection
        certified={data.certified || false}
        signature={data.certification_signature || ""}
        date={data.certification_date || today}
        certificationText={CERTIFICATION_TEXTS.seller_trust}
        onCertifiedChange={(checked) => {
          update("certified", checked)
          if (checked && !data.certification_date) {
            update("certification_date", today)
          }
        }}
        onSignatureChange={(sig) => update("certification_signature", sig)}
        disabled={disabled}
        entityName={data.trust_name}
      />
    </div>
  )
}
