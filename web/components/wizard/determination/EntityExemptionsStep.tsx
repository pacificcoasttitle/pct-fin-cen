"use client";

import { StepCard, CheckboxList, ExemptionAlert } from "../shared";
import { ENTITY_EXEMPTION_OPTIONS } from "../constants";

interface EntityExemptionsStepProps {
  value: string[];
  onChange: (value: string[]) => void;
  isStatutoryTrust?: boolean;
}

export function EntityExemptionsStep({ 
  value, 
  onChange,
  isStatutoryTrust = false,
}: EntityExemptionsStepProps) {
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
  
  const title = isStatutoryTrust 
    ? "Statutory Trust Exemption Check" 
    : "Entity Exemption Check";
  
  const description = isStatutoryTrust
    ? "Statutory trusts are treated as entities. Check if the trust qualifies for any exemption."
    : "Certain entity types are exempt from FinCEN reporting.";
  
  return (
    <StepCard title={title} description={description}>
      <div className="space-y-4">
        <p className="text-sm font-medium">
          Is the buyer any of the following exempt entity types?
        </p>
        
        <div className="max-h-[400px] overflow-y-auto pr-2">
          <CheckboxList
            options={ENTITY_EXEMPTION_OPTIONS}
            value={value.filter((v) => v !== "none")}
            onChange={handleChange}
            disabled={hasNone}
          />
        </div>
        
        <div className="border-t pt-4 mt-4">
          <CheckboxList
            options={[{
              id: "none",
              label: "None of the above",
              description: "The buyer is not an exempt entity type"
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
            description="This entity type is exempt from FinCEN residential real estate reporting."
          />
        </div>
      )}
      
      {hasNone && (
        <div className="mt-6">
          <ExemptionAlert
            type="reportable"
            title="FinCEN Report Required"
            description="This entity is not exempt. A FinCEN Real Estate Report will be required for this transaction."
          />
        </div>
      )}
    </StepCard>
  );
}
