"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { StepCard, ExemptionAlert } from "../shared";
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
        
        {/* 2-column grid of entity exemption options */}
        <div className="grid grid-cols-2 gap-3">
          {ENTITY_EXEMPTION_OPTIONS.map((option) => {
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
                <span className="font-medium text-sm">
                  {"label" in option ? option.label : ""}
                </span>
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
            <p className="text-xs text-muted-foreground mt-0.5">The buyer is not an exempt entity type</p>
          </div>
        </label>
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
