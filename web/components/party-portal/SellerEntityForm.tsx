"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2, UserCircle, Phone } from "lucide-react"
import { AddressFields } from "./AddressFields"
import { CertificationSection, CERTIFICATION_TEXTS } from "./CertificationSection"
import { DocumentUpload, DOCUMENT_TYPES } from "./DocumentUpload"
import { 
  type PartySubmissionData, 
  type AddressData,
  ENTITY_TYPES,
  US_STATES,
  ID_TYPES,
  CITIZENSHIP_OPTIONS,
} from "./types"

interface SellerEntityFormProps {
  data: Partial<PartySubmissionData>
  onChange: (data: Partial<PartySubmissionData>) => void
  disabled?: boolean
  email?: string
  partyId?: string
}

const emptyAddress: AddressData = {
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "United States",
}

export function SellerEntityForm({
  data,
  onChange,
  disabled = false,
  email,
  partyId,
}: SellerEntityFormProps) {
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

  return (
    <div className="space-y-6">
      {/* Section 1: Entity Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5" />
            Section 1: Entity Information
          </CardTitle>
          <CardDescription>
            Details about the selling entity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-1 sm:col-span-2">
              <Label>Entity Legal Name *</Label>
              <Input
                value={data.entity_name || ""}
                onChange={(e) => update("entity_name", e.target.value)}
                placeholder="Smith Family Holdings LLC"
                disabled={disabled}
              />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <Label>DBA / Trade Name (if different)</Label>
              <Input
                value={data.entity_dba || ""}
                onChange={(e) => update("entity_dba", e.target.value)}
                placeholder="Smith Properties"
                disabled={disabled}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Entity Type *</Label>
              <Select
                value={data.entity_type || ""}
                onValueChange={(val) => update("entity_type", val)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>TIN/EIN *</Label>
              <Input
                value={data.ein || ""}
                onChange={(e) => update("ein", e.target.value)}
                placeholder="##-#######"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>State of Formation *</Label>
              <Select
                value={data.formation_state || ""}
                onValueChange={(val) => update("formation_state", val)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date of Formation</Label>
              <Input
                type="date"
                value={data.formation_date || ""}
                onChange={(e) => update("formation_date", e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="pt-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">
              Principal Business Address
            </h4>
            <AddressFields
              value={data.address || emptyAddress}
              onChange={(addr) => update("address", addr)}
              required
              disabled={disabled}
              showCountry
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Contact Phone</Label>
              <Input
                type="tel"
                value={data.phone || ""}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(555) 123-4567"
                disabled={disabled}
              />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={displayEmail}
                onChange={(e) => update("email", e.target.value)}
                placeholder="contact@company.com"
                disabled={disabled || !!email}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Signing Individual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCircle className="h-5 w-5" />
            Section 2: Signing Individual
          </CardTitle>
          <CardDescription>
            Person signing the deed on behalf of the entity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>First Name *</Label>
              <Input
                value={data.first_name || ""}
                onChange={(e) => update("first_name", e.target.value)}
                placeholder="John"
                disabled={disabled}
              />
            </div>
            <div>
              <Label>Middle Name</Label>
              <Input
                value={data.middle_name || ""}
                onChange={(e) => update("middle_name", e.target.value)}
                placeholder="A"
                disabled={disabled}
              />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input
                value={data.last_name || ""}
                onChange={(e) => update("last_name", e.target.value)}
                placeholder="Smith"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Title / Capacity *</Label>
              <Input
                value={data.signer_title || ""}
                onChange={(e) => update("signer_title", e.target.value)}
                placeholder="Manager, President, Member, etc."
                disabled={disabled}
              />
            </div>
            <div>
              <Label>Date of Birth *</Label>
              <Input
                type="date"
                value={data.date_of_birth || ""}
                onChange={(e) => update("date_of_birth", e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>ID Type *</Label>
              <Select
                value={data.id_type || ""}
                onValueChange={(val) => update("id_type", val)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ID type" />
                </SelectTrigger>
                <SelectContent>
                  {ID_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ID Number *</Label>
              <Input
                value={data.id_number || ""}
                onChange={(e) => update("id_number", e.target.value)}
                placeholder={data.id_type === "ssn" ? "XXX-XX-XXXX" : "Enter ID number"}
                disabled={disabled}
              />
            </div>
          </div>

          {(data.id_type === "passport_us" || data.id_type === "passport_foreign" || data.id_type === "state_id") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Issuing Jurisdiction *</Label>
                <Input
                  value={data.id_jurisdiction || ""}
                  onChange={(e) => update("id_jurisdiction", e.target.value)}
                  placeholder="State or Country"
                  disabled={disabled}
                />
              </div>
              <div>
                <Label>Citizenship</Label>
                <Select
                  value={data.citizenship || ""}
                  onValueChange={(val) => update("citizenship", val as PartySubmissionData["citizenship"])}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select citizenship" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIZENSHIP_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="pt-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">
              Residential Address
            </h4>
            <AddressFields
              value={data.signer_address || emptyAddress}
              onChange={(addr) => update("signer_address", addr)}
              required
              disabled={disabled}
              showCountry
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Document Upload */}
      {partyId && (
        <DocumentUpload
          partyId={partyId}
          documentTypes={DOCUMENT_TYPES.entity}
        />
      )}

      {/* Certification */}
      <CertificationSection
        certified={data.certified || false}
        signature={data.certification_signature || ""}
        date={data.certification_date || today}
        certificationText={CERTIFICATION_TEXTS.seller_entity}
        onCertifiedChange={(checked) => {
          update("certified", checked)
          if (checked && !data.certification_date) {
            update("certification_date", today)
          }
        }}
        onSignatureChange={(sig) => update("certification_signature", sig)}
        disabled={disabled}
        entityName={data.entity_name}
      />
    </div>
  )
}
