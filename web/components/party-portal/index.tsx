"use client"

// Export all party portal components
export * from "./types"
export { AddressFields } from "./AddressFields"
export { CertificationSection, CERTIFICATION_TEXTS } from "./CertificationSection"
export { BeneficialOwnerCard, createEmptyBeneficialOwner } from "./BeneficialOwnerCard"
export { PaymentSourceCard, createEmptyPaymentSource } from "./PaymentSourceCard"
export { SellerIndividualForm } from "./SellerIndividualForm"
export { BuyerEntityForm } from "./BuyerEntityForm"

// Form selector component
import { SellerIndividualForm } from "./SellerIndividualForm"
import { BuyerEntityForm } from "./BuyerEntityForm"
import { CertificationSection, CERTIFICATION_TEXTS } from "./CertificationSection"
import { AddressFields } from "./AddressFields"
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
import { Building2, User, Phone } from "lucide-react"
import { 
  type PartySubmissionData, 
  type AddressData,
  ENTITY_TYPES,
  TRUST_TYPES,
  US_STATES,
  CITIZENSHIP_OPTIONS,
} from "./types"

const emptyAddress: AddressData = {
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "United States",
}

interface DynamicPartyFormProps {
  partyRole: "transferee" | "transferor" | "beneficial_owner"
  entityType: "individual" | "entity" | "trust"
  data: Partial<PartySubmissionData>
  onChange: (data: Partial<PartySubmissionData>) => void
  disabled?: boolean
  email?: string
  purchasePrice?: number
}

export function DynamicPartyForm({
  partyRole,
  entityType,
  data,
  onChange,
  disabled = false,
  email,
  purchasePrice,
}: DynamicPartyFormProps) {
  const isSeller = partyRole === "transferor"
  const isBuyer = partyRole === "transferee"

  // Route to the correct form based on role and type
  if (isSeller && entityType === "individual") {
    return (
      <SellerIndividualForm
        data={data}
        onChange={onChange}
        disabled={disabled}
        email={email}
      />
    )
  }

  if (isBuyer && entityType === "entity") {
    return (
      <BuyerEntityForm
        data={data}
        onChange={onChange}
        disabled={disabled}
        purchasePrice={purchasePrice}
      />
    )
  }

  // Fallback: Generic forms for other combinations
  // These can be expanded into full components later
  
  if (entityType === "entity") {
    return <GenericEntityForm data={data} onChange={onChange} disabled={disabled} />
  }

  if (entityType === "trust") {
    return <GenericTrustForm data={data} onChange={onChange} disabled={disabled} />
  }

  // Default: Individual form
  return <GenericIndividualForm data={data} onChange={onChange} disabled={disabled} email={email} />
}

// Generic Individual Form (fallback)
function GenericIndividualForm({
  data,
  onChange,
  disabled,
  email,
}: {
  data: Partial<PartySubmissionData>
  onChange: (data: Partial<PartySubmissionData>) => void
  disabled?: boolean
  email?: string
}) {
  const update = <K extends keyof PartySubmissionData>(field: K, value: PartySubmissionData[K]) => {
    onChange({ ...data, [field]: value })
  }

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <Label>Last Name *</Label>
              <Input
                value={data.last_name || ""}
                onChange={(e) => update("last_name", e.target.value)}
                placeholder="Smith"
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
            <div>
              <Label>Citizenship</Label>
              <Select
                value={data.citizenship || ""}
                onValueChange={(val) => update("citizenship", val as any)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {CITIZENSHIP_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Address</CardTitle>
        </CardHeader>
        <CardContent>
          <AddressFields
            value={data.address || emptyAddress}
            onChange={(addr) => update("address", addr)}
            required
            disabled={disabled}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-5 w-5" />
            Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone</Label>
              <Input
                type="tel"
                value={data.phone || ""}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(555) 123-4567"
                disabled={disabled}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email || data.email || ""}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <CertificationSection
        certified={data.certified || false}
        signature={data.certification_signature || ""}
        date={data.certification_date || today}
        certificationText={CERTIFICATION_TEXTS.seller_individual}
        onCertifiedChange={(checked) => {
          update("certified", checked)
          if (checked) update("certification_date", today)
        }}
        onSignatureChange={(sig) => update("certification_signature", sig)}
        disabled={disabled}
      />
    </div>
  )
}

// Generic Entity Form (fallback)
function GenericEntityForm({
  data,
  onChange,
  disabled,
}: {
  data: Partial<PartySubmissionData>
  onChange: (data: Partial<PartySubmissionData>) => void
  disabled?: boolean
}) {
  const update = <K extends keyof PartySubmissionData>(field: K, value: PartySubmissionData[K]) => {
    onChange({ ...data, [field]: value })
  }

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5" />
            Entity Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Entity Legal Name *</Label>
            <Input
              value={data.entity_name || ""}
              onChange={(e) => update("entity_name", e.target.value)}
              placeholder="ABC Holdings LLC"
              disabled={disabled}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
                    <SelectItem key={state.value} value={state.value}>{state.label}</SelectItem>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Principal Address</CardTitle>
        </CardHeader>
        <CardContent>
          <AddressFields
            value={data.address || emptyAddress}
            onChange={(addr) => update("address", addr)}
            required
            disabled={disabled}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Authorized Representative</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                value={data.signer_name || ""}
                onChange={(e) => update("signer_name", e.target.value)}
                placeholder="John Smith"
                disabled={disabled}
              />
            </div>
            <div>
              <Label>Title *</Label>
              <Input
                value={data.signer_title || ""}
                onChange={(e) => update("signer_title", e.target.value)}
                placeholder="Managing Member"
                disabled={disabled}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                type="tel"
                value={data.phone || ""}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(555) 123-4567"
                disabled={disabled}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={data.email || ""}
                onChange={(e) => update("email", e.target.value)}
                placeholder="contact@company.com"
                disabled={disabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <CertificationSection
        certified={data.certified || false}
        signature={data.certification_signature || ""}
        date={data.certification_date || today}
        certificationText={CERTIFICATION_TEXTS.seller_entity}
        onCertifiedChange={(checked) => {
          update("certified", checked)
          if (checked) update("certification_date", today)
        }}
        onSignatureChange={(sig) => update("certification_signature", sig)}
        disabled={disabled}
        entityName={data.entity_name}
      />
    </div>
  )
}

// Generic Trust Form (fallback)
function GenericTrustForm({
  data,
  onChange,
  disabled,
}: {
  data: Partial<PartySubmissionData>
  onChange: (data: Partial<PartySubmissionData>) => void
  disabled?: boolean
}) {
  const update = <K extends keyof PartySubmissionData>(field: K, value: PartySubmissionData[K]) => {
    onChange({ ...data, [field]: value })
  }

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5" />
            Trust Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Trust Legal Name *</Label>
            <Input
              value={data.trust_name || ""}
              onChange={(e) => update("trust_name", e.target.value)}
              placeholder="The Smith Family Trust"
              disabled={disabled}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Trust Type *</Label>
              <Select
                value={data.trust_type || ""}
                onValueChange={(val) => update("trust_type", val)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TRUST_TYPES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
            <div>
              <Label>TIN/EIN (if assigned)</Label>
              <Input
                value={data.trust_ein || ""}
                onChange={(e) => update("trust_ein", e.target.value)}
                placeholder="##-#######"
                disabled={disabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trust Address</CardTitle>
        </CardHeader>
        <CardContent>
          <AddressFields
            value={data.address || emptyAddress}
            onChange={(addr) => update("address", addr)}
            required
            disabled={disabled}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trustee Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Trustee Name *</Label>
              <Input
                value={data.signer_name || ""}
                onChange={(e) => update("signer_name", e.target.value)}
                placeholder="John Smith"
                disabled={disabled}
              />
            </div>
            <div>
              <Label>Title / Capacity *</Label>
              <Input
                value={data.signer_title || ""}
                onChange={(e) => update("signer_title", e.target.value)}
                placeholder="Trustee"
                disabled={disabled}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                type="tel"
                value={data.phone || ""}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(555) 123-4567"
                disabled={disabled}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={data.email || ""}
                onChange={(e) => update("email", e.target.value)}
                placeholder="trustee@email.com"
                disabled={disabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <CertificationSection
        certified={data.certified || false}
        signature={data.certification_signature || ""}
        date={data.certification_date || today}
        certificationText={CERTIFICATION_TEXTS.seller_trust}
        onCertifiedChange={(checked) => {
          update("certified", checked)
          if (checked) update("certification_date", today)
        }}
        onSignatureChange={(sig) => update("certification_signature", sig)}
        disabled={disabled}
        entityName={data.trust_name}
      />
    </div>
  )
}
