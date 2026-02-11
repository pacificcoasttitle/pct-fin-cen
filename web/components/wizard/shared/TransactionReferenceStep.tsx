"use client";

import { useState } from "react";
import { StepCard } from "./StepCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { LEGAL_DESCRIPTION_TYPE_OPTIONS } from "../constants";
import type { LegalDescriptionType } from "../types";

// Auto-detect legal description type from SiteX property data
function detectLegalDescriptionType(
  propertyData: any,
): LegalDescriptionType {
  // If lot/subdivision data exists → Lot/Block/Subdivision
  if (propertyData?.lot_number || propertyData?.subdivision_name) {
    return "lot_block_subdivision";
  }

  // If description contains metes and bounds indicators
  const desc = (propertyData?.legal_description || "").toLowerCase();
  if (
    desc.includes("beginning at") ||
    desc.includes("thence") ||
    desc.includes("metes and bounds")
  ) {
    return "metes_and_bounds";
  }

  // Default to other
  return "other";
}

// US States for manual entry
const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

interface PropertyAddress {
  street: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
  county?: string;
}

export interface TransactionReferenceData {
  propertyAddress: PropertyAddress | null;
  escrowNumber: string | null;
  closingDate: string | null;
  purchasePrice: number | null;
  apn?: string;
  legalDescriptionType: LegalDescriptionType;
  legalDescription: string | null;
  siteXData?: any;
}

interface TransactionReferenceStepProps {
  value: TransactionReferenceData;
  onChange: (updates: Partial<TransactionReferenceData>) => void;
}

export function TransactionReferenceStep({
  value,
  onChange,
}: TransactionReferenceStepProps) {
  const [showManualAddress, setShowManualAddress] = useState(false);

  const address = value.propertyAddress || {
    street: "",
    unit: "",
    city: "",
    state: "",
    zip: "",
    county: "",
  };

  const handleAddressSelect = (
    selectedAddress: { street: string; city: string; state: string; zip: string; county?: string },
    propertyData?: any,
  ) => {
    const updates: Partial<TransactionReferenceData> = {
      propertyAddress: {
        street: selectedAddress.street,
        city: selectedAddress.city,
        state: selectedAddress.state,
        zip: selectedAddress.zip,
        county: selectedAddress.county || propertyData?.county || "",
      },
      apn: propertyData?.apn || value.apn,
      siteXData: propertyData || null,
    };

    // Auto-fill legal description from SiteX if available
    if (propertyData?.legal_description) {
      updates.legalDescription = propertyData.legal_description;
      updates.legalDescriptionType = detectLegalDescriptionType(propertyData);
    }

    onChange(updates);
  };

  const handleAddressChange = (field: string, fieldValue: string) => {
    onChange({
      propertyAddress: {
        ...address,
        [field]: fieldValue,
      },
    });
  };

  return (
    <StepCard
      title="Transaction Reference"
      description="Enter the property and transaction details for the exemption certificate or FinCEN report."
    >
      <div className="space-y-6">
        {/* ===== SECTION 1: Property Address (full width) ===== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Property Address *</Label>
            <button
              type="button"
              onClick={() => setShowManualAddress(!showManualAddress)}
              className="text-sm text-primary hover:underline"
            >
              {showManualAddress ? "Use autocomplete" : "Enter manually"}
            </button>
          </div>

          {!showManualAddress ? (
            <AddressAutocomplete
              onSelect={handleAddressSelect}
              fetchPropertyData={true}
              showPropertyCard={true}
              placeholder="Start typing property address..."
              defaultValue={
                address.street
                  ? `${address.street}, ${address.city}, ${address.state} ${address.zip}`
                  : ""
              }
            />
          ) : (
            <div className="grid gap-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    value={address.street}
                    onChange={(e) => handleAddressChange("street", e.target.value)}
                    placeholder="123 Main St"
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    value={address.unit || ""}
                    onChange={(e) => handleAddressChange("unit", e.target.value)}
                    placeholder="Apt 4B"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={address.city}
                    onChange={(e) => handleAddressChange("city", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Select
                    value={address.state}
                    onValueChange={(v) => handleAddressChange("state", v)}
                  >
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Select" />
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
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={address.zip}
                    onChange={(e) => handleAddressChange("zip", e.target.value)}
                    placeholder="90210"
                  />
                </div>
                <div>
                  <Label htmlFor="county">County</Label>
                  <Input
                    id="county"
                    value={address.county || ""}
                    onChange={(e) => handleAddressChange("county", e.target.value)}
                    placeholder="Los Angeles"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Auto-filled badges */}
          {(value.apn || value.siteXData?.county) && (
            <div className="flex items-center gap-3 flex-wrap">
              {value.apn && (
                <Badge variant="secondary" className="text-xs">
                  APN: {value.apn}
                </Badge>
              )}
              {value.siteXData?.county && (
                <Badge variant="secondary" className="text-xs">
                  County: {value.siteXData.county}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">Auto-filled from title plant</span>
            </div>
          )}
        </div>

        {/* ===== SECTION 2: Transaction Details (3-column grid) ===== */}
        <div className="border-t pt-6">
          <Label className="text-base font-medium mb-4 block">Transaction Details</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Escrow Number */}
            <div className="space-y-1.5">
              <Label htmlFor="escrowNumber">Escrow / File Number *</Label>
              <Input
                id="escrowNumber"
                value={value.escrowNumber || ""}
                onChange={(e) => onChange({ escrowNumber: e.target.value })}
                placeholder="2026-001234"
              />
              <p className="text-xs text-muted-foreground">
                Your internal reference number
              </p>
            </div>
            
            {/* Purchase Price */}
            <div className="space-y-1.5">
              <Label htmlFor="purchasePrice">Purchase Price *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="purchasePrice"
                  type="text"
                  className="pl-7"
                  value={value.purchasePrice ? value.purchasePrice.toLocaleString() : ""}
                  onChange={(e) => {
                    const numValue = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
                    onChange({ purchasePrice: isNaN(numValue) ? null : numValue });
                  }}
                  placeholder="500,000"
                />
              </div>
            </div>
            
            {/* Closing Date */}
            <div className="space-y-1.5">
              <Label htmlFor="closingDate">Closing Date *</Label>
              <Input
                id="closingDate"
                type="date"
                value={value.closingDate || ""}
                onChange={(e) => onChange({ closingDate: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Filed within 30 days of close
              </p>
            </div>
          </div>
        </div>

        {/* ===== SECTION 3: Legal Description (1 + 2 column) ===== */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-base font-medium">Legal Description</Label>
            {value.siteXData?.legal_description && (
              <Badge variant="secondary" className="text-xs">
                Auto-filled from title plant
              </Badge>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Description Type — takes 1 column */}
            <div className="space-y-1.5">
              <Label htmlFor="legalDescriptionType">Description Type *</Label>
              <Select
                value={value.legalDescriptionType || undefined}
                onValueChange={(v) => onChange({ legalDescriptionType: v as LegalDescriptionType })}
              >
                <SelectTrigger id="legalDescriptionType">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {LEGAL_DESCRIPTION_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Format of the legal description
              </p>
            </div>
            
            {/* Description Text — takes 2 columns */}
            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="legalDescription">Legal Description *</Label>
              <Textarea
                id="legalDescription"
                value={value.legalDescription || ""}
                onChange={(e) => {
                  const text = e.target.value.slice(0, 1000);
                  onChange({ legalDescription: text });
                }}
                placeholder="Enter the legal description from the deed or title report..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {(value.legalDescription?.length || 0)} / 1,000 characters
              </p>
            </div>
          </div>
        </div>
      </div>
    </StepCard>
  );
}
