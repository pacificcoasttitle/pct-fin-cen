"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { AddressFields } from "../AddressFields";
import { type PartySubmissionData, type AddressData } from "../types";

const emptyAddress: AddressData = {
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "United States",
};

interface AddressStepProps {
  entityType: "individual" | "entity" | "trust";
  data: Partial<PartySubmissionData>;
  onChange: (data: Partial<PartySubmissionData>) => void;
  disabled?: boolean;
}

export function AddressStep({ entityType, data, onChange, disabled }: AddressStepProps) {
  const label =
    entityType === "individual"
      ? "Mailing Address"
      : entityType === "entity"
        ? "Principal Business Address"
        : "Trust Address";

  const description =
    entityType === "individual"
      ? "Please provide your current mailing address."
      : entityType === "entity"
        ? "Please provide the entity's principal business address."
        : "Please provide the address associated with the trust.";

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="w-5 h-5 text-teal-600" />
          {label}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <AddressFields
          value={data.address || emptyAddress}
          onChange={(addr) => onChange({ ...data, address: addr })}
          label=""
          required
          disabled={disabled}
          showUnit
        />
      </CardContent>
    </Card>
  );
}
