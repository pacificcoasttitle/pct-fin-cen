"use client";

import { StepCard, YesNoQuestion, ExemptionAlert } from "../shared";
import { BuyerType } from "../types";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Building2, User, Scale } from "lucide-react";

interface BuyerTypeStepProps {
  buyerType: BuyerType;
  isStatutoryTrust: boolean | null;
  onChange: (field: "buyerType" | "isStatutoryTrust", value: any) => void;
}

export function BuyerTypeStep({
  buyerType,
  isStatutoryTrust,
  onChange,
}: BuyerTypeStepProps) {
  const isIndividualExempt = buyerType === "individual";
  const showStatutoryQuestion = buyerType === "trust";
  
  return (
    <StepCard
      title="Buyer (Transferee) Type"
      description="FinCEN reporting applies only when the buyer is a legal entity or trust, not an individual."
    >
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium mb-4">Who is the buyer?</p>
          
          <RadioGroup
            value={buyerType || undefined}
            onValueChange={(v) => {
              onChange("buyerType", v as BuyerType);
              // Reset statutory trust when changing buyer type
              if (v !== "trust") {
                onChange("isStatutoryTrust", null);
              }
            }}
            className="grid gap-4"
          >
            {/* Individual */}
            <Label
              htmlFor="individual"
              className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors
                ${buyerType === "individual" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
            >
              <RadioGroupItem value="individual" id="individual" />
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Individual</p>
                <p className="text-sm text-muted-foreground">
                  A natural person buying the property
                </p>
              </div>
            </Label>
            
            {/* Entity */}
            <Label
              htmlFor="entity"
              className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors
                ${buyerType === "entity" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
            >
              <RadioGroupItem value="entity" id="entity" />
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Legal Entity</p>
                <p className="text-sm text-muted-foreground">
                  LLC, Corporation, Partnership, etc.
                </p>
              </div>
            </Label>
            
            {/* Trust */}
            <Label
              htmlFor="trust"
              className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors
                ${buyerType === "trust" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
            >
              <RadioGroupItem value="trust" id="trust" />
              <Scale className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Trust</p>
                <p className="text-sm text-muted-foreground">
                  Living trust, land trust, Delaware Statutory Trust, etc.
                </p>
              </div>
            </Label>
          </RadioGroup>
        </div>
        
        {/* Individual = IMMEDIATE EXEMPT */}
        {isIndividualExempt && (
          <ExemptionAlert
            type="exempt"
            description="Individual buyers are not subject to FinCEN residential real estate reporting. No report is required."
          />
        )}
        
        {/* Trust: Ask if statutory */}
        {showStatutoryQuestion && (
          <div className="border-l-2 border-muted pl-4 ml-2">
            <YesNoQuestion
              question="Is this a statutory trust (e.g., Delaware Statutory Trust)?"
              description="Statutory trusts are treated as entities under FinCEN rules"
              value={isStatutoryTrust === true ? "yes" : isStatutoryTrust === false ? "no" : null}
              onChange={(v) => onChange("isStatutoryTrust", v === "yes")}
            />
          </div>
        )}
      </div>
    </StepCard>
  );
}
