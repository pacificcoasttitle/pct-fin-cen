"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Report, saveWizard } from "@/lib/api";
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
  
  // Auto-save callback
  const handleSave = useCallback(async (reportId: string, wizardData: WizardState) => {
    await saveWizard(reportId, 0, wizardData as unknown as Record<string, unknown>);
  }, []);

  // Auto-save on changes
  const { flush } = useAutoSave({
    reportId: report.id,
    wizardState: state,
    onSave: handleSave,
    onError: (error) => console.error("Auto-save failed:", error),
  });
  
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
            onBeginCollection={() => {
              // Save before transitioning
              flush();
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
      <div className="sticky top-0 z-10 border-b bg-card shadow-sm">
        <div className="container max-w-5xl py-4 px-6">
          <WizardProgress
            phase={phase}
            currentStep={currentStep}
            visibleSteps={visibleSteps}
            onStepClick={goToStep}
          />
        </div>
      </div>
      
      {/* Step Content */}
      <div className="flex-1 container max-w-4xl py-8 px-6">
        {renderStep()}
      </div>
      
      {/* Bottom Navigation */}
      {showBottomNav && (
        <div className="sticky bottom-0 border-t bg-card">
          <div className="container max-w-4xl py-4 px-6">
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
