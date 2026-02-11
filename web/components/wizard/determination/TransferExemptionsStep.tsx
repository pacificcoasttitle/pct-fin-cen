"use client";

import { StepCard, CheckboxList, ExemptionAlert } from "../shared";
import { TRANSFER_EXEMPTION_OPTIONS } from "../constants";

interface TransferExemptionsStepProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function TransferExemptionsStep({ 
  value, 
  onChange 
}: TransferExemptionsStepProps) {
  // Check states
  const hasExemption = value.length > 0 && !value.includes("none");
  const hasNone = value.includes("none");
  
  const handleChange = (id: string, checked: boolean) => {
    if (id === "none") {
      // "None" clears all other selections
      onChange(checked ? ["none"] : []);
    } else {
      // Selecting any exemption clears "none"
      const newValue = checked
        ? [...value.filter((v) => v !== "none"), id]
        : value.filter((v) => v !== id);
      onChange(newValue);
    }
  };
  
  return (
    <StepCard
      title="Transfer Type Check"
      description="Before we proceed, we need to check if this transfer qualifies for an exemption under FinCEN rules."
    >
      <div className="space-y-4">
        <p className="text-sm font-medium">
          Does any of the following apply to this transfer?
        </p>
        
        <CheckboxList
          options={TRANSFER_EXEMPTION_OPTIONS}
          value={value.filter((v) => v !== "none")}
          onChange={handleChange}
          disabled={hasNone}
        />
        
        <div className="border-t pt-4 mt-4">
          <CheckboxList
            options={[{ 
              id: "none", 
              label: "None of the above apply",
              description: "This transfer does not fall under any exemption category"
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
            description="Based on your selection, this transfer is exempt from FinCEN reporting requirements. No report will be filed."
          />
        </div>
      )}
    </StepCard>
  );
}
