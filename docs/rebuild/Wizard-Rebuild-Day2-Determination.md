# 🦈 Wizard Rebuild — Day 2: Determination Phase

## Mission
Build the 7 determination step components. These implement the FinCEN decision tree.

**Prerequisites:** Day 1 complete (shared components, hooks, types all working).

---

## Architecture Context

### FinCEN Decision Tree (This is the law)

```
Step 0: Transaction Reference → Property, Escrow #, Price, Closing Date (ALWAYS)
                             ↓
Step 1: Transfer Exemptions → ANY checked (except "none") = EXEMPT
                           ↓ "none" checked
Step 2: Residential? → NO + no intent to build = EXEMPT
                    ↓ YES (or intent to build)
Step 3: Non-financed? → NO + lender has AML = EXEMPT
                     ↓ YES (or lender no/unknown AML)
Step 4: Buyer Type → INDIVIDUAL = EXEMPT (immediate, no questions)
                  ↓ ENTITY or TRUST
Step 5: Entity Exemptions → ANY checked = EXEMPT
        (also for statutory trusts)
                          ↓ "none" checked = REPORTABLE
Step 6: Trust Exemptions → ANY checked = EXEMPT
        (regular trusts only)
                        ↓ "none" checked = REPORTABLE
Step 7: Result → Show outcome, next action
```

**NOTE:** Step 0 (Transaction Reference) is built in Day 1 as a shared component.
It's used in WizardContainer (Day 4). Day 2 focuses on Steps 1-7.

### Data Output (Must Match)

Each step updates `wizard_data.determination`:

```typescript
determination: {
  transferExemptions: string[],     // Step 1
  isResidential: "yes" | "no",      // Step 2
  hasIntentToBuild: "yes" | "no",   // Step 2 (conditional)
  isNonFinanced: "yes" | "no",      // Step 3
  lenderHasAml: "yes" | "no" | "unknown",  // Step 3 (conditional)
  buyerType: "individual" | "entity" | "trust",  // Step 4
  isStatutoryTrust: boolean,        // Step 4 (conditional)
  entityExemptions: string[],       // Step 5
  trustExemptions: string[],        // Step 6
}
```

---

## File Structure

```
web/components/wizard/
├── determination/
│   ├── index.ts
│   ├── TransferExemptionsStep.tsx    # Step 1
│   ├── PropertyTypeStep.tsx          # Step 2
│   ├── FinancingStep.tsx             # Step 3
│   ├── BuyerTypeStep.tsx             # Step 4
│   ├── EntityExemptionsStep.tsx      # Step 5
│   ├── TrustExemptionsStep.tsx       # Step 6
│   └── DeterminationResultStep.tsx   # Step 7
```

---

## Step 1: TransferExemptionsStep.tsx

```tsx
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
```

---

## Step 2: PropertyTypeStep.tsx

```tsx
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
```

---

## Step 3: FinancingStep.tsx

```tsx
"use client";

import { StepCard, YesNoQuestion, YesNoUnknownQuestion, ExemptionAlert } from "../shared";
import { YesNo, YesNoUnknown } from "../types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

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
  const isExempt = isNonFinanced === "no" && lenderHasAml === "yes";
  
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
        
        {isExempt && (
          <ExemptionAlert
            type="exempt"
            description="When a lender with an AML program finances the purchase, the lender handles FinCEN reporting. No separate report is required."
          />
        )}
      </div>
    </StepCard>
  );
}
```

---

## Step 4: BuyerTypeStep.tsx

```tsx
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
```

---

## Step 5: EntityExemptionsStep.tsx

```tsx
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
```

---

## Step 6: TrustExemptionsStep.tsx

```tsx
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
```

---

## Step 7: DeterminationResultStep.tsx

```tsx
"use client";

import { useRouter } from "next/navigation";
import { StepCard } from "../shared";
import { DeterminationState, DeterminationResult } from "../types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  FileText,
  Home 
} from "lucide-react";
import { triggerDetermination } from "@/lib/api";
import { useState } from "react";

interface DeterminationResultStepProps {
  determination: DeterminationState;
  determinationResult: DeterminationResult | null;
  reportId: string;
  onBeginCollection: () => void;
}

export function DeterminationResultStep({
  determination,
  determinationResult,
  reportId,
  onBeginCollection,
}: DeterminationResultStepProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  if (!determinationResult) {
    return (
      <StepCard
        title="Determination"
        description="Complete the previous steps to see the result."
      >
        <div className="text-center py-8 text-muted-foreground">
          Please answer all required questions.
        </div>
      </StepCard>
    );
  }
  
  const { isReportable, reason } = determinationResult;
  
  const handleBeginCollection = async () => {
    setIsLoading(true);
    try {
      // Trigger backend to set status
      await triggerDetermination(reportId);
      onBeginCollection();
    } catch (error) {
      console.error("Failed to trigger determination:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleViewCertificate = async () => {
    setIsLoading(true);
    try {
      // Trigger backend to set exempt status
      await triggerDetermination(reportId);
      // Navigate to certificate or show modal
      router.push(`/app/reports/${reportId}/certificate`);
    } catch (error) {
      console.error("Failed:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isReportable) {
    return (
      <StepCard title="Determination Complete">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
              <FileText className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          
          <div>
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
              FinCEN Report Required
            </Badge>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold">This transaction requires a FinCEN report</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              {reason}
            </p>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4 text-left max-w-md mx-auto">
            <p className="text-sm text-muted-foreground">
              <strong>Next steps:</strong> You'll need to collect information from 
              the buyer and seller(s) to complete the FinCEN Real Estate Report. 
              Reports must be filed within 30 days of closing.
            </p>
          </div>
          
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push("/app/requests")}
            >
              <Home className="h-4 w-4 mr-2" />
              Back to Requests
            </Button>
            <Button 
              onClick={handleBeginCollection}
              disabled={isLoading}
            >
              Begin Data Collection
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </StepCard>
    );
  }
  
  // EXEMPT
  return (
    <StepCard title="Determination Complete">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div>
          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
            No Report Required
          </Badge>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold">This transaction is exempt</h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            {reason}
          </p>
        </div>
        
        <div className="bg-muted/50 rounded-lg p-4 text-left max-w-md mx-auto">
          <p className="text-sm text-muted-foreground">
            No FinCEN Real Estate Report is required for this transaction. 
            You can download an exemption certificate for your records.
          </p>
        </div>
        
        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push("/app/requests")}
          >
            <Home className="h-4 w-4 mr-2" />
            Back to Requests
          </Button>
          <Button 
            variant="secondary"
            onClick={handleViewCertificate}
            disabled={isLoading}
          >
            <FileText className="h-4 w-4 mr-2" />
            View Certificate
          </Button>
        </div>
      </div>
    </StepCard>
  );
}
```

---

## Step 8: Create Index Export

### File: `web/components/wizard/determination/index.ts`

```typescript
export { TransferExemptionsStep } from "./TransferExemptionsStep";
export { PropertyTypeStep } from "./PropertyTypeStep";
export { FinancingStep } from "./FinancingStep";
export { BuyerTypeStep } from "./BuyerTypeStep";
export { EntityExemptionsStep } from "./EntityExemptionsStep";
export { TrustExemptionsStep } from "./TrustExemptionsStep";
export { DeterminationResultStep } from "./DeterminationResultStep";
```

---

## Step 9: Update Main Index

### File: `web/components/wizard/index.ts` (update)

```typescript
// Types
export * from "./types";

// Constants
export * from "./constants";

// Shared components
export * from "./shared";

// Hooks
export * from "./hooks";

// Determination steps
export * from "./determination";

// Collection steps (Day 3)
// export * from "./collection";
```

---

## Testing Checklist (Day 2)

### 1. TypeScript Compiles
```bash
cd web && npx tsc --noEmit
```

### 2. Each Step Renders

Create a test page or use each component:

```tsx
import { 
  TransferExemptionsStep,
  PropertyTypeStep,
  FinancingStep,
  BuyerTypeStep,
  EntityExemptionsStep,
  TrustExemptionsStep,
  DeterminationResultStep,
} from "@/components/wizard";

// Render each with test props
```

### 3. Decision Flow Tests

Test these scenarios manually or with a test component:

| Scenario | Steps Shown | Result |
|----------|-------------|--------|
| Select "1031 Exchange" in Step 1 | 1 → 7 | EXEMPT |
| Residential = No, Intent = No | 1 → 2 → 7 | EXEMPT |
| Non-financed = No, Lender AML = Yes | 1 → 2 → 3 → 7 | EXEMPT |
| Buyer = Individual | 1 → 2 → 3 → 4 → 7 | EXEMPT |
| Entity, select "Bank" | 1 → 2 → 3 → 4 → 5 → 7 | EXEMPT |
| Entity, select "None" | 1 → 2 → 3 → 4 → 5 → 7 | REPORTABLE |
| Trust (statutory), select "None" | 1 → 2 → 3 → 4 → 5 → 7 | REPORTABLE |
| Trust (regular), select "None" | 1 → 2 → 3 → 4 → 6 → 7 | REPORTABLE |

### 4. Checkbox Logic

- [ ] Selecting "None" disables other options
- [ ] Selecting any exemption disables "None"
- [ ] Can toggle selections on/off

### 5. Styling Matches App

- [ ] Cards match existing app cards
- [ ] Buttons match existing buttons
- [ ] Colors consistent with design system
- [ ] No V0 artifacts

---

## Success Criteria

✅ All 7 determination steps created  
✅ TypeScript compiles  
✅ All 8 test scenarios produce correct results  
✅ Checkbox mutual exclusion works  
✅ Styling matches app design  

---

## DO NOT

- ❌ Touch old `rrer-questionnaire.tsx`
- ❌ Modify collection steps yet
- ❌ Proceed to Day 3 until all tests pass

---

## Next: Day 3

Once Day 2 passes all tests, proceed to Day 3 where we build the 5 collection step components.
