"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Report, saveWizard } from "@/lib/api";
import { WizardProgress } from "./WizardProgress";
import { WizardNavigation } from "./WizardNavigation";
import { useWizardState } from "./hooks/useWizardState";
import { useWizardNavigation } from "./hooks/useWizardNavigation";
import { useAutoSave } from "./hooks/useAutoSave";
import { WizardState, StepId } from "./types";

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

interface WizardContainerProps {
  report: Report;
  onUpdate?: (data: Partial<Report>) => void;
}

export function WizardContainer({ report, onUpdate }: WizardContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStepParam = searchParams.get("step") as StepId | null;
  
  // Local report status — allows us to update it after determine() succeeds
  // without needing to re-fetch the entire report from the server
  const [reportStatus, setReportStatus] = useState(report.status);
  
  // Pending navigation — set a target step to navigate to after visibleSteps re-computes
  const pendingStepRef = useRef<StepId | null>(null);
  
  // Initialize state from report's wizard_data
  const { state, updateDetermination, updateCollection } = useWizardState(
    report.wizard_data as Partial<WizardState> | undefined
  );
  
  // Track current step index for auto-save
  const currentStepIndexRef = useRef(0);
  
  // Auto-save callback
  const handleSave = useCallback(async (reportId: string, wizardData: WizardState) => {
    await saveWizard(reportId, currentStepIndexRef.current, wizardData as unknown as Record<string, unknown>);
  }, []);

  // Auto-save on changes
  const { flush } = useAutoSave({
    reportId: report.id,
    wizardState: state,
    onSave: handleSave,
    onError: (error) => console.error("Auto-save failed:", error),
  });
  
  // Navigation logic — uses local reportStatus so it updates when determine() succeeds
  const {
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
  } = useWizardNavigation(state, reportStatus, initialStepParam || undefined);
  
  // Keep step index ref in sync for auto-save
  useEffect(() => {
    currentStepIndexRef.current = currentStepIndex;
  }, [currentStepIndex]);
  
  // Navigate to pending step once visibleSteps updates to include it
  useEffect(() => {
    if (pendingStepRef.current && visibleSteps.includes(pendingStepRef.current)) {
      goToStep(pendingStepRef.current);
      pendingStepRef.current = null;
    }
  }, [visibleSteps, goToStep]);
  
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
              legalDescriptionType: state.collection.legalDescriptionType,
              legalDescription: state.collection.legalDescription,
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
            onFlush={flush}
            onBeginCollection={() => {
              // Update local status so visibleSteps includes collection steps
              setReportStatus("determination_complete");
              // Schedule navigation — will fire after visibleSteps re-computes
              pendingStepRef.current = "party-setup";
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
      <div className="sticky top-0 z-10 border-b bg-card shadow-sm">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <WizardProgress
            phase={phase}
            currentStep={currentStep}
            visibleSteps={visibleSteps}
            onStepClick={goToStep}
          />
        </div>
      </div>
      
      {/* Step Content */}
      <div className="flex-1">
        <div className="mx-auto max-w-4xl px-6 py-8">
          {renderStep()}
        </div>
      </div>
      
      {/* Bottom Navigation */}
      {showBottomNav && (
        <div className="sticky bottom-0 border-t bg-card">
          <div className="mx-auto max-w-4xl px-6 py-4">
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
