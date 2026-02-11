"use client";

import { StepCard, YesNoQuestion, ExemptionAlert } from "../shared";
import { YesNo } from "../types";

interface PropertyTypeStepProps {
  isResidential: YesNo;
  hasIntentToBuild: YesNo;
  onChange: (field: "isResidential" | "hasIntentToBuild", value: "yes" | "no") => void;
}

export function PropertyTypeStep({
  isResidential,
  hasIntentToBuild,
  onChange,
}: PropertyTypeStepProps) {
  const showIntentQuestion = isResidential === "no";
  const isExempt = isResidential === "no" && hasIntentToBuild === "no";
  
  return (
    <StepCard
      title="Property Type"
      description="FinCEN reporting applies only to residential real property."
    >
      <div className="space-y-6">
        <YesNoQuestion
          question="Is this residential real property?"
          description="Includes: 1-4 family homes, condos, townhomes, co-ops, or land for residential construction"
          value={isResidential}
          onChange={(v) => onChange("isResidential", v)}
          yesLabel="Yes — Residential"
          noLabel="No — Commercial/Other"
        />
        
        {showIntentQuestion && (
          <div className="border-l-2 border-muted pl-4 ml-2">
            <YesNoQuestion
              question="Is there an intent to build a 1-4 family residential structure?"
              description="If the land will be developed for residential use, reporting may still apply"
              value={hasIntentToBuild}
              onChange={(v) => onChange("hasIntentToBuild", v)}
            />
          </div>
        )}
        
        {isExempt && (
          <ExemptionAlert
            type="exempt"
            description="Non-residential property with no intent to build residential is exempt from FinCEN reporting."
          />
        )}
      </div>
    </StepCard>
  );
}
