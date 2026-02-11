"use client";

import { StepCard, CheckboxList, ExemptionAlert } from "../shared";
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
        
        <CheckboxList
          options={TRUST_EXEMPTION_OPTIONS}
          value={value.filter((v) => v !== "none")}
          onChange={handleChange}
          disabled={hasNone}
        />
        
        <div className="border-t pt-4 mt-4">
          <CheckboxList
            options={[{
              id: "none",
              label: "None of the above",
              description: "The trust is not an exempt type"
            }]}
            value={hasNone ? ["none"] : []}
            onChange={handleChange}
            disabled={hasExemption}
          />
        </div>
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
