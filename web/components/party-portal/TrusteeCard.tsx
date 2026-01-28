"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Trash2, User, Building2 } from "lucide-react";
import { AddressFields } from "./AddressFields";
import {
  TrusteeData,
  US_STATES,
  CITIZENSHIP_OPTIONS,
  AddressData,
} from "./types";

interface TrusteeCardProps {
  trustee: TrusteeData;
  index: number;
  canDelete: boolean;
  onChange: (updated: TrusteeData) => void;
  onDelete: () => void;
  disabled?: boolean;
}

const emptyAddress: AddressData = {
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "United States",
};

export function TrusteeCard({
  trustee,
  index,
  canDelete,
  onChange,
  onDelete,
  disabled = false,
}: TrusteeCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  const updateField = (field: string, value: any) => {
    onChange({ ...trustee, [field]: value });
  };

  const updateAddress = (address: AddressData) => {
    onChange({ ...trustee, address });
  };

  const displayName =
    trustee.type === "individual"
      ? trustee.full_name || `Trustee ${index + 1}`
      : trustee.entity_name || `Trustee ${index + 1}`;

  return (
    <Card className="border-purple-200 bg-purple-50/30">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 p-0 h-auto hover:bg-transparent"
              >
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  {trustee.type === "individual" ? (
                    <User className="h-4 w-4 text-purple-600" />
                  ) : (
                    <Building2 className="h-4 w-4 text-purple-600" />
                  )}
                </div>
                <div className="text-left">
                  <CardTitle className="text-base">{displayName}</CardTitle>
                  <p className="text-xs text-muted-foreground capitalize">
                    {trustee.type} Trustee
                  </p>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </Button>
            </CollapsibleTrigger>
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                disabled={disabled}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Trustee Type */}
            <div>
              <Label>Trustee Type *</Label>
              <Select
                value={trustee.type}
                onValueChange={(v) => updateField("type", v)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="entity">Entity/Organization</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Individual Trustee Fields */}
            {trustee.type === "individual" && (
              <>
                <div>
                  <Label>Full Legal Name *</Label>
                  <Input
                    value={trustee.full_name || ""}
                    onChange={(e) => updateField("full_name", e.target.value)}
                    placeholder="Full legal name"
                    disabled={disabled}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date of Birth *</Label>
                    <Input
                      type="date"
                      value={trustee.date_of_birth || ""}
                      onChange={(e) => updateField("date_of_birth", e.target.value)}
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <Label>SSN *</Label>
                    <Input
                      value={trustee.ssn || ""}
                      onChange={(e) => updateField("ssn", e.target.value)}
                      placeholder="XXX-XX-XXXX"
                      maxLength={11}
                      disabled={disabled}
                    />
                  </div>
                </div>

                <div>
                  <Label>Citizenship *</Label>
                  <Select
                    value={trustee.citizenship || ""}
                    onValueChange={(v) => updateField("citizenship", v)}
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

                <AddressFields
                  value={trustee.address || emptyAddress}
                  onChange={updateAddress}
                  required
                  disabled={disabled}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={trustee.phone || ""}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="(XXX) XXX-XXXX"
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={trustee.email || ""}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="email@example.com"
                      disabled={disabled}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Entity Trustee Fields */}
            {trustee.type === "entity" && (
              <>
                <div>
                  <Label>Entity Name *</Label>
                  <Input
                    value={trustee.entity_name || ""}
                    onChange={(e) => updateField("entity_name", e.target.value)}
                    placeholder="Legal entity name"
                    disabled={disabled}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Entity Type *</Label>
                    <Select
                      value={trustee.entity_type || ""}
                      onValueChange={(v) => updateField("entity_type", v)}
                      disabled={disabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="llc">LLC</SelectItem>
                        <SelectItem value="corporation">Corporation</SelectItem>
                        <SelectItem value="bank">Bank/Financial Institution</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>EIN *</Label>
                    <Input
                      value={trustee.ein || ""}
                      onChange={(e) => updateField("ein", e.target.value)}
                      placeholder="XX-XXXXXXX"
                      maxLength={10}
                      disabled={disabled}
                    />
                  </div>
                </div>

                <AddressFields
                  value={trustee.business_address || emptyAddress}
                  onChange={(addr) => updateField("business_address", addr)}
                  required
                  disabled={disabled}
                />

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Contact Name *</Label>
                    <Input
                      value={trustee.contact_name || ""}
                      onChange={(e) => updateField("contact_name", e.target.value)}
                      placeholder="Contact person"
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <Label>Contact Phone</Label>
                    <Input
                      value={trustee.contact_phone || ""}
                      onChange={(e) => updateField("contact_phone", e.target.value)}
                      placeholder="(XXX) XXX-XXXX"
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      value={trustee.contact_email || ""}
                      onChange={(e) => updateField("contact_email", e.target.value)}
                      placeholder="email@example.com"
                      disabled={disabled}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Helper to create empty trustee
export function createEmptyTrustee(): TrusteeData {
  return {
    id: crypto.randomUUID(),
    type: "individual",
  };
}
