"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, Trash2, User } from "lucide-react"
import { AddressFields } from "./AddressFields"
import { 
  type BeneficialOwnerData, 
  type AddressData,
  ID_TYPES, 
  CITIZENSHIP_OPTIONS,
  US_STATES 
} from "./types"

interface BeneficialOwnerCardProps {
  index: number
  data: BeneficialOwnerData
  onChange: (data: BeneficialOwnerData) => void
  onRemove: () => void
  disabled?: boolean
  canRemove?: boolean
  parentEntityType?: "entity" | "trust"
}

const emptyAddress: AddressData = {
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "United States",
}

export function BeneficialOwnerCard({
  index,
  data,
  onChange,
  onRemove,
  disabled = false,
  canRemove = true,
  parentEntityType = "entity",
}: BeneficialOwnerCardProps) {
  const [isOpen, setIsOpen] = useState(true)

  const update = <K extends keyof BeneficialOwnerData>(
    field: K,
    value: BeneficialOwnerData[K]
  ) => {
    onChange({ ...data, [field]: value })
  }

  const updateControlType = (type: string, checked: boolean) => {
    const current = data.control_type || []
    if (checked) {
      update("control_type", [...current, type as any])
    } else {
      update("control_type", current.filter((t) => t !== type))
    }
  }

  const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ") || `Beneficial Owner ${index + 1}`

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="relative">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{fullName}</CardTitle>
                  {data.ownership_percentage && (
                    <p className="text-sm text-muted-foreground">
                      {data.ownership_percentage}% ownership
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canRemove && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove()
                    }}
                    disabled={disabled}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            {/* Personal Information */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">
                Personal Information
              </h4>
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
                <div className="col-span-2 sm:col-span-1">
                  <Label>Date of Birth *</Label>
                  <Input
                    type="date"
                    value={data.date_of_birth || ""}
                    onChange={(e) => update("date_of_birth", e.target.value)}
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <AddressFields
              value={data.address || emptyAddress}
              onChange={(addr) => update("address", addr)}
              label="Residential Address (not P.O. Box)"
              required
              disabled={disabled}
              showCountry
            />

            {/* Citizenship & Identification */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">
                Citizenship & Identification
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Citizenship *</Label>
                  <Select
                    value={data.citizenship || ""}
                    onValueChange={(val) => update("citizenship", val as any)}
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
                <div>
                  <Label>ID Type *</Label>
                  <Select
                    value={data.id_type || ""}
                    onValueChange={(val) => update("id_type", val as any)}
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
                  <Label>ID Number *</Label>
                  <Input
                    type="password"
                    value={data.id_number || ""}
                    onChange={(e) => update("id_number", e.target.value)}
                    placeholder={data.id_type === "ssn" ? "###-##-####" : "ID Number"}
                    disabled={disabled}
                  />
                </div>
                {(data.id_type === "passport_foreign" || data.id_type === "state_id") && (
                  <div>
                    <Label>Issuing Jurisdiction *</Label>
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
            </div>

            {/* Ownership Basis */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">
                Ownership Basis *
              </h4>
              <div className="space-y-4">
                <div>
                  <Label>Ownership Percentage (if 25% or more)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={data.ownership_percentage || ""}
                      onChange={(e) => update("ownership_percentage", parseFloat(e.target.value) || undefined)}
                      placeholder="25"
                      className="w-24"
                      disabled={disabled}
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
                
                <div>
                  <Label>Control Position</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`bo-${index}-senior`}
                        checked={data.control_type?.includes("senior_officer") || false}
                        onCheckedChange={(checked) => updateControlType("senior_officer", checked as boolean)}
                        disabled={disabled}
                      />
                      <label htmlFor={`bo-${index}-senior`} className="text-sm cursor-pointer">
                        Senior Officer (CEO, CFO, COO, etc.)
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`bo-${index}-authority`}
                        checked={data.control_type?.includes("authority_decisions") || false}
                        onCheckedChange={(checked) => updateControlType("authority_decisions", checked as boolean)}
                        disabled={disabled}
                      />
                      <label htmlFor={`bo-${index}-authority`} className="text-sm cursor-pointer">
                        Authority over important decisions
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`bo-${index}-other`}
                        checked={data.control_type?.includes("other") || false}
                        onCheckedChange={(checked) => updateControlType("other", checked as boolean)}
                        disabled={disabled}
                      />
                      <label htmlFor={`bo-${index}-other`} className="text-sm cursor-pointer">
                        Other substantial control
                      </label>
                    </div>
                    {data.control_type?.includes("other") && (
                      <Input
                        value={data.control_other || ""}
                        onChange={(e) => update("control_other", e.target.value)}
                        placeholder="Describe control type"
                        className="mt-2"
                        disabled={disabled}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Role - only for trust buyers */}
            {parentEntityType === "trust" && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">
                  Role in Trust *
                </h4>
                <Select
                  value={data.trust_role || ""}
                  onValueChange={(val) => update("trust_role", val as any)}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role in trust..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trustee">Trustee</SelectItem>
                    <SelectItem value="settlor">Settlor/Grantor</SelectItem>
                    <SelectItem value="beneficiary">Beneficiary</SelectItem>
                    <SelectItem value="power_holder">Power of Appointment Holder</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Indirect Ownership Section */}
            <div className="pt-4 border-t">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">
                Ownership Structure
              </h4>
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id={`indirect-${data.id}`}
                    checked={data.is_indirect_owner || false}
                    onCheckedChange={(checked) => 
                      update("is_indirect_owner", checked as boolean)
                    }
                    disabled={disabled}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor={`indirect-${data.id}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      This person owns through another entity (indirect ownership)
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Check if ownership is held through an LLC, corporation, or other entity
                    </p>
                  </div>
                </div>
                
                {data.is_indirect_owner && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor={`indirect-entity-${data.id}`}>
                      Through which entity?
                    </Label>
                    <Input
                      id={`indirect-entity-${data.id}`}
                      placeholder="e.g., ABC Holdings LLC"
                      value={data.indirect_entity_name || ""}
                      onChange={(e) => update("indirect_entity_name", e.target.value)}
                      disabled={disabled}
                    />
                    <p className="text-xs text-muted-foreground">
                      The entity through which this person holds their ownership interest
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

// Helper to create a new empty beneficial owner
export function createEmptyBeneficialOwner(): BeneficialOwnerData {
  return {
    id: crypto.randomUUID(),
    first_name: "",
    last_name: "",
    date_of_birth: "",
    address: {
      street: "",
      city: "",
      state: "",
      zip: "",
      country: "United States",
    },
    citizenship: "us_citizen",
    id_type: "ssn",
    id_number: "",
    is_indirect_owner: false,
    indirect_entity_name: "",
    trust_role: undefined,
  }
}
