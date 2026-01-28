"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Users,
  DollarSign,
  Plus,
  Trash2,
} from "lucide-react";

import { AddressFields } from "./AddressFields";
import { TrusteeCard, createEmptyTrustee } from "./TrusteeCard";
import { PaymentSourceCard, createEmptyPaymentSource } from "./PaymentSourceCard";
import { CertificationSection, CERTIFICATION_TEXTS } from "./CertificationSection";
import {
  PartySubmissionData,
  TrusteeData,
  SettlorData,
  BeneficiaryData,
  PaymentSourceData,
  AddressData,
  TRUST_TYPES,
  US_STATES,
} from "./types";

interface BuyerTrustFormProps {
  data: Partial<PartySubmissionData>;
  onChange: (data: Partial<PartySubmissionData>) => void;
  purchasePrice?: number;
  disabled?: boolean;
}

const emptyAddress: AddressData = {
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "United States",
};

export function BuyerTrustForm({
  data,
  onChange,
  purchasePrice = 0,
  disabled = false,
}: BuyerTrustFormProps) {
  const updateField = <K extends keyof PartySubmissionData>(field: K, value: PartySubmissionData[K]) => {
    onChange({ ...data, [field]: value });
  };

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // =========================================================================
  // TRUSTEES
  // =========================================================================

  const trustees = data.trustees || [];

  const addTrustee = () => {
    updateField("trustees", [...trustees, createEmptyTrustee()]);
  };

  const updateTrustee = (index: number, updated: TrusteeData) => {
    const newTrustees = [...trustees];
    newTrustees[index] = updated;
    updateField("trustees", newTrustees);
  };

  const removeTrustee = (index: number) => {
    updateField(
      "trustees",
      trustees.filter((_, i) => i !== index)
    );
  };

  // =========================================================================
  // SETTLORS
  // =========================================================================

  const settlors = data.settlors || [];

  const addSettlor = () => {
    const newSettlor: SettlorData = {
      id: crypto.randomUUID(),
      full_name: "",
      is_beneficiary: false,
    };
    updateField("settlors", [...settlors, newSettlor]);
  };

  const updateSettlor = (index: number, field: string, value: any) => {
    const newSettlors = [...settlors];
    newSettlors[index] = { ...newSettlors[index], [field]: value };
    updateField("settlors", newSettlors);
  };

  const removeSettlor = (index: number) => {
    updateField(
      "settlors",
      settlors.filter((_, i) => i !== index)
    );
  };

  // =========================================================================
  // BENEFICIARIES
  // =========================================================================

  const beneficiaries = data.beneficiaries || [];

  const addBeneficiary = () => {
    const newBeneficiary: BeneficiaryData = {
      id: crypto.randomUUID(),
      full_name: "",
    };
    updateField("beneficiaries", [...beneficiaries, newBeneficiary]);
  };

  const updateBeneficiary = (index: number, field: string, value: any) => {
    const newBeneficiaries = [...beneficiaries];
    newBeneficiaries[index] = { ...newBeneficiaries[index], [field]: value };
    updateField("beneficiaries", newBeneficiaries);
  };

  const removeBeneficiary = (index: number) => {
    updateField(
      "beneficiaries",
      beneficiaries.filter((_, i) => i !== index)
    );
  };

  // =========================================================================
  // PAYMENT SOURCES
  // =========================================================================

  const paymentSources = data.payment_sources || [];

  const addPaymentSource = () => {
    updateField("payment_sources", [...paymentSources, createEmptyPaymentSource()]);
  };

  const updatePaymentSource = (index: number, updated: PaymentSourceData) => {
    const newSources = [...paymentSources];
    newSources[index] = updated;
    updateField("payment_sources", newSources);
  };

  const removePaymentSource = (index: number) => {
    updateField(
      "payment_sources",
      paymentSources.filter((_, i) => i !== index)
    );
  };

  const totalPaymentCents = paymentSources.reduce(
    (sum, s) => sum + (s.amount || 0) * 100,
    0
  );
  const purchasePriceCents = purchasePrice * 100;
  const paymentComplete = totalPaymentCents >= purchasePriceCents;

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="space-y-8">
      {/* SECTION 1: TRUST INFORMATION */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-600" />
            Trust Information
          </CardTitle>
          <CardDescription>
            Provide details about the trust that is purchasing this property.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Trust Name *</Label>
            <Input
              value={data.trust_name || ""}
              onChange={(e) => updateField("trust_name", e.target.value)}
              placeholder="The Smith Family Trust"
              disabled={disabled}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Trust Type *</Label>
              <Select
                value={data.trust_type || ""}
                onValueChange={(v) => updateField("trust_type", v)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trust type" />
                </SelectTrigger>
                <SelectContent>
                  {TRUST_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date Established *</Label>
              <Input
                type="date"
                value={data.trust_date || ""}
                onChange={(e) => updateField("trust_date", e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tax ID (EIN or SSN) *</Label>
              <Input
                value={data.trust_ein || ""}
                onChange={(e) => updateField("trust_ein", e.target.value)}
                placeholder="XX-XXXXXXX"
                disabled={disabled}
              />
            </div>
            <div>
              <Label>State of Formation *</Label>
              <Select
                value={data.formation_state || ""}
                onValueChange={(v) => updateField("formation_state", v)}
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
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_revocable"
              checked={data.is_revocable || false}
              onCheckedChange={(checked) =>
                updateField("is_revocable", checked as boolean)
              }
              disabled={disabled}
            />
            <Label htmlFor="is_revocable" className="cursor-pointer">
              This is a revocable trust
            </Label>
          </div>

          <Separator />

          <AddressFields
            value={data.address || emptyAddress}
            onChange={(addr) => updateField("address", addr)}
            required
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {/* SECTION 2: TRUSTEES */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Trustees
              </CardTitle>
              <CardDescription className="mt-1">
                Add all trustees who have authority over this trust.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addTrustee} disabled={disabled}>
              <Plus className="h-4 w-4 mr-1" />
              Add Trustee
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {trustees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No trustees added yet.</p>
              <p className="text-sm">Click "Add Trustee" to begin.</p>
            </div>
          ) : (
            trustees.map((trustee, index) => (
              <TrusteeCard
                key={trustee.id}
                trustee={trustee}
                index={index}
                canDelete={trustees.length > 1}
                onChange={(updated) => updateTrustee(index, updated)}
                onDelete={() => removeTrustee(index)}
                disabled={disabled}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* SECTION 3: SETTLORS/GRANTORS */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Settlors / Grantors
              </CardTitle>
              <CardDescription className="mt-1">
                Identify the person(s) who created and funded this trust.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addSettlor} disabled={disabled}>
              <Plus className="h-4 w-4 mr-1" />
              Add Settlor
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {settlors.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>No settlors added. Click "Add Settlor" if applicable.</p>
            </div>
          ) : (
            settlors.map((settlor, index) => (
              <Card key={settlor.id} className="border-blue-200 bg-blue-50/30">
                <CardContent className="pt-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <Label className="text-base font-medium">Settlor {index + 1}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSettlor(index)}
                      className="text-red-500 hover:text-red-700"
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name *</Label>
                      <Input
                        value={settlor.full_name}
                        onChange={(e) =>
                          updateSettlor(index, "full_name", e.target.value)
                        }
                        placeholder="Full legal name"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <Label>Date of Birth</Label>
                      <Input
                        type="date"
                        value={settlor.date_of_birth || ""}
                        onChange={(e) =>
                          updateSettlor(index, "date_of_birth", e.target.value)
                        }
                        disabled={disabled}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Relationship to Trust</Label>
                    <Input
                      value={settlor.relationship || ""}
                      onChange={(e) =>
                        updateSettlor(index, "relationship", e.target.value)
                      }
                      placeholder="e.g. Grantor, Creator"
                      disabled={disabled}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={settlor.is_beneficiary}
                      onCheckedChange={(checked) =>
                        updateSettlor(index, "is_beneficiary", checked)
                      }
                      disabled={disabled}
                    />
                    <Label className="cursor-pointer">
                      Also a beneficiary of this trust
                    </Label>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* SECTION 4: BENEFICIARIES */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Beneficiaries
              </CardTitle>
              <CardDescription className="mt-1">
                Identify the beneficiaries of this trust.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addBeneficiary} disabled={disabled}>
              <Plus className="h-4 w-4 mr-1" />
              Add Beneficiary
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {beneficiaries.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>No beneficiaries added. Click "Add Beneficiary" if applicable.</p>
            </div>
          ) : (
            beneficiaries.map((beneficiary, index) => (
              <Card key={beneficiary.id} className="border-green-200 bg-green-50/30">
                <CardContent className="pt-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <Label className="text-base font-medium">Beneficiary {index + 1}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBeneficiary(index)}
                      className="text-red-500 hover:text-red-700"
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Name *</Label>
                      <Input
                        value={beneficiary.full_name}
                        onChange={(e) =>
                          updateBeneficiary(index, "full_name", e.target.value)
                        }
                        placeholder="Beneficiary name"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <Label>Interest / Percentage</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={beneficiary.percentage_interest || ""}
                        onChange={(e) =>
                          updateBeneficiary(
                            index,
                            "percentage_interest",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="e.g. 50"
                        disabled={disabled}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Nature of Interest</Label>
                    <Input
                      value={beneficiary.interest_nature || ""}
                      onChange={(e) =>
                        updateBeneficiary(index, "interest_nature", e.target.value)
                      }
                      placeholder="e.g. Income beneficiary, Remainder beneficiary"
                      disabled={disabled}
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* SECTION 5: PAYMENT INFORMATION */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Payment Information
              </CardTitle>
              <CardDescription className="mt-1">
                Provide information about the source(s) of funds for this purchase.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addPaymentSource} disabled={disabled}>
              <Plus className="h-4 w-4 mr-1" />
              Add Payment Source
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Payment Progress */}
          {purchasePrice > 0 && (
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span>Purchase Price:</span>
                <span className="font-semibold">
                  ${purchasePrice.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>Total Documented:</span>
                <span
                  className={`font-semibold ${
                    paymentComplete ? "text-green-600" : "text-amber-600"
                  }`}
                >
                  ${(totalPaymentCents / 100).toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    paymentComplete ? "bg-green-500" : "bg-amber-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      (totalPaymentCents / purchasePriceCents) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
              {!paymentComplete && (
                <p className="text-xs text-amber-600 mt-2">
                  Please document payment sources totaling the full purchase price.
                </p>
              )}
            </div>
          )}

          {paymentSources.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No payment sources added.</p>
              <p className="text-sm">Click "Add Payment Source" to begin.</p>
            </div>
          ) : (
            paymentSources.map((source, index) => (
              <PaymentSourceCard
                key={source.id}
                source={source}
                index={index}
                canDelete={true}
                onChange={(updated) => updatePaymentSource(index, updated)}
                onDelete={() => removePaymentSource(index)}
                disabled={disabled}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* SECTION 6: CERTIFICATION */}
      <CertificationSection
        certified={data.certified || false}
        signature={data.certification_signature || ""}
        date={data.certification_date || today}
        certificationText={CERTIFICATION_TEXTS.buyer_trust}
        onCertifiedChange={(checked) => {
          updateField("certified", checked);
          if (checked) updateField("certification_date", today);
        }}
        onSignatureChange={(sig) => updateField("certification_signature", sig)}
        disabled={disabled}
        entityName={data.trust_name}
      />
    </div>
  );
}
