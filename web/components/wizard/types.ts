// ============================================================
// WIZARD TYPES
// These types define the wizard state and must match the
// wizard_data structure that RERX builder and party portal read.
//
// IMPORTANT: Some types already exist in rrer-types.ts (Cursor added them).
// We import those to ensure consistency with RERX builder mapping.
// ============================================================

// Import existing types from rrer-types.ts
import type {
  ReportingPersonCategory,
  ReportingPerson,
} from "@/lib/rrer-types";

// Re-export for convenience
export type { ReportingPersonCategory, ReportingPerson };

// Basic answer types
export type YesNo = "yes" | "no" | null;
export type YesNoUnknown = "yes" | "no" | "unknown" | null;
export type BuyerType = "individual" | "entity" | "trust" | null;

// Legal description type (matches RERX builder mapping)
export type LegalDescriptionType =
  | "metes_and_bounds"      // 1 - Metes and Bounds
  | "lot_block_subdivision" // 2 - Lot/Block/Subdivision
  | "other"                 // 3 - Other
  | "";

// Determination phase state
export interface DeterminationState {
  // Step 1: Transfer exemptions
  transferExemptions: string[];

  // Step 2: Property
  isResidential: YesNo;
  hasIntentToBuild: YesNo;

  // Step 3: Financing
  isNonFinanced: YesNo;
  lenderHasAml: YesNoUnknown;

  // Step 4: Buyer type
  buyerType: BuyerType;
  isStatutoryTrust: boolean | null;

  // Step 5/6: Exemptions
  entityExemptions: string[];
  trustExemptions: string[];
}

// Collection phase state
export interface CollectionState {
  // Step 0: Transaction Reference
  propertyAddress: {
    street: string;
    unit?: string;
    city: string;
    state: string;
    zip: string;
    county?: string;
  } | null;
  escrowNumber: string | null;
  purchasePrice: number | null;
  closingDate: string | null;

  // Property details (required for reportable)
  propertyType?: string;
  apn?: string;
  legalDescriptionType: LegalDescriptionType;  // REQUIRED - matches RERX builder
  legalDescription: string | null;              // REQUIRED - max 1000 chars

  // Party data (synced from portal)
  sellers: any[];
  buyerEntity?: any;
  buyerTrust?: any;
  paymentSources: any[];

  // Reporting person (uses type from rrer-types.ts)
  reportingPerson: ReportingPerson | null;

  // Auto-filled from SiteX
  siteXData?: any;
}

// Complete wizard state
export interface WizardState {
  determination: DeterminationState;
  collection: CollectionState;
  exemptionReason?: string;
}

// Step identifiers
export type DeterminationStepId =
  | "transaction-reference"      // Step 0 (always first)
  | "transfer-exemptions"
  | "property-type"
  | "financing"
  | "buyer-type"
  | "entity-exemptions"
  | "trust-exemptions"
  | "determination-result";

export type CollectionStepId =
  | "party-setup"
  | "party-status"
  | "reporting-person"
  | "review-and-file";

export type StepId = DeterminationStepId | CollectionStepId;

// Step metadata
export interface StepMeta {
  id: StepId;
  title: string;
  description?: string;
  phase: "determination" | "collection";
}

// Determination result
export interface DeterminationResult {
  isReportable: boolean;
  reason: string;
}

// Initial state factory
export function createInitialWizardState(): WizardState {
  return {
    determination: {
      transferExemptions: [],
      isResidential: null,
      hasIntentToBuild: null,
      isNonFinanced: null,
      lenderHasAml: null,
      buyerType: null,
      isStatutoryTrust: null,
      entityExemptions: [],
      trustExemptions: [],
    },
    collection: {
      propertyAddress: null,
      escrowNumber: null,
      purchasePrice: null,
      closingDate: null,
      legalDescriptionType: "",
      legalDescription: null,
      sellers: [],
      paymentSources: [],
      reportingPerson: null,
    },
  };
}
