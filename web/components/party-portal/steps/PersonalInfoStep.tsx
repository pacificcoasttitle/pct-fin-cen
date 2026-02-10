"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Building2, Calendar, CreditCard } from "lucide-react";
import {
  type PartySubmissionData,
  ENTITY_TYPES,
  TRUST_TYPES,
  CITIZENSHIP_OPTIONS,
  US_STATES,
} from "../types";

interface PersonalInfoStepProps {
  entityType: "individual" | "entity" | "trust";
  partyRole: "transferee" | "transferor" | "beneficial_owner";
  data: Partial<PartySubmissionData>;
  onChange: (data: Partial<PartySubmissionData>) => void;
  disabled?: boolean;
  email?: string;
}

export function PersonalInfoStep({ entityType, partyRole, data, onChange, disabled, email }: PersonalInfoStepProps) {
  const update = <K extends keyof PartySubmissionData>(field: K, value: PartySubmissionData[K]) => {
    onChange({ ...data, [field]: value });
  };

  // ─── Individual ───
  if (entityType === "individual") {
    return (
      <Card className="border-0 shadow-none">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5 text-teal-600" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Please provide your legal name as it appears on government-issued ID.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pi-firstName">First Name *</Label>
              <Input
                id="pi-firstName"
                value={data.first_name || ""}
                onChange={(e) => update("first_name", e.target.value)}
                placeholder="John"
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor="pi-lastName">Last Name *</Label>
              <Input
                id="pi-lastName"
                value={data.last_name || ""}
                onChange={(e) => update("last_name", e.target.value)}
                placeholder="Smith"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pi-middleName">Middle Name</Label>
              <Input
                id="pi-middleName"
                value={data.middle_name || ""}
                onChange={(e) => update("middle_name", e.target.value)}
                placeholder="Michael"
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor="pi-suffix">Suffix</Label>
              <Input
                id="pi-suffix"
                value={data.suffix || ""}
                onChange={(e) => update("suffix", e.target.value)}
                placeholder="Jr., Sr., III"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pi-dob" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date of Birth *
              </Label>
              <Input
                id="pi-dob"
                type="date"
                value={data.date_of_birth || ""}
                onChange={(e) => update("date_of_birth", e.target.value)}
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor="pi-citizenship">Citizenship</Label>
              <Select
                value={data.citizenship || ""}
                onValueChange={(val) => update("citizenship", val as PartySubmissionData["citizenship"])}
                disabled={disabled}
              >
                <SelectTrigger id="pi-citizenship">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pi-ssn" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                SSN / Tax ID
              </Label>
              <Input
                id="pi-ssn"
                type="password"
                value={data.ssn || ""}
                onChange={(e) => update("ssn", e.target.value)}
                placeholder="XXX-XX-XXXX"
                maxLength={11}
                disabled={disabled}
              />
              <p className="text-xs text-gray-500 mt-1">
                Encrypted and securely stored.
              </p>
            </div>
            <div>
              <Label htmlFor="pi-phone">Phone</Label>
              <Input
                id="pi-phone"
                type="tel"
                value={data.phone || ""}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(555) 123-4567"
                disabled={disabled}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="pi-email">Email</Label>
            <Input
              id="pi-email"
              type="email"
              value={email || data.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-gray-500 mt-1">
              This is the email on file for this transaction.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Entity ───
  if (entityType === "entity") {
    return (
      <Card className="border-0 shadow-none">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="w-5 h-5 text-teal-600" />
            Entity Information
          </CardTitle>
          <CardDescription>
            Please provide your company&apos;s legal information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-0">
          <div>
            <Label htmlFor="pi-entityName">Legal Entity Name *</Label>
            <Input
              id="pi-entityName"
              value={data.entity_name || ""}
              onChange={(e) => update("entity_name", e.target.value)}
              placeholder="ABC Holdings LLC"
              disabled={disabled}
            />
          </div>

          <div>
            <Label htmlFor="pi-entityDba">DBA / Trade Name</Label>
            <Input
              id="pi-entityDba"
              value={data.entity_dba || ""}
              onChange={(e) => update("entity_dba", e.target.value)}
              placeholder="Optional"
              disabled={disabled}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pi-entityType">Entity Type *</Label>
              <Select
                value={data.entity_type || ""}
                onValueChange={(val) => update("entity_type", val)}
                disabled={disabled}
              >
                <SelectTrigger id="pi-entityType">
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
              <Label htmlFor="pi-ein">EIN (Tax ID) *</Label>
              <Input
                id="pi-ein"
                value={data.ein || ""}
                onChange={(e) => update("ein", e.target.value)}
                placeholder="XX-XXXXXXX"
                maxLength={10}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pi-formationState">State of Formation *</Label>
              <Select
                value={data.formation_state || ""}
                onValueChange={(val) => update("formation_state", val)}
                disabled={disabled}
              >
                <SelectTrigger id="pi-formationState">
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
              <Label htmlFor="pi-formationDate">Date of Formation</Label>
              <Input
                id="pi-formationDate"
                type="date"
                value={data.formation_date || ""}
                onChange={(e) => update("formation_date", e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Authorized Representative */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Authorized Representative</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pi-signerName">Full Name *</Label>
                <Input
                  id="pi-signerName"
                  value={data.signer_name || ""}
                  onChange={(e) => update("signer_name", e.target.value)}
                  placeholder="John Smith"
                  disabled={disabled}
                />
              </div>
              <div>
                <Label htmlFor="pi-signerTitle">Title *</Label>
                <Input
                  id="pi-signerTitle"
                  value={data.signer_title || ""}
                  onChange={(e) => update("signer_title", e.target.value)}
                  placeholder="Managing Member"
                  disabled={disabled}
                />
              </div>
              <div>
                <Label htmlFor="pi-phone">Phone</Label>
                <Input
                  id="pi-phone"
                  type="tel"
                  value={data.phone || ""}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                  disabled={disabled}
                />
              </div>
              <div>
                <Label htmlFor="pi-email">Email</Label>
                <Input
                  id="pi-email"
                  type="email"
                  value={email || data.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Trust ───
  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="w-5 h-5 text-teal-600" />
          Trust Information
        </CardTitle>
        <CardDescription>
          Please provide the trust&apos;s legal information.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-0">
        <div>
          <Label htmlFor="pi-trustName">Trust Name *</Label>
          <Input
            id="pi-trustName"
            value={data.trust_name || ""}
            onChange={(e) => update("trust_name", e.target.value)}
            placeholder="The Smith Family Trust"
            disabled={disabled}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pi-trustType">Trust Type *</Label>
            <Select
              value={data.trust_type || ""}
              onValueChange={(val) => update("trust_type", val)}
              disabled={disabled}
            >
              <SelectTrigger id="pi-trustType">
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
            <Label htmlFor="pi-trustDate">Date Executed *</Label>
            <Input
              id="pi-trustDate"
              type="date"
              value={data.trust_date || ""}
              onChange={(e) => update("trust_date", e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="pi-trustEin">Trust EIN (if assigned)</Label>
          <Input
            id="pi-trustEin"
            value={data.trust_ein || ""}
            onChange={(e) => update("trust_ein", e.target.value)}
            placeholder="XX-XXXXXXX"
            disabled={disabled}
          />
        </div>

        {/* Trustee Information */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Trustee Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pi-signerName">Trustee Name *</Label>
              <Input
                id="pi-signerName"
                value={data.signer_name || ""}
                onChange={(e) => update("signer_name", e.target.value)}
                placeholder="John Smith"
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor="pi-signerTitle">Title / Capacity *</Label>
              <Input
                id="pi-signerTitle"
                value={data.signer_title || ""}
                onChange={(e) => update("signer_title", e.target.value)}
                placeholder="Trustee"
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor="pi-phone">Phone</Label>
              <Input
                id="pi-phone"
                type="tel"
                value={data.phone || ""}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(555) 123-4567"
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor="pi-email">Email</Label>
              <Input
                id="pi-email"
                type="email"
                value={email || data.email || ""}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
