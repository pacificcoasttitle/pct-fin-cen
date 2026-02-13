"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Plus, AlertTriangle, Trash2 } from "lucide-react";
import { TrusteeCard, createEmptyTrustee } from "../TrusteeCard";
import {
  type PartySubmissionData,
  type TrusteeData,
  type SettlorData,
  type BeneficiaryData,
} from "../types";

interface TrusteesStepProps {
  data: Partial<PartySubmissionData>;
  onChange: (data: Partial<PartySubmissionData>) => void;
  disabled?: boolean;
}

// Helpers
function createEmptySettlor(): SettlorData {
  return {
    id: crypto.randomUUID(),
    full_name: "",
    is_beneficiary: false,
  };
}

function createEmptyBeneficiary(): BeneficiaryData {
  return {
    id: crypto.randomUUID(),
    full_name: "",
  };
}

export function TrusteesStep({ data, onChange, disabled }: TrusteesStepProps) {
  const trustees = data.trustees || [];
  const settlors = data.settlors || [];
  const beneficiaries = data.beneficiaries || [];

  // ─── Trustees ───
  const addTrustee = () => {
    onChange({ ...data, trustees: [...trustees, createEmptyTrustee()] });
  };

  const updateTrustee = (index: number, updated: TrusteeData) => {
    const newTrustees = [...trustees];
    newTrustees[index] = updated;
    onChange({ ...data, trustees: newTrustees });
  };

  const removeTrustee = (index: number) => {
    onChange({ ...data, trustees: trustees.filter((_, i) => i !== index) });
  };

  // ─── Settlors ───
  const addSettlor = () => {
    onChange({ ...data, settlors: [...settlors, createEmptySettlor()] });
  };

  const updateSettlor = (index: number, field: keyof SettlorData, value: any) => {
    const newSettlors = [...settlors];
    newSettlors[index] = { ...newSettlors[index], [field]: value };
    onChange({ ...data, settlors: newSettlors });
  };

  const removeSettlor = (index: number) => {
    onChange({ ...data, settlors: settlors.filter((_, i) => i !== index) });
  };

  // ─── Beneficiaries ───
  const addBeneficiary = () => {
    onChange({ ...data, beneficiaries: [...beneficiaries, createEmptyBeneficiary()] });
  };

  const updateBeneficiary = (index: number, field: keyof BeneficiaryData, value: any) => {
    const newBeneficiaries = [...beneficiaries];
    newBeneficiaries[index] = { ...newBeneficiaries[index], [field]: value };
    onChange({ ...data, beneficiaries: newBeneficiaries });
  };

  const removeBeneficiary = (index: number) => {
    onChange({ ...data, beneficiaries: beneficiaries.filter((_, i) => i !== index) });
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-teal-600" />
          Trust Parties
        </CardTitle>
        <CardDescription>
          Please provide information about each trustee of the trust,
          as well as the settlor(s) and beneficiary(ies).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 px-0">
        {/* ═══ SECTION 1: Trustees ═══ */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Trustees</h3>
          <p className="text-sm text-gray-500 mb-4">
            Add all individuals or entities serving as trustees.
          </p>

          {trustees.length === 0 && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                At least one trustee is required for FinCEN reporting.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {trustees.map((trustee, index) => (
              <TrusteeCard
                key={trustee.id}
                trustee={trustee}
                index={index}
                canDelete={trustees.length > 1}
                onChange={(updated) => updateTrustee(index, updated)}
                onDelete={() => removeTrustee(index)}
                disabled={disabled}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addTrustee}
            disabled={disabled}
            className="w-full mt-4 border-dashed border-2 h-11 text-muted-foreground hover:text-foreground hover:border-purple-400"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Trustee
          </Button>
        </div>

        {/* ═══ SECTION 2: Settlors / Grantors ═══ */}
        <div className="pt-6 border-t">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Settlors / Grantors</h3>
          <p className="text-sm text-gray-500 mb-4">
            The person(s) who created or funded the trust.
          </p>

          <div className="space-y-3">
            {settlors.map((settlor, index) => (
              <div key={settlor.id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border">
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Full Name *</Label>
                      <Input
                        value={settlor.full_name || ""}
                        onChange={(e) => updateSettlor(index, "full_name", e.target.value)}
                        placeholder="Full legal name"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <Label>Relationship</Label>
                      <Input
                        value={settlor.relationship || ""}
                        onChange={(e) => updateSettlor(index, "relationship", e.target.value)}
                        placeholder="e.g., Grantor, Creator"
                        disabled={disabled}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`settlor-ben-${settlor.id}`}
                      checked={settlor.is_beneficiary || false}
                      onCheckedChange={(checked) =>
                        updateSettlor(index, "is_beneficiary", checked === true)
                      }
                      disabled={disabled}
                    />
                    <label htmlFor={`settlor-ben-${settlor.id}`} className="text-sm cursor-pointer">
                      This person is also a beneficiary
                    </label>
                  </div>
                </div>
                {settlors.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSettlor(index)}
                    disabled={disabled}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addSettlor}
            disabled={disabled}
            className="w-full mt-3 border-dashed border-2 h-10 text-sm text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Settlor / Grantor
          </Button>
        </div>

        {/* ═══ SECTION 3: Beneficiaries ═══ */}
        <div className="pt-6 border-t">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Beneficiaries</h3>
          <p className="text-sm text-gray-500 mb-4">
            Individuals or entities who benefit from the trust. You may enter
            &quot;As described in trust agreement&quot; if there are many.
          </p>

          <div className="space-y-3">
            {beneficiaries.map((ben, index) => (
              <div key={ben.id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border">
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Full Name *</Label>
                      <Input
                        value={ben.full_name || ""}
                        onChange={(e) => updateBeneficiary(index, "full_name", e.target.value)}
                        placeholder="Beneficiary name or 'As described in trust agreement'"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <Label>Nature of Interest</Label>
                      <Input
                        value={ben.interest_nature || ""}
                        onChange={(e) => updateBeneficiary(index, "interest_nature", e.target.value)}
                        placeholder="e.g., Income beneficiary, Remainder"
                        disabled={disabled}
                      />
                    </div>
                  </div>
                </div>
                {beneficiaries.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBeneficiary(index)}
                    disabled={disabled}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addBeneficiary}
            disabled={disabled}
            className="w-full mt-3 border-dashed border-2 h-10 text-sm text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Beneficiary
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
