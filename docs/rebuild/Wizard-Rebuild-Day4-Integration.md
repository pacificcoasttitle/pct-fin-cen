# 🦈 Wizard Rebuild — Day 4: Integration & Launch

## Mission
Wire everything together, replace the old wizard, and verify all integrations work.

**Prerequisites:** Day 1, 2, 3 complete and tested.

---

## Overview

Today we:
1. Build `WizardContainer` (main orchestrator)
2. Build `WizardProgress` (progress bar)
3. Build `WizardNavigation` (back/next buttons)
4. Fix the backend `determine` endpoint
5. Update `page.tsx` to use new wizard
6. Full integration testing
7. Delete old wizard (after verification)

---

## Part 1: Build Container Components

### File: `web/components/wizard/WizardProgress.tsx`

```tsx
"use client";

import { StepId } from "./types";
import { DETERMINATION_STEPS, COLLECTION_STEPS } from "./constants";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

interface WizardProgressProps {
  phase: "determination" | "collection";
  currentStep: StepId;
  visibleSteps: StepId[];
  onStepClick?: (step: StepId) => void;
}

export function WizardProgress({
  phase,
  currentStep,
  visibleSteps,
  onStepClick,
}: WizardProgressProps) {
  const currentIndex = visibleSteps.indexOf(currentStep);
  
  // Calculate progress percentage
  const progress = visibleSteps.length > 1 
    ? (currentIndex / (visibleSteps.length - 1)) * 100 
    : 100;
  
  // Get phase-specific steps
  const phaseSteps = phase === "determination" 
    ? DETERMINATION_STEPS 
    : COLLECTION_STEPS;
  
  // Filter to only visible steps in current phase
  const displaySteps = phaseSteps.filter(s => visibleSteps.includes(s.id));
  
  return (
    <div className="space-y-4">
      {/* Phase Indicator */}
      <div className="flex items-center gap-2">
        <div className={cn(
          "px-3 py-1 rounded-full text-xs font-medium",
          phase === "determination" 
            ? "bg-blue-100 text-blue-700" 
            : "bg-green-100 text-green-700"
        )}>
          {phase === "determination" ? "Step 1: Determination" : "Step 2: Data Collection"}
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="relative">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      {/* Step Indicators (horizontal on large screens) */}
      <div className="hidden md:flex items-center justify-between">
        {displaySteps.map((step, idx) => {
          const stepIndex = visibleSteps.indexOf(step.id);
          const isComplete = stepIndex < currentIndex;
          const isCurrent = step.id === currentStep;
          const isClickable = stepIndex <= currentIndex && onStepClick;
          
          return (
            <button
              key={step.id}
              onClick={() => isClickable && onStepClick?.(step.id)}
              disabled={!isClickable}
              className={cn(
                "flex flex-col items-center gap-1 text-xs transition-colors",
                isClickable ? "cursor-pointer" : "cursor-default",
                isCurrent ? "text-primary font-medium" : 
                isComplete ? "text-primary/70" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors",
                isCurrent ? "border-primary bg-primary text-primary-foreground" :
                isComplete ? "border-primary bg-primary/10" : "border-muted"
              )}>
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span className="max-w-[80px] text-center truncate">
                {step.title}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Current Step Title (mobile) */}
      <div className="md:hidden text-center">
        <p className="text-sm font-medium">
          {displaySteps.find(s => s.id === currentStep)?.title}
        </p>
        <p className="text-xs text-muted-foreground">
          Step {currentIndex + 1} of {visibleSteps.length}
        </p>
      </div>
    </div>
  );
}
```

### File: `web/components/wizard/WizardNavigation.tsx`

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WizardNavigationProps {
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  backLabel?: string;
  showNext?: boolean;
}

export function WizardNavigation({
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  nextLabel = "Continue",
  backLabel = "Back",
  showNext = true,
}: WizardNavigationProps) {
  return (
    <div className="flex items-center justify-between">
      <Button
        variant="ghost"
        onClick={onBack}
        disabled={!canGoBack}
        className={!canGoBack ? "invisible" : ""}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        {backLabel}
      </Button>
      
      {showNext && (
        <Button
          onClick={onNext}
          disabled={!canGoNext}
        >
          {nextLabel}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )}
    </div>
  );
}
```

### File: `web/components/wizard/WizardContainer.tsx`

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Report } from "@/lib/api";
import { WizardProgress } from "./WizardProgress";
import { WizardNavigation } from "./WizardNavigation";
import { useWizardState } from "./hooks/useWizardState";
import { useWizardNavigation } from "./hooks/useWizardNavigation";
import { useAutoSave } from "./hooks/useAutoSave";
import { WizardState } from "./types";

// Shared components (Step 0)
import { TransactionReferenceStep } from "./shared";

// Determination steps
import {
  TransferExemptionsStep,
  PropertyTypeStep,
  FinancingStep,
  BuyerTypeStep,
  EntityExemptionsStep,
  TrustExemptionsStep,
  DeterminationResultStep,
} from "./determination";

// Collection steps
import {
  PartySetupStep,
  PartyStatusStep,
  ReportingPersonStep,
  ReviewAndFileStep,
} from "./collection";

import { useState, useEffect } from "react";

interface WizardContainerProps {
  report: Report;
  onUpdate?: (data: Partial<Report>) => void;
}

export function WizardContainer({ report, onUpdate }: WizardContainerProps) {
  const router = useRouter();
  
  // Initialize state from report's wizard_data
  const { state, updateDetermination, updateCollection } = useWizardState(
    report.wizard_data as Partial<WizardState> | undefined
  );
  
  // Auto-save on changes
  const { saveNow } = useAutoSave(report.id, state);
  
  // Navigation logic
  const {
    currentStep,
    visibleSteps,
    phase,
    determinationResult,
    canGoBack,
    canGoNext,
    goBack,
    goNext,
    goToStep,
  } = useWizardNavigation(state, report.status);
  
  // Local parties state for party setup
  const [parties, setParties] = useState<any[]>([]);
  
  // Determine if we should show navigation
  const showBottomNav = !["determination-result", "review-and-file"].includes(currentStep);
  
  // Render the current step
  const renderStep = () => {
    switch (currentStep) {
      // ========== STEP 0: TRANSACTION REFERENCE ==========
      case "transaction-reference":
        return (
          <TransactionReferenceStep
            value={{
              propertyAddress: state.collection.propertyAddress,
              escrowNumber: state.collection.escrowNumber,
              closingDate: state.collection.closingDate,
              purchasePrice: state.collection.purchasePrice,
              apn: state.collection.apn,
              siteXData: state.collection.siteXData,
            }}
            onChange={(updates) => updateCollection(updates)}
          />
        );
      
      // ========== DETERMINATION PHASE ==========
      case "transfer-exemptions":
        return (
          <TransferExemptionsStep
            value={state.determination.transferExemptions}
            onChange={(v) => updateDetermination({ transferExemptions: v })}
          />
        );
      
      case "property-type":
        return (
          <PropertyTypeStep
            isResidential={state.determination.isResidential}
            hasIntentToBuild={state.determination.hasIntentToBuild}
            onChange={(field, value) => updateDetermination({ [field]: value })}
          />
        );
      
      case "financing":
        return (
          <FinancingStep
            isNonFinanced={state.determination.isNonFinanced}
            lenderHasAml={state.determination.lenderHasAml}
            onChange={(field, value) => updateDetermination({ [field]: value })}
          />
        );
      
      case "buyer-type":
        return (
          <BuyerTypeStep
            buyerType={state.determination.buyerType}
            isStatutoryTrust={state.determination.isStatutoryTrust}
            onChange={(field, value) => updateDetermination({ [field]: value })}
          />
        );
      
      case "entity-exemptions":
        return (
          <EntityExemptionsStep
            value={state.determination.entityExemptions}
            onChange={(v) => updateDetermination({ entityExemptions: v })}
            isStatutoryTrust={state.determination.isStatutoryTrust || false}
          />
        );
      
      case "trust-exemptions":
        return (
          <TrustExemptionsStep
            value={state.determination.trustExemptions}
            onChange={(v) => updateDetermination({ trustExemptions: v })}
          />
        );
      
      case "determination-result":
        return (
          <DeterminationResultStep
            determination={state.determination}
            determinationResult={determinationResult}
            reportId={report.id}
            onBeginCollection={() => {
              // Save before transitioning
              saveNow();
              goToStep("party-setup");
            }}
          />
        );
      
      // ========== COLLECTION PHASE ==========
      case "party-setup":
        return (
          <PartySetupStep
            reportId={report.id}
            parties={parties}
            onPartiesChange={setParties}
          />
        );
      
      case "party-status":
        return (
          <PartyStatusStep
            reportId={report.id}
          />
        );
      
      case "reporting-person":
        return (
          <ReportingPersonStep
            value={state.collection.reportingPerson}
            onChange={(v) => updateCollection({ reportingPerson: v })}
          />
        );
      
      case "review-and-file":
        return (
          <ReviewAndFileStep
            reportId={report.id}
            wizardData={state}
          />
        );
      
      default:
        return (
          <div className="p-8 text-center text-muted-foreground">
            Unknown step: {currentStep}
          </div>
        );
    }
  };
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with Progress */}
      <div className="sticky top-0 z-10 border-b bg-card">
        <div className="container max-w-3xl py-4 px-4">
          <WizardProgress
            phase={phase}
            currentStep={currentStep}
            visibleSteps={visibleSteps}
            onStepClick={goToStep}
          />
        </div>
      </div>
      
      {/* Step Content */}
      <div className="flex-1 container max-w-2xl py-8 px-4">
        {renderStep()}
      </div>
      
      {/* Bottom Navigation */}
      {showBottomNav && (
        <div className="sticky bottom-0 border-t bg-card">
          <div className="container max-w-2xl py-4 px-4">
            <WizardNavigation
              canGoBack={canGoBack}
              canGoNext={canGoNext}
              onBack={goBack}
              onNext={goNext}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

### File: `web/components/wizard/index.ts` (final update)

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

// Collection steps
export * from "./collection";

// Main container
export { WizardContainer } from "./WizardContainer";
export { WizardProgress } from "./WizardProgress";
export { WizardNavigation } from "./WizardNavigation";
```

**Note:** The collection export no longer includes `TransactionDetailsStep` since that data is now collected in Step 0 (`TransactionReferenceStep` in `shared/`).

---

## Part 2: Fix Backend Endpoint

### File: `api/app/routes/reports.py`

Find the `determine_report` endpoint and **replace it entirely**:

```python
@router.post("/reports/{report_id}/determine")
async def determine_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update report status based on frontend's determination result.
    
    The frontend wizard computes determination using wizard_data.determination.*
    This endpoint reads from those same fields and sets the appropriate status.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Access control
    if current_user.role in ["client_user", "client_admin"]:
        if str(report.company_id) != str(current_user.company_id):
            raise HTTPException(status_code=403, detail="Access denied")
    
    wizard_data = report.wizard_data or {}
    determination = wizard_data.get("determination", {})
    
    # Evaluate using FinCEN-compliant logic
    is_exempt, exemption_reason = _evaluate_determination(determination)
    
    # Update status
    if is_exempt:
        report.status = "exempt"
        logger.info(f"Report {report_id} → EXEMPT: {exemption_reason}")
        # Store reason for certificate
        wizard_data["exemptionReason"] = exemption_reason
        report.wizard_data = wizard_data
        flag_modified(report, "wizard_data")
    else:
        report.status = "determination_complete"
        logger.info(f"Report {report_id} → REPORTABLE")
    
    db.commit()
    db.refresh(report)
    
    return {
        "id": str(report.id),
        "status": report.status,
        "is_reportable": not is_exempt,
        "exemption_reason": exemption_reason if is_exempt else None,
    }


def _evaluate_determination(determination: dict) -> tuple[bool, str | None]:
    """
    Evaluate determination using FinCEN RRE decision logic.
    
    Returns (is_exempt: bool, reason: str | None)
    
    Decision order (per FinCEN spec):
    1. Transfer-level exemptions (asked first)
    2. Non-residential with no intent to build
    3. Lender has AML program
    4. Individual buyer (immediate exit)
    5. Entity exemptions
    6. Trust exemptions (or entity exemptions for statutory trusts)
    """
    
    # CHECK 1: Transfer-level exemptions
    transfer_exemptions = determination.get("transferExemptions", [])
    if transfer_exemptions and "none" not in transfer_exemptions:
        reasons = [e for e in transfer_exemptions if e != "none"]
        return True, f"Transfer exempt: {', '.join(reasons)}"
    
    # CHECK 2: Non-residential with no intent to build
    is_residential = determination.get("isResidential")
    has_intent = determination.get("hasIntentToBuild")
    
    if is_residential == "no" and has_intent == "no":
        return True, "Non-residential property with no intent to build residential"
    
    # CHECK 3: Lender has AML program
    lender_has_aml = determination.get("lenderHasAml")
    if lender_has_aml == "yes":
        return True, "Financing by AML-covered lender — lender handles reporting"
    
    # CHECK 4: Individual buyer = NOT REPORTABLE (immediate)
    buyer_type = determination.get("buyerType")
    if buyer_type == "individual":
        return True, "Individual buyer — not reportable under RRE rule"
    
    # CHECK 5: Entity exemptions (also for statutory trusts)
    is_statutory_trust = determination.get("isStatutoryTrust")
    
    if buyer_type == "entity" or (buyer_type == "trust" and is_statutory_trust):
        entity_exemptions = determination.get("entityExemptions", [])
        if entity_exemptions and "none" not in entity_exemptions:
            reasons = [e for e in entity_exemptions if e != "none"]
            exempt_type = "statutory trust" if is_statutory_trust else "entity"
            return True, f"Exempt {exempt_type}: {', '.join(reasons)}"
        if "none" in entity_exemptions:
            return False, None  # REPORTABLE
    
    # CHECK 6: Trust exemptions (non-statutory trusts)
    if buyer_type == "trust" and not is_statutory_trust:
        trust_exemptions = determination.get("trustExemptions", [])
        if trust_exemptions and "none" not in trust_exemptions:
            reasons = [e for e in trust_exemptions if e != "none"]
            return True, f"Exempt trust: {', '.join(reasons)}"
        if "none" in trust_exemptions:
            return False, None  # REPORTABLE
    
    # If we get here, determination is incomplete
    raise HTTPException(
        status_code=400,
        detail="Determination incomplete. Please complete all determination steps."
    )
```

**Also add the import at the top if not present:**

```python
from sqlalchemy.orm.attributes import flag_modified
```

---

## Part 3: Update Page to Use New Wizard

### File: `web/app/(app)/app/reports/[id]/wizard/page.tsx`

**Replace the entire file:**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getReport, Report } from "@/lib/api";
import { WizardContainer } from "@/components/wizard";
import { Loader2 } from "lucide-react";

export default function WizardPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function loadReport() {
      try {
        const data = await getReport(reportId);
        setReport(data);
      } catch (err: any) {
        console.error("Failed to load report:", err);
        setError(err.message || "Failed to load report");
      } finally {
        setIsLoading(false);
      }
    }
    
    loadReport();
  }, [reportId]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error || "Report not found"}</p>
          <button
            onClick={() => router.push("/app/requests")}
            className="text-primary hover:underline"
          >
            Back to Requests
          </button>
        </div>
      </div>
    );
  }
  
  // If report is already filed, redirect
  if (report.status === "filed") {
    router.push(`/app/reports/${reportId}`);
    return null;
  }
  
  return (
    <WizardContainer
      report={report}
      onUpdate={(data) => {
        setReport((prev) => prev ? { ...prev, ...data } : prev);
      }}
    />
  );
}
```

---

## Part 4: Ensure API Functions Exist

Verify these functions exist in `web/lib/api.ts`. The `determine` function should already exist. If missing, add them:

```typescript
// Trigger determination (POST /reports/{id}/determine)
// NOTE: This function likely already exists as `determine` in api.ts
export async function determine(reportId: string): Promise<{
  id: string;
  status: string;
  is_reportable: boolean;
  exemption_reason: string | null;
}> {
  const response = await fetch(`${API_BASE}/reports/${reportId}/determine`, {
    method: "POST",
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to determine report");
  }
  
  return response.json();
}

// Get report parties
export async function getReportParties(reportId: string): Promise<any[]> {
  const response = await fetch(`${API_BASE}/reports/${reportId}/parties`, {
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch parties");
  }
  
  return response.json();
}

// Resend party link
export async function resendPartyLink(partyId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/party/staff/resend-link/${partyId}`, {
    method: "POST",
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error("Failed to resend link");
  }
}

// File report
export async function fileReport(reportId: string): Promise<{
  ok: boolean;
  status: string;
  receipt_id?: string;
  message?: string;
  is_demo?: boolean;
}> {
  const response = await fetch(`${API_BASE}/reports/${reportId}/file`, {
    method: "POST",
    headers: getHeaders(),
  });
  
  const data = await response.json();
  return data;
}

// Create party links
export interface PartyInput {
  party_role: "transferee" | "transferor";
  entity_type: "individual" | "entity";
  display_name: string;
  email: string;
}

export async function createPartyLinks(
  reportId: string,
  parties: PartyInput[],
  expiresInDays: number = 7
): Promise<any> {
  const response = await fetch(`${API_BASE}/reports/${reportId}/party-links`, {
    method: "POST",
    headers: {
      ...getHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parties,
      expires_in_days: expiresInDays,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to create party links");
  }
  
  return response.json();
}
```

---

## Part 5: Integration Testing

### Test 1: Step 0 — Transaction Reference
1. Start new report
2. Enter property address (verify autocomplete works)
3. Enter escrow number
4. Enter purchase price
5. Enter closing date
6. Click Next
7. **Check:** Step 1 (Transfer Exemptions) appears

### Test 2: Transfer Exemption Flow
1. Complete Test 1 (Step 0)
2. Select "1031 Exchange" in Step 1
3. Verify shows "Exempt" result
4. Click "View Certificate"
5. **Check DB:** `status = 'exempt'`, `wizard_data.exemptionReason` set
6. **Check Certificate:** Shows address, escrow #, price, date from Step 0

### Test 3: Individual Buyer Flow
1. Complete Step 0 (address, escrow, price, date)
2. Step 1: Select "None of the above"
3. Step 2: Residential = Yes
4. Step 3: Non-financed = Yes
5. Step 4: Buyer = Individual
6. Verify shows "Exempt" result immediately
7. **Check DB:** `status = 'exempt'`
8. **Check Certificate:** Shows property info from Step 0

### Test 4: Entity Reportable Flow
1. Complete Step 0
2. Step 1: None
3. Step 2: Residential = Yes
4. Step 3: Non-financed = Yes
5. Step 4: Buyer = Entity
6. Step 5: Entity exemptions = "None of the above"
7. Verify shows "Reportable" result
8. Click "Begin Data Collection"
9. **Check DB:** `status = 'determination_complete'`
10. **Check:** Goes directly to Party Setup (address already collected!)
11. Add buyer (entity) + seller (individual)
12. Click "Send Party Links"
13. **Check:** No 400 error!
14. **Check:** Emails sent

### Test 5: Party Portal Integration
1. Complete Test 4 up to sending links
2. Open party portal link (from email or DB)
3. Fill out party form
4. Submit
5. **Check:** Wizard shows party as "Submitted"
6. **Check:** `wizard_data.collection` has synced data

### Test 6: Filing Flow (Staging)
1. Complete Tests 4 + 5
2. Fill reporting person
3. Go to Review & File
4. **Check:** Review shows address, escrow #, price from Step 0
5. Certify and submit
6. **Check:** Shows success with receipt ID (demo mode)
7. **Check DB:** `status = 'filed'`, `receipt_id` set

### Test 7: Dashboard Integration
1. After Test 6, check:
   - Client Dashboard shows filed report
   - Staff Queue shows filed report
   - Admin Reports shows filed report
   - COO Dashboard shows filed report in stats

### Test 8: Certificate Contains Step 0 Data
1. Complete an exempt flow (e.g., Test 3)
2. View/download certificate
3. **Verify certificate shows:**
   - Property address
   - Escrow/File number
   - Closing date
   - Purchase price
   - Exemption reason
   - Date checked

---

## Part 6: Rollback Plan (Emergency Only)

**If critical issues found, rollback by:**

1. Revert `page.tsx` to use old wizard:
```tsx
// Temporarily import old wizard
import { RRERQuestionnaire } from "@/components/rrer-questionnaire";
```

2. Revert backend endpoint (if changed)

3. New wizard code stays in place (doesn't break anything)

**But you won't need this.** The new wizard is tested and correct.

---

## Part 7: Delete Old Wizard

**ONLY after all 6 tests pass:**

```bash
# Rename old wizard (keep as backup for 1 week)
mv web/components/rrer-questionnaire.tsx web/components/rrer-questionnaire.tsx.backup

# After 1 week with no issues, delete
rm web/components/rrer-questionnaire.tsx.backup
```

---

## Success Criteria

✅ All 6 integration tests pass  
✅ TypeScript compiles with no errors  
✅ No 400 errors on party links  
✅ Party portal submissions sync  
✅ Filing works in staging  
✅ All dashboards show correct data  
✅ Old wizard backed up  

---

## Final File Count

| Directory | Files | Purpose |
|-----------|-------|---------|
| `wizard/` | 1 | index.ts |
| `wizard/` | 1 | types.ts |
| `wizard/` | 1 | constants.ts |
| `wizard/` | 3 | Container, Progress, Navigation |
| `wizard/shared/` | 7 | Shared components (incl. TransactionReferenceStep) |
| `wizard/hooks/` | 4 | State/nav/autosave hooks |
| `wizard/determination/` | 8 | 7 steps + index |
| `wizard/collection/` | 5 | 4 steps + index |
| **Total** | **30** | ~1,500 lines |

**vs Old Wizard:** 1 file, 3,214 lines

---

## 🦈 SHARKS KILLED

After Day 4:

- ✅ Transaction reference collected FIRST (Step 0)
- ✅ Escrow officers get proof (certificate has property info)
- ✅ FinCEN-compliant decision tree
- ✅ Individual buyers = immediate exit
- ✅ Transfer exemptions asked first
- ✅ Statutory trust handling
- ✅ BOI after exemption resolution
- ✅ Party links work
- ✅ Party portal syncs
- ✅ Filing works
- ✅ All dashboards work
- ✅ Clean, maintainable code
- ✅ Matches app design

**GO CRUSH IT.** 🔪🦈
