"use client";

import { StepCard, YesNoQuestion, YesNoUnknownQuestion, ExemptionAlert } from "../shared";
import { YesNo, YesNoUnknown } from "../types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, AlertCircle } from "lucide-react";

interface FinancingStepProps {
  isNonFinanced: YesNo;
  lenderHasAml: YesNoUnknown;
  onChange: (field: "isNonFinanced" | "lenderHasAml", value: string) => void;
}

export function FinancingStep({
  isNonFinanced,
  lenderHasAml,
  onChange,
}: FinancingStepProps) {
  const showLenderQuestion = isNonFinanced === "no";
  
  // ONLY exempt if lender definitively HAS AML
  // "unknown" is NOT an exemption - we warn and proceed
  const isExempt = isNonFinanced === "no" && lenderHasAml === "yes";
  const isUnknownAml = isNonFinanced === "no" && lenderHasAml === "unknown";
  
  return (
    <StepCard
      title="Financing"
      description="FinCEN reporting applies to non-financed transfers, or transfers where the lender doesn't have an AML program."
    >
      <div className="space-y-6">
        <YesNoQuestion
          question="Is this a non-financed (cash) transfer?"
          description="A transfer without any loan secured by the property from a financial institution"
          value={isNonFinanced}
          onChange={(v) => onChange("isNonFinanced", v)}
          yesLabel="Yes — Cash/No Lender"
          noLabel="No — Has Lender"
        />
        
        {showLenderQuestion && (
          <div className="border-l-2 border-muted pl-4 ml-2 space-y-4">
            <YesNoUnknownQuestion
              question="Does the lender have an AML/SAR program?"
              description="Banks and most regulated financial institutions have AML programs"
              value={lenderHasAml}
              onChange={(v) => onChange("lenderHasAml", v)}
            />
            
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Tip:</strong> Banks, credit unions, and most mortgage companies have AML programs. 
                Hard money lenders and private lenders typically do not.
              </AlertDescription>
            </Alert>
          </div>
        )}
        
        {/* EXEMPT: Lender definitively has AML */}
        {isExempt && (
          <ExemptionAlert
            type="exempt"
            description="When a lender with an AML program finances the purchase, the lender handles FinCEN reporting. No separate report is required."
          />
        )}
        
        {/* WARNING: AML status unknown - NOT an exemption */}
        {isUnknownAml && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Verify Lender AML Coverage</AlertTitle>
            <AlertDescription className="text-amber-700">
              You indicated the lender&apos;s AML/SAR status is unknown. We recommend confirming 
              with the lender before proceeding. 
              <br /><br />
              <strong>If the lender has an AML program:</strong> No FinCEN report is required.
              <br />
              <strong>If the lender does NOT have an AML program:</strong> The transaction may be reportable.
              <br /><br />
              <em>Proceeding assumes the lender does NOT have AML coverage.</em>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </StepCard>
  );
}
