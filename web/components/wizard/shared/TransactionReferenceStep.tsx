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
    onChange({
      propertyAddress: {
        street: selectedAddress.street,
        city: selectedAddress.city,
        state: selectedAddress.state,
        zip: selectedAddress.zip,
        county: selectedAddress.county || propertyData?.county || "",
      },
      apn: propertyData?.apn || value.apn,
      siteXData: propertyData,
    });
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
      description="Enter the property and transaction details. This information will appear on the exemption certificate or FinCEN report."
    >
      <div className="space-y-6">
        {/* Property Address */}
        <div className="space-y-4">
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
            />
          ) : (
            <div className="grid gap-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="txn-street">Street Address</Label>
                  <Input
                    id="txn-street"
                    value={address.street}
                    onChange={(e) => handleAddressChange("street", e.target.value)}
                    placeholder="123 Main St"
                  />
                </div>
                <div>
                  <Label htmlFor="txn-unit">Unit</Label>
                  <Input
                    id="txn-unit"
                    value={address.unit || ""}
                    onChange={(e) => handleAddressChange("unit", e.target.value)}
                    placeholder="Apt 4B"
                  />
                </div>
              </div>

              <div className="grid grid-cols-6 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="txn-city">City</Label>
                  <Input
                    id="txn-city"
                    value={address.city}
                    onChange={(e) => handleAddressChange("city", e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="txn-state">State</Label>
                  <Select
                    value={address.state}
                    onValueChange={(v) => handleAddressChange("state", v)}
                  >
                    <SelectTrigger id="txn-state">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((st) => (
                        <SelectItem key={st.value} value={st.value}>
                          {st.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="txn-zip">ZIP Code</Label>
                  <Input
                    id="txn-zip"
                    value={address.zip}
                    onChange={(e) => handleAddressChange("zip", e.target.value)}
                    placeholder="90210"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="txn-county">County</Label>
                <Input
                  id="txn-county"
                  value={address.county || ""}
                  onChange={(e) => handleAddressChange("county", e.target.value)}
                  placeholder="Los Angeles"
                />
              </div>
            </div>
          )}

          {/* Auto-filled APN from SiteX */}
          {value.apn && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                APN: {value.apn}
              </Badge>
              <span className="text-xs text-muted-foreground">Auto-filled from title plant</span>
            </div>
          )}
        </div>

        {/* Escrow Number */}
        <div className="space-y-2">
          <Label htmlFor="txn-escrowNumber">Escrow / File Number *</Label>
          <Input
            id="txn-escrowNumber"
            value={value.escrowNumber || ""}
            onChange={(e) => onChange({ escrowNumber: e.target.value })}
            placeholder="2026-001234"
          />
          <p className="text-xs text-muted-foreground">
            Your internal reference number for this transaction
          </p>
        </div>

        {/* Purchase Price */}
        <div className="space-y-2">
          <Label htmlFor="txn-purchasePrice">Purchase Price *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="txn-purchasePrice"
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
        <div className="space-y-2">
          <Label htmlFor="txn-closingDate">Closing Date *</Label>
          <Input
            id="txn-closingDate"
            type="date"
            value={value.closingDate || ""}
            onChange={(e) => onChange({ closingDate: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            FinCEN reports must be filed within 30 days of closing
          </p>
        </div>

        {/* Legal Description - Required for FinCEN filing */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Legal Description</Label>
            {value.siteXData?.legal_description && (
              <Badge variant="secondary" className="text-xs">
                Auto-filled from title plant
              </Badge>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="txn-legalDescriptionType">Description Type *</Label>
              <Select
                value={value.legalDescriptionType || undefined}
                onValueChange={(v) => onChange({ legalDescriptionType: v as LegalDescriptionType })}
              >
                <SelectTrigger id="txn-legalDescriptionType">
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
              <p className="text-xs text-muted-foreground mt-1">
                Select the format of the legal description
              </p>
            </div>

            <div>
              <Label htmlFor="txn-legalDescription">Legal Description *</Label>
              <Textarea
                id="txn-legalDescription"
                value={value.legalDescription || ""}
                onChange={(e) => {
                  // Truncate to 1000 chars (FinCEN limit)
                  const text = e.target.value.slice(0, 1000);
                  onChange({ legalDescription: text });
                }}
                placeholder="Enter the legal description from the deed or title report..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {value.legalDescription?.length || 0} / 1,000 characters
              </p>
            </div>
          </div>
        </div>
      </div>
    </StepCard>
  );
}
