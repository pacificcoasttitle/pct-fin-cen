"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { StepCard, ExemptionAlert } from "../shared";
import { TRUST_EXEMPTION_OPTIONS } from "../constants";

interface TrustExemptionsStepProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function TrustExemptionsStep({ value, onChange }: TrustExemptionsStepProps) {
  const hasExemption = value.length > 0 && !value.includes("none");
  const hasNone = value.includes("none");
  
  const handleChange = (id: string, checked: boolean) => {
    if (id === "none") {
      onChange(checked ? ["none"] : []);
    } else {
      const newValue = checked
        ? [...value.filter((v) => v !== "none"), id]
        : value.filter((v) => v !== id);
      onChange(newValue);
    }
  };
  
  return (
    <StepCard
      title="Trust Exemption Check"
      description="Certain trust types are exempt from FinCEN reporting."
    >
      <div className="space-y-4">
        <p className="text-sm font-medium">
          Does any of the following apply to this trust?
        </p>
        
        {/* 2-column grid of trust exemption options */}
        <div className="grid grid-cols-2 gap-3">
          {TRUST_EXEMPTION_OPTIONS.map((option) => {
            const isChecked = value.includes(option.id);
            return (
              <label
                key={option.id}
                className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer transition hover:bg-muted/50 ${
                  isChecked ? "border-primary bg-primary/5" : ""
                } ${hasNone ? "opacity-50 pointer-events-none" : ""}`}
              >
                <Checkbox
                  id={option.id}
                  checked={isChecked}
                  onCheckedChange={(checked) => handleChange(option.id, !!checked)}
                  disabled={hasNone}
                  className="mt-0.5"
                />
                <span className="font-medium text-sm">{option.label}</span>
              </label>
            );
          })}
        </div>
        
        {/* Separator */}
        <div className="border-t my-4" />
        
        {/* None of the above — full width, dashed border */}
        <label
          className={`flex items-center gap-3 border-2 border-dashed rounded-lg p-4 cursor-pointer transition hover:bg-muted/50 ${
            hasNone ? "border-primary bg-primary/5" : ""
          } ${hasExemption ? "opacity-50 pointer-events-none" : ""}`}
        >
          <Checkbox
            id="none"
            checked={hasNone}
            onCheckedChange={(checked) => handleChange("none", !!checked)}
            disabled={hasExemption}
          />
          <div>
            <span className="font-medium">None of the above</span>
            <p className="text-xs text-muted-foreground mt-0.5">The trust is not an exempt type</p>
          </div>
        </label>
      </div>
      
      {hasExemption && (
        <div className="mt-6">
          <ExemptionAlert
            type="exempt"
            description="This trust type is exempt from FinCEN residential real estate reporting."
          />
        </div>
      )}
      
      {hasNone && (
        <div className="mt-6">
          <ExemptionAlert
            type="reportable"
            title="FinCEN Report Required"
            description="This trust is not exempt. A FinCEN Real Estate Report will be required for this transaction."
          />
        </div>
      )}
    </StepCard>
  );
}
