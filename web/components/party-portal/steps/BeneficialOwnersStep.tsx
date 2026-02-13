"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Plus, AlertTriangle } from "lucide-react";
import { BeneficialOwnerCard, createEmptyBeneficialOwner } from "../BeneficialOwnerCard";
import { type PartySubmissionData, type BeneficialOwnerData } from "../types";

interface BeneficialOwnersStepProps {
  data: Partial<PartySubmissionData>;
  onChange: (data: Partial<PartySubmissionData>) => void;
  disabled?: boolean;
}

export function BeneficialOwnersStep({ data, onChange, disabled }: BeneficialOwnersStepProps) {
  const beneficialOwners = data.beneficial_owners || [];

  const addOwner = () => {
    onChange({
      ...data,
      beneficial_owners: [...beneficialOwners, createEmptyBeneficialOwner()],
    });
  };

  const updateOwner = (index: number, updated: BeneficialOwnerData) => {
    const newOwners = [...beneficialOwners];
    newOwners[index] = updated;
    onChange({ ...data, beneficial_owners: newOwners });
  };

  const removeOwner = (index: number) => {
    const newOwners = beneficialOwners.filter((_, i) => i !== index);
    onChange({ ...data, beneficial_owners: newOwners });
  };

  // Compute total ownership percentage
  const totalPercentage = beneficialOwners.reduce(
    (sum, bo) => sum + (bo.ownership_percentage || 0),
    0
  );

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-teal-600" />
          Beneficial Owners
        </CardTitle>
        <CardDescription>
          FinCEN requires information about individuals who own 25% or more
          of the purchasing entity, or who exercise substantial control over it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-0">
        {/* Validation warning */}
        {beneficialOwners.length === 0 && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">At least one beneficial owner is required</p>
              <p>
                Please add information for each individual who owns 25% or more
                of the entity, or who exercises substantial control.
              </p>
            </div>
          </div>
        )}

        {/* BO Cards */}
        <div className="space-y-4">
          {beneficialOwners.map((bo, index) => (
            <BeneficialOwnerCard
              key={bo.id}
              index={index}
              data={bo}
              onChange={(updated) => updateOwner(index, updated)}
              onRemove={() => removeOwner(index)}
              disabled={disabled}
              canRemove={beneficialOwners.length > 1}
              parentEntityType="entity"
            />
          ))}
        </div>

        {/* Ownership percentage summary */}
        {beneficialOwners.length > 0 && (
          <div className={`p-3 rounded-lg text-sm font-medium ${
            totalPercentage > 100
              ? "bg-red-50 text-red-700 border border-red-200"
              : totalPercentage >= 25
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-gray-50 text-gray-600 border border-gray-200"
          }`}>
            Total ownership reported: {totalPercentage}%
            {totalPercentage > 100 && " — exceeds 100%"}
          </div>
        )}

        {/* Add button */}
        <Button
          type="button"
          variant="outline"
          onClick={addOwner}
          disabled={disabled}
          className="w-full border-dashed border-2 h-12 text-muted-foreground hover:text-foreground hover:border-teal-400"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Beneficial Owner
        </Button>
      </CardContent>
    </Card>
  );
}
