"use client";

import { StepCard, ExemptionAlert, YesNoQuestion } from "../shared";
import { YesNo } from "../types";
import { Home, Building } from "lucide-react";

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
        <p className="text-sm font-medium">Is this residential real property?</p>
        <p className="text-sm text-muted-foreground -mt-4">
          Includes: 1-4 family homes, condos, townhomes, co-ops, or land for residential construction
        </p>
        
        {/* 2-column card layout */}
        <div className="grid grid-cols-2 gap-3">
          <label
            className={`flex items-center gap-3 border rounded-lg p-4 cursor-pointer transition hover:bg-muted/50 ${
              isResidential === "yes" ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => onChange("isResidential", "yes")}
          >
            <Home className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <span className="font-medium text-sm">Yes — Residential</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Single-family, condo, townhome, co-op
              </p>
            </div>
          </label>
          
          <label
            className={`flex items-center gap-3 border rounded-lg p-4 cursor-pointer transition hover:bg-muted/50 ${
              isResidential === "no" ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => onChange("isResidential", "no")}
          >
            <Building className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <span className="font-medium text-sm">No — Commercial/Other</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Office, retail, industrial, vacant land
              </p>
            </div>
          </label>
        </div>
        
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
