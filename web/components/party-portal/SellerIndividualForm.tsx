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
import { User, Phone } from "lucide-react"
import { AddressFields } from "./AddressFields"
import { CertificationSection, CERTIFICATION_TEXTS } from "./CertificationSection"
import { 
  type PartySubmissionData, 
  type AddressData,
  CITIZENSHIP_OPTIONS,
  ID_TYPES,
  US_STATES,
} from "./types"

interface SellerIndividualFormProps {
  data: Partial<PartySubmissionData>
  onChange: (data: Partial<PartySubmissionData>) => void
  disabled?: boolean
  email?: string
}

const emptyAddress: AddressData = {
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "United States",
}

export function SellerIndividualForm({
  data,
  onChange,
  disabled = false,
  email,
}: SellerIndividualFormProps) {
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

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Enter your legal name exactly as it appears on your ID
          </CardDescription>
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
              <Label>Middle Name</Label>
              <Input
                value={data.middle_name || ""}
                onChange={(e) => update("middle_name", e.target.value)}
                placeholder="Robert"
                disabled={disabled}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
              <Label>Suffix</Label>
              <Input
                value={data.suffix || ""}
                onChange={(e) => update("suffix", e.target.value)}
                placeholder="Jr., Sr., III"
                disabled={disabled}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
        </CardContent>
      </Card>

      {/* Identification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identification</CardTitle>
          <CardDescription>
            Required for federal reporting compliance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>SSN or ITIN *</Label>
              <Input
                type="password"
                value={data.ssn || ""}
                onChange={(e) => update("ssn", e.target.value)}
                placeholder="###-##-####"
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This information is encrypted and secure
              </p>
            </div>
            <div>
              <Label>Citizenship Status *</Label>
              <Select
                value={data.citizenship || ""}
                onValueChange={(val) => update("citizenship", val as any)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
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
          
          {/* Additional ID (for non-citizens or if needed) */}
          {data.citizenship && data.citizenship !== "us_citizen" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ID Type</Label>
                <Select
                  value={data.id_type || ""}
                  onValueChange={(val) => update("id_type", val)}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ID type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ID_TYPES.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ID Number</Label>
                <Input
                  type="password"
                  value={data.id_number || ""}
                  onChange={(e) => update("id_number", e.target.value)}
                  placeholder="ID Number"
                  disabled={disabled}
                />
              </div>
              {(data.id_type === "passport_foreign" || data.id_type === "state_id") && (
                <div>
                  <Label>Issuing Jurisdiction</Label>
                  {data.id_type === "state_id" ? (
                    <Select
                      value={data.id_jurisdiction || ""}
                      onValueChange={(val) => update("id_jurisdiction", val)}
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
                  ) : (
                    <Input
                      value={data.id_jurisdiction || ""}
                      onChange={(e) => update("id_jurisdiction", e.target.value)}
                      placeholder="Country"
                      disabled={disabled}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Address After Closing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Address After Closing</CardTitle>
          <CardDescription>
            Where should correspondence be sent after the sale?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddressFields
            value={data.address || emptyAddress}
            onChange={(addr) => update("address", addr)}
            required
            disabled={disabled}
            showCountry
          />
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone Number</Label>
              <Input
                type="tel"
                value={data.phone || ""}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(555) 123-4567"
                disabled={disabled}
              />
            </div>
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                value={email || data.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pre-filled from invitation
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certification */}
      <CertificationSection
        certified={data.certified || false}
        signature={data.certification_signature || ""}
        date={data.certification_date || today}
        certificationText={CERTIFICATION_TEXTS.seller_individual}
        onCertifiedChange={(checked) => {
          update("certified", checked)
          if (checked && !data.certification_date) {
            update("certification_date", today)
          }
        }}
        onSignatureChange={(sig) => update("certification_signature", sig)}
        disabled={disabled}
      />
    </div>
  )
}
