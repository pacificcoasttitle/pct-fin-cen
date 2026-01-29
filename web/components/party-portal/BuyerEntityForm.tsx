"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2, Users, CreditCard, Plus, Info, AlertTriangle, CheckCircle2 } from "lucide-react"
import { AddressFields } from "./AddressFields"
import { BeneficialOwnerCard, createEmptyBeneficialOwner } from "./BeneficialOwnerCard"
import { PaymentSourceCard, createEmptyPaymentSource } from "./PaymentSourceCard"
import { CertificationSection, CERTIFICATION_TEXTS } from "./CertificationSection"
import { DocumentUpload, DOCUMENT_TYPES } from "./DocumentUpload"
import { 
  type PartySubmissionData, 
  type AddressData,
  type BeneficialOwnerData,
  type PaymentSourceData,
  ENTITY_TYPES,
  US_STATES,
} from "./types"

interface BuyerEntityFormProps {
  data: Partial<PartySubmissionData>
  onChange: (data: Partial<PartySubmissionData>) => void
  disabled?: boolean
  purchasePrice?: number
  partyId?: string
}

const emptyAddress: AddressData = {
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "United States",
}

export function BuyerEntityForm({
  data,
  onChange,
  disabled = false,
  purchasePrice,
  partyId,
}: BuyerEntityFormProps) {
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

  // Beneficial Owners helpers
  const beneficialOwners = data.beneficial_owners || []
  
  const addBeneficialOwner = () => {
    update("beneficial_owners", [...beneficialOwners, createEmptyBeneficialOwner()])
  }

  const updateBeneficialOwner = (index: number, bo: BeneficialOwnerData) => {
    const updated = [...beneficialOwners]
    updated[index] = bo
    update("beneficial_owners", updated)
  }

  const removeBeneficialOwner = (index: number) => {
    update("beneficial_owners", beneficialOwners.filter((_, i) => i !== index))
  }

  // Payment Sources helpers
  const paymentSources = data.payment_sources || []
  
  const addPaymentSource = () => {
    update("payment_sources", [...paymentSources, createEmptyPaymentSource()])
  }

  const updatePaymentSource = (index: number, ps: PaymentSourceData) => {
    const updated = [...paymentSources]
    updated[index] = ps
    update("payment_sources", updated)
  }

  const removePaymentSource = (index: number) => {
    update("payment_sources", paymentSources.filter((_, i) => i !== index))
  }

  // Calculate payment totals
  const totalPayments = paymentSources.reduce((sum, ps) => sum + (ps.amount || 0), 0)
  const formattedTotal = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(totalPayments)
  const formattedPurchasePrice = purchasePrice 
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(purchasePrice / 100)
    : null
  const amountsMatch = purchasePrice ? Math.abs(totalPayments - (purchasePrice / 100)) < 0.01 : null

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
            Details about the purchasing entity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Entity Legal Name *</Label>
              <Input
                value={data.entity_name || ""}
                onChange={(e) => update("entity_name", e.target.value)}
                placeholder="ABC Holdings LLC"
                disabled={disabled}
              />
            </div>
            <div className="col-span-2">
              <Label>DBA / Trade Name (if different)</Label>
              <Input
                value={data.entity_dba || ""}
                onChange={(e) => update("entity_dba", e.target.value)}
                placeholder="ABC Properties"
                disabled={disabled}
              />
            </div>
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

          <div className="grid grid-cols-2 gap-4">
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
              <Label>Date of Formation *</Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Primary Contact Phone *</Label>
              <Input
                type="tel"
                value={data.phone || ""}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(555) 123-4567"
                disabled={disabled}
              />
            </div>
            <div>
              <Label>Primary Contact Email *</Label>
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

      {/* Section 2: Beneficial Owners */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" />
            Section 2: Beneficial Owners
          </CardTitle>
          <CardDescription>
            Individuals who own 25%+ or have substantial control
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Required:</strong> List all individuals who directly or indirectly own 25% or more 
              of the entity OR exercise substantial control. At least one beneficial owner is required.
              <br /><br />
              <strong>Substantial control includes:</strong>
              <ul className="list-disc list-inside mt-1">
                <li>Senior officers (CEO, CFO, COO, etc.)</li>
                <li>Those with authority over important decisions</li>
                <li>Anyone with similar authority</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {beneficialOwners.map((bo, index) => (
              <BeneficialOwnerCard
                key={bo.id}
                index={index}
                data={bo}
                onChange={(updated) => updateBeneficialOwner(index, updated)}
                onRemove={() => removeBeneficialOwner(index)}
                disabled={disabled}
                canRemove={beneficialOwners.length > 1}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addBeneficialOwner}
            disabled={disabled}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {beneficialOwners.length === 0 ? "Beneficial Owner" : "Another Beneficial Owner"}
          </Button>

          {beneficialOwners.length > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              {beneficialOwners.length} beneficial owner{beneficialOwners.length > 1 ? "s" : ""} added
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Signing Individual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Section 3: Signing Individual</CardTitle>
          <CardDescription>
            Who is signing on behalf of the entity for this transaction?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Full Legal Name *</Label>
              <Input
                value={data.signer_name || ""}
                onChange={(e) => update("signer_name", e.target.value)}
                placeholder="John A. Smith"
                disabled={disabled}
              />
            </div>
            <div>
              <Label>Title / Capacity *</Label>
              <Input
                value={data.signer_title || ""}
                onChange={(e) => update("signer_title", e.target.value)}
                placeholder="Managing Member, President, etc."
                disabled={disabled}
              />
            </div>
            <div>
              <Label>Date of Birth *</Label>
              <Input
                type="date"
                value={data.signer_dob || ""}
                onChange={(e) => update("signer_dob", e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>

          {beneficialOwners.length > 0 && (
            <div>
              <Label>Is this same as a Beneficial Owner?</Label>
              <Select
                value={data.signer_is_bo || ""}
                onValueChange={(val) => {
                  update("signer_is_bo", val)
                  // Auto-fill from BO if selected
                  if (val && val !== "no") {
                    const bo = beneficialOwners.find(b => b.id === val)
                    if (bo) {
                      update("signer_name", [bo.first_name, bo.middle_name, bo.last_name, bo.suffix].filter(Boolean).join(" "))
                      update("signer_dob", bo.date_of_birth)
                      update("signer_address", bo.address)
                    }
                  }
                }}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select if same as BO" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No, different person</SelectItem>
                  {beneficialOwners.map((bo, index) => (
                    <SelectItem key={bo.id} value={bo.id}>
                      Same as BO #{index + 1}: {bo.first_name} {bo.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(!data.signer_is_bo || data.signer_is_bo === "no") && (
            <div className="pt-2">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">
                Signer Residential Address
              </h4>
              <AddressFields
                value={data.signer_address || emptyAddress}
                onChange={(addr) => update("signer_address", addr)}
                required
                disabled={disabled}
                showCountry
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5" />
            Section 4: Payment Information
          </CardTitle>
          <CardDescription>
            How is this purchase being funded?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {formattedPurchasePrice && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Purchase Price</p>
              <p className="text-2xl font-bold">{formattedPurchasePrice}</p>
            </div>
          )}

          <div className="space-y-4">
            {paymentSources.map((ps, index) => (
              <PaymentSourceCard
                key={ps.id}
                index={index}
                data={ps}
                onChange={(updated) => updatePaymentSource(index, updated)}
                onRemove={() => removePaymentSource(index)}
                disabled={disabled}
                canRemove={paymentSources.length > 1}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addPaymentSource}
            disabled={disabled}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {paymentSources.length === 0 ? "Payment Source" : "Another Payment Source"}
          </Button>

          {/* Payment Total Validation */}
          {paymentSources.length > 0 && (
            <div className={`p-4 rounded-lg border ${
              amountsMatch === true 
                ? "bg-green-50 border-green-200" 
                : amountsMatch === false 
                  ? "bg-amber-50 border-amber-200"
                  : "bg-muted/50"
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total from all sources:</p>
                  <p className="text-xl font-bold">{formattedTotal}</p>
                </div>
                {amountsMatch !== null && (
                  <div className="flex items-center gap-2">
                    {amountsMatch ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="text-green-700 font-medium">Amounts match</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        <span className="text-amber-700 font-medium">
                          Doesn&apos;t match purchase price
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Document Upload */}
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
        certificationText={CERTIFICATION_TEXTS.buyer_entity}
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
