import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import type { WizardState, StepId, DeterminationState, DeterminationResult } from "../types";

// ============================================================
// WIZARD NAVIGATION HOOK
// This is the brain - determines which steps are visible
// based on determination answers (FinCEN decision tree)
// ============================================================

export function useWizardNavigation(
  state: WizardState,
  reportStatus: string,
  initialStep?: StepId,
) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const initialStepApplied = useRef(false);

  // Compute the determination result
  const determinationResult = useMemo((): DeterminationResult | null => {
    return computeDeterminationResult(state.determination);
  }, [state.determination]);

  // Compute which steps should be visible
  const visibleSteps = useMemo((): StepId[] => {
    const steps: StepId[] = [];
    const d = state.determination;
    const c = state.collection;

    // ========== STEP 0: TRANSACTION REFERENCE (ALWAYS FIRST) ==========
    steps.push("transaction-reference");

    // Must have address, escrow, price, and date to proceed
    const hasTransactionRef =
      c.propertyAddress?.street &&
      c.escrowNumber &&
      c.purchasePrice &&
      c.closingDate;

    if (!hasTransactionRef) {
      return steps; // Can't proceed without transaction reference
    }

    // ========== DETERMINATION PHASE ==========

    // Step 1: Transfer exemptions (ALWAYS AFTER transaction reference)
    steps.push("transfer-exemptions");

    // Check for transfer-level exemption
    if (hasTransferExemption(d)) {
      steps.push("determination-result");
      return steps;
    }

    // Need "none" selected to proceed
    if (!d.transferExemptions.includes("none")) {
      return steps;
    }

    // Step 2: Property type
    steps.push("property-type");

    // Non-residential with no intent to build = EXEMPT
    if (d.isResidential === "no") {
      if (d.hasIntentToBuild === "no") {
        steps.push("determination-result");
        return steps;
      }
      if (d.hasIntentToBuild === null) {
        return steps; // Wait for answer
      }
    }

    if (d.isResidential === null) {
      return steps; // Wait for answer
    }

    // Step 3: Financing
    steps.push("financing");

    // If financed, check lender AML
    if (d.isNonFinanced === "no") {
      if (d.lenderHasAml === "yes") {
        steps.push("determination-result");
        return steps; // EXEMPT - lender handles reporting
      }
      if (d.lenderHasAml === null) {
        return steps; // Wait for answer
      }
    }

    if (d.isNonFinanced === null) {
      return steps; // Wait for answer
    }

    // Step 4: Buyer type
    steps.push("buyer-type");

    // Individual = IMMEDIATE EXIT (not reportable)
    if (d.buyerType === "individual") {
      steps.push("determination-result");
      return steps;
    }

    if (d.buyerType === null) {
      return steps; // Wait for answer
    }

    // Step 5/6: Exemptions based on buyer type
    if (d.buyerType === "entity") {
      steps.push("entity-exemptions");
      if (d.entityExemptions.length > 0) {
        steps.push("determination-result");
      }
    } else if (d.buyerType === "trust") {
      // Check if statutory trust question is answered
      if (d.isStatutoryTrust === null) {
        return steps; // Wait for statutory trust answer (asked in buyer-type step)
      }

      // Statutory trusts use entity exemption logic
      if (d.isStatutoryTrust === true) {
        steps.push("entity-exemptions");
        if (d.entityExemptions.length > 0) {
          steps.push("determination-result");
        }
      } else {
        steps.push("trust-exemptions");
        if (d.trustExemptions.length > 0) {
          steps.push("determination-result");
        }
      }
    }

    // ========== COLLECTION PHASE ==========
    // Only if determination is complete and REPORTABLE
    if (
      reportStatus === "determination_complete" ||
      reportStatus === "collecting" ||
      reportStatus === "awaiting_parties" ||
      reportStatus === "ready_to_file"
    ) {
      steps.push("party-setup");
      steps.push("party-status");
      steps.push("reporting-person");
      steps.push("review-and-file");
    }

    return steps;
  }, [state.determination, state.collection, reportStatus]);

  // Apply initial step once on mount (for ?step= deep linking)
  useEffect(() => {
    if (!initialStepApplied.current && initialStep && visibleSteps.length > 0) {
      const idx = visibleSteps.indexOf(initialStep);
      if (idx !== -1) {
        setCurrentStepIndex(idx);
      }
      initialStepApplied.current = true;
    }
  }, [initialStep, visibleSteps]);

  // Current step
  const currentStep = visibleSteps[currentStepIndex] || visibleSteps[0];

  // Current phase
  const phase = useMemo(() => {
    const collectionSteps: StepId[] = [
      "party-setup",
      "party-status",
      "reporting-person",
      "review-and-file",
    ];

    if (collectionSteps.includes(currentStep)) {
      return "collection" as const;
    }
    return "determination" as const;
  }, [currentStep]);

  // Navigation functions
  const goBack = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentStepIndex((prev) => Math.min(visibleSteps.length - 1, prev + 1));
  }, [visibleSteps.length]);

  const goToStep = useCallback(
    (step: StepId) => {
      const index = visibleSteps.indexOf(step);
      if (index !== -1) {
        setCurrentStepIndex(index);
      }
    },
    [visibleSteps],
  );

  // Can navigate?
  const canGoBack = currentStepIndex > 0;
  const canGoNext =
    currentStepIndex < visibleSteps.length - 1 &&
    currentStep !== "determination-result"; // Result step has special buttons

  return {
    currentStep,
    currentStepIndex,
    visibleSteps,
    phase,
    determinationResult,
    canGoBack,
    canGoNext,
    goBack,
    goNext,
    goToStep,
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function hasTransferExemption(d: DeterminationState): boolean {
  return d.transferExemptions.length > 0 && !d.transferExemptions.includes("none");
}

function computeDeterminationResult(d: DeterminationState): DeterminationResult | null {
  // Check 1: Transfer exemption
  if (hasTransferExemption(d)) {
    const exemptions = d.transferExemptions.filter((e) => e !== "none");
    return {
      isReportable: false,
      reason: `Transfer exempt: ${exemptions.join(", ")}`,
    };
  }

  // Check 2: Non-residential with no intent
  if (d.isResidential === "no" && d.hasIntentToBuild === "no") {
    return {
      isReportable: false,
      reason: "Non-residential property with no intent to build residential",
    };
  }

  // Check 3: Lender has AML
  if (d.lenderHasAml === "yes") {
    return {
      isReportable: false,
      reason: "Financing by AML-covered lender — lender handles reporting",
    };
  }

  // Check 4: Individual buyer
  if (d.buyerType === "individual") {
    return {
      isReportable: false,
      reason: "Individual buyer — not reportable under RRE rule",
    };
  }

  // Check 5: Entity exemptions
  if (d.buyerType === "entity" || (d.buyerType === "trust" && d.isStatutoryTrust)) {
    if (d.entityExemptions.length > 0 && !d.entityExemptions.includes("none")) {
      const exemptions = d.entityExemptions.filter((e) => e !== "none");
      return {
        isReportable: false,
        reason: `Exempt entity type: ${exemptions.join(", ")}`,
      };
    }
    if (d.entityExemptions.includes("none")) {
      return {
        isReportable: true,
        reason: "Non-exempt entity buyer — FinCEN report required",
      };
    }
  }

  // Check 6: Trust exemptions (non-statutory)
  if (d.buyerType === "trust" && d.isStatutoryTrust === false) {
    if (d.trustExemptions.length > 0 && !d.trustExemptions.includes("none")) {
      const exemptions = d.trustExemptions.filter((e) => e !== "none");
      return {
        isReportable: false,
        reason: `Exempt trust type: ${exemptions.join(", ")}`,
      };
    }
    if (d.trustExemptions.includes("none")) {
      return {
        isReportable: true,
        reason: "Non-exempt trust buyer — FinCEN report required",
      };
    }
  }

  // Not yet determined
  return null;
}
