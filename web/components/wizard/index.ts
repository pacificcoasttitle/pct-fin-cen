// ============================================================
// WIZARD MODULE - PUBLIC API
// Import everything from here:
//   import { useWizardState, StepCard, ... } from "@/components/wizard"
// ============================================================

// Types
export type {
  YesNo,
  YesNoUnknown,
  BuyerType,
  LegalDescriptionType,
  DeterminationState,
  CollectionState,
  WizardState,
  DeterminationStepId,
  CollectionStepId,
  StepId,
  StepMeta,
  DeterminationResult,
  ReportingPersonCategory,
  ReportingPerson,
} from "./types";

export { createInitialWizardState } from "./types";

// Constants
export {
  TRANSFER_EXEMPTION_OPTIONS,
  ENTITY_EXEMPTION_OPTIONS,
  TRUST_EXEMPTION_OPTIONS,
  LEGAL_DESCRIPTION_TYPE_OPTIONS,
  REPORTING_PERSON_CATEGORY_OPTIONS,
  DETERMINATION_STEPS,
  COLLECTION_STEPS,
} from "./constants";

// Shared Components
export {
  StepCard,
  YesNoQuestion,
  YesNoUnknownQuestion,
  CheckboxList,
  ExemptionAlert,
  TransactionReferenceStep,
} from "./shared";

// Hooks
export { useWizardState } from "./hooks/useWizardState";
export { useWizardNavigation } from "./hooks/useWizardNavigation";
export { useAutoSave } from "./hooks/useAutoSave";

// Determination Steps
export {
  TransferExemptionsStep,
  PropertyTypeStep,
  FinancingStep,
  BuyerTypeStep,
  EntityExemptionsStep,
  TrustExemptionsStep,
  DeterminationResultStep,
} from "./determination";

// Collection steps (Day 3)
// export * from "./collection";
