"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { StepCard, ExemptionAlert } from "../shared";
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
        
        {/* 2-column grid of exemption options */}
        <div className="grid grid-cols-2 gap-3">
          {TRANSFER_EXEMPTION_OPTIONS.map((option) => {
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
                <div>
                  <span className="font-medium text-sm">{option.label}</span>
                  {option.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                  )}
                </div>
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
            <span className="font-medium">None of the above apply</span>
            <p className="text-xs text-muted-foreground mt-0.5">This transfer does not fall under any exemption category</p>
          </div>
        </label>
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
