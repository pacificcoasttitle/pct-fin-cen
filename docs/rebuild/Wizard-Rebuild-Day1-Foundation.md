# 🦈 Wizard Rebuild — Day 1: Foundation

## Mission
Build the foundation: shared components, hooks, and types that the wizard will use.

**DO NOT touch the old wizard yet.** We're building alongside it.

---

## Critical Business Requirement

**Every transaction needs a reference — even exempt ones.**

Escrow officers need proof they checked. The exempt certificate must show:
- Property address
- Escrow/file number
- Closing date
- Purchase price

**Therefore: Step 0 (Transaction Reference) is ALWAYS first, before any determination questions.**

---

## Architecture Context

### Data Structure (MUST match exactly)

The wizard outputs to `report.wizard_data`. This structure is READ by:
- RERX Builder (filing XML generation)
- Party Portal Sync
- All dashboards

```typescript
// This is the contract. Do not change field names.
interface WizardData {
  determination: {
    // Transfer-level exemptions (NEW - asked FIRST)
    transferExemptions: string[];       // ["none"] or ["death", "1031", ...]
    
    // Property
    isResidential: "yes" | "no" | null;
    hasIntentToBuild: "yes" | "no" | null;
    
    // Financing  
    isNonFinanced: "yes" | "no" | null;
    lenderHasAml: "yes" | "no" | "unknown" | null;
    
    // Buyer
    buyerType: "individual" | "entity" | "trust" | null;
    isStatutoryTrust: boolean | null;   // NEW - for trust routing
    
    // Exemptions
    entityExemptions: string[];
    trustExemptions: string[];
  };
  
  collection: {
    propertyAddress: {
      street: string;
      unit?: string;
      city: string;
      state: string;
      zip: string;
      county?: string;
    };
    purchasePrice: number;
    closingDate: string;
    propertyType?: string;
    apn?: string;
    legalDescription?: string;
    
    sellers: Array<{
      type: "individual" | "entity";
      // ... seller fields
    }>;
    
    buyerEntity?: {
      entity: { legalName: string; /* ... */ };
      beneficialOwners: Array<{ /* ... */ }>;
    };
    
    buyerTrust?: {
      trust: { trustName: string; /* ... */ };
      trustees: Array<{ /* ... */ }>;
    };
    
    paymentSources: Array<{
      method: string;
      amount: number;
      institutionName?: string;
      // ...
    }>;
    
    reportingPerson: {
      companyName: string;
      contactName: string;
      // ...
    };
    
    siteXData?: object;  // Auto-filled from property lookup
  };
  
  exemptionReason?: string;  // Set when exempt
}
```

### Report Statuses

| Status | Meaning | Set When |
|--------|---------|----------|
| `draft` | Just created | Initial |
| `determination_complete` | REPORTABLE | After determination |
| `exempt` | NOT REPORTABLE | After determination |
| `collecting` | Party data being gathered | After links sent |
| `awaiting_parties` | Waiting for responses | Links sent |
| `ready_to_file` | All parties submitted | All complete |
| `filed` | Submitted to FinCEN | After filing |

---

## File Structure to Create

```
web/components/wizard/
├── index.ts
├── types.ts
├── constants.ts
│
├── shared/
│   ├── StepCard.tsx
│   ├── YesNoQuestion.tsx
│   ├── YesNoUnknownQuestion.tsx
│   ├── CheckboxList.tsx
│   ├── ExemptionAlert.tsx
│   ├── TransactionReferenceStep.tsx    # NEW - Step 0 (always first)
│   └── index.ts
│
└── hooks/
    ├── useWizardState.ts
    ├── useWizardNavigation.ts
    ├── useAutoSave.ts
    └── index.ts
```

---

## IMPORTANT: Step 0 — Transaction Reference

Every report starts with Transaction Reference. This step collects:
- Property Address (with SiteX/Google autocomplete)
- Escrow/File Number  
- Closing Date
- Purchase Price

**Why first?** Because:
1. EXEMPT transactions need this for the certificate
2. REPORTABLE transactions need this for the filing
3. The escrow officer needs proof they checked THIS property

This data lives in `wizard_data.collection` but is collected BEFORE determination.

---

## Step 1: Create Types

### File: `web/components/wizard/types.ts`

```typescript
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
```

---

## Step 2: Create Constants

### File: `web/components/wizard/constants.ts`

```typescript
// ============================================================
// WIZARD CONSTANTS
// Options for exemption checklists per FinCEN RRE rule
// ============================================================

import { StepMeta } from "./types";

// Transfer-level exemptions (asked FIRST - Section 1 of FinCEN spec)
export const TRANSFER_EXEMPTION_OPTIONS = [
  { 
    id: "easement", 
    label: "Easement only",
    description: "No fee simple transfer of the property"
  },
  { 
    id: "death", 
    label: "Transfer resulting from death",
    description: "Inheritance, estate distribution, TOD deed, intestate succession"
  },
  { 
    id: "divorce", 
    label: "Divorce or dissolution",
    description: "Transfer incidental to divorce or legal dissolution"
  },
  { 
    id: "bankruptcy", 
    label: "Bankruptcy estate",
    description: "Transfer to a bankruptcy estate"
  },
  { 
    id: "court-supervised", 
    label: "Court-supervised transfer",
    description: "Judicial sale, receivership, or other court supervision"
  },
  { 
    id: "self-settled-trust", 
    label: "Self-settled trust",
    description: "No-consideration transfer by individual to their own trust"
  },
  { 
    id: "1031-exchange", 
    label: "1031 Exchange",
    description: "Transfer to a qualified intermediary for 1031 exchange"
  },
  { 
    id: "no-reporting-person", 
    label: "No reporting person",
    description: "No reporting person identified for this transaction"
  },
] as const;

// Entity exemptions (16 types per FinCEN spec Section 5)
export const ENTITY_EXEMPTION_OPTIONS = [
  { id: "securities-issuer", label: "Securities reporting issuer (publicly traded)" },
  { id: "government", label: "Governmental authority (federal, state, local, tribal)" },
  { id: "bank", label: "Bank" },
  { id: "credit-union", label: "Credit union" },
  { id: "depository-holding", label: "Depository institution holding company" },
  { id: "msb", label: "Money services business (FinCEN registered)" },
  { id: "broker-dealer", label: "Broker or dealer in securities (SEC registered)" },
  { id: "exchange-clearing", label: "Securities exchange or clearing agency" },
  { id: "exchange-act", label: "Other Exchange Act registered entity" },
  { id: "insurance-company", label: "Insurance company" },
  { id: "insurance-producer", label: "State-licensed insurance producer" },
  { id: "commodity", label: "Commodity Exchange Act registered entity" },
  { id: "public-utility", label: "Public utility" },
  { id: "financial-market-utility", label: "Financial market utility" },
  { id: "investment-company", label: "Registered investment company or adviser" },
  { id: "exempt-subsidiary", label: "Subsidiary of any exempt entity above" },
] as const;

// Trust exemptions (Section 6 of FinCEN spec)
export const TRUST_EXEMPTION_OPTIONS = [
  { 
    id: "trust-securities-issuer", 
    label: "Trust is a securities reporting issuer" 
  },
  { 
    id: "trustee-securities-issuer", 
    label: "Trustee is a securities reporting issuer" 
  },
  { 
    id: "exempt-owned", 
    label: "Trust wholly owned by an exempt entity" 
  },
] as const;

// ============================================================
// RERX MAPPING CONSTANTS
// These values MUST match the RERX builder mapping functions.
// Uses snake_case to match existing codebase (Cursor implemented).
// ============================================================

// Legal description types (matches rerx_builder._map_legal_description_type)
export const LEGAL_DESCRIPTION_TYPE_OPTIONS = [
  { 
    id: "metes_and_bounds", 
    label: "Metes and Bounds",
    description: "Boundary descriptions using directions and distances"
  },
  { 
    id: "lot_block_subdivision", 
    label: "Lot/Block/Subdivision",
    description: "Subdivision plat reference (lot #, block #, subdivision name)"
  },
  { 
    id: "other", 
    label: "Other",
    description: "Condominium unit, tax parcel ID, APN, or other description"
  },
] as const;

// Reporting person categories (matches rerx_builder._map_reporting_person_category)
// Per 31 CFR 1031.320 cascade priority
export const REPORTING_PERSON_CATEGORY_OPTIONS = [
  { 
    id: "closing_settlement_agent", 
    label: "Closing/Settlement Agent",
    description: "Person who conducts the closing or settlement"
  },
  { 
    id: "closing_statement_preparer", 
    label: "Closing Statement Preparer",
    description: "Person who prepares the closing or settlement statement (HUD-1/CD)"
  },
  { 
    id: "deed_filer", 
    label: "Deed Filer",
    description: "Person who files the deed or other instrument of transfer"
  },
  { 
    id: "title_insurance_agent", 
    label: "Title Insurance Agent",
    description: "Agent for a title insurance company"
  },
  { 
    id: "title_insurance_underwriter", 
    label: "Title Insurance Underwriter",
    description: "Title insurance underwriting company"
  },
  { 
    id: "attorney", 
    label: "Attorney",
    description: "Attorney licensed to practice law representing the transferee"
  },
  { 
    id: "other", 
    label: "Other",
    description: "Other reporting person category"
  },
] as const;

// Step metadata
export const DETERMINATION_STEPS: StepMeta[] = [
  { 
    id: "transaction-reference", 
    title: "Transaction", 
    description: "Property and transaction details",
    phase: "determination" 
  },
  { 
    id: "transfer-exemptions", 
    title: "Transfer Type", 
    description: "Check for exempt transfer types",
    phase: "determination" 
  },
  { 
    id: "property-type", 
    title: "Property Type", 
    description: "Residential property check",
    phase: "determination" 
  },
  { 
    id: "financing", 
    title: "Financing", 
    description: "Non-financed transfer check",
    phase: "determination" 
  },
  { 
    id: "buyer-type", 
    title: "Buyer Type", 
    description: "Individual, entity, or trust",
    phase: "determination" 
  },
  { 
    id: "entity-exemptions", 
    title: "Entity Check", 
    description: "Exempt entity types",
    phase: "determination" 
  },
  { 
    id: "trust-exemptions", 
    title: "Trust Check", 
    description: "Exempt trust types",
    phase: "determination" 
  },
  { 
    id: "determination-result", 
    title: "Result", 
    description: "Determination outcome",
    phase: "determination" 
  },
];

export const COLLECTION_STEPS: StepMeta[] = [
  { 
    id: "party-setup", 
    title: "Party Setup", 
    description: "Add buyers and sellers",
    phase: "collection" 
  },
  { 
    id: "party-status", 
    title: "Party Status", 
    description: "Monitor submissions",
    phase: "collection" 
  },
  { 
    id: "reporting-person", 
    title: "Reporting Person", 
    description: "Designate reporting person",
    phase: "collection" 
  },
  { 
    id: "review-and-file", 
    title: "Review & File", 
    description: "Final review and submit",
    phase: "collection" 
  },
];
```

---

## Step 3: Create Shared Components

### File: `web/components/wizard/shared/StepCard.tsx`

```tsx
import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StepCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function StepCard({ title, description, children, footer }: StepCardProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {children}
      </CardContent>
      {footer && (
        <div className="border-t px-6 py-4 bg-muted/50">
          {footer}
        </div>
      )}
    </Card>
  );
}
```

### File: `web/components/wizard/shared/YesNoQuestion.tsx`

```tsx
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { YesNo } from "../types";

interface YesNoQuestionProps {
  question: string;
  description?: string;
  value: YesNo;
  onChange: (value: "yes" | "no") => void;
  yesLabel?: string;
  noLabel?: string;
  disabled?: boolean;
}

export function YesNoQuestion({
  question,
  description,
  value,
  onChange,
  yesLabel = "Yes",
  noLabel = "No",
  disabled = false,
}: YesNoQuestionProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium text-base">{question}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      
      <RadioGroup
        value={value || undefined}
        onValueChange={(v) => onChange(v as "yes" | "no")}
        className="flex gap-6"
        disabled={disabled}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="yes" id={`${question}-yes`} />
          <Label 
            htmlFor={`${question}-yes`}
            className="cursor-pointer font-normal"
          >
            {yesLabel}
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="no" id={`${question}-no`} />
          <Label 
            htmlFor={`${question}-no`}
            className="cursor-pointer font-normal"
          >
            {noLabel}
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
```

### File: `web/components/wizard/shared/YesNoUnknownQuestion.tsx`

```tsx
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { YesNoUnknown } from "../types";

interface YesNoUnknownQuestionProps {
  question: string;
  description?: string;
  value: YesNoUnknown;
  onChange: (value: "yes" | "no" | "unknown") => void;
  yesLabel?: string;
  noLabel?: string;
  unknownLabel?: string;
  disabled?: boolean;
}

export function YesNoUnknownQuestion({
  question,
  description,
  value,
  onChange,
  yesLabel = "Yes",
  noLabel = "No",
  unknownLabel = "Unknown",
  disabled = false,
}: YesNoUnknownQuestionProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium text-base">{question}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      
      <RadioGroup
        value={value || undefined}
        onValueChange={(v) => onChange(v as "yes" | "no" | "unknown")}
        className="flex gap-6"
        disabled={disabled}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="yes" id={`${question}-yes`} />
          <Label htmlFor={`${question}-yes`} className="cursor-pointer font-normal">
            {yesLabel}
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="no" id={`${question}-no`} />
          <Label htmlFor={`${question}-no`} className="cursor-pointer font-normal">
            {noLabel}
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="unknown" id={`${question}-unknown`} />
          <Label htmlFor={`${question}-unknown`} className="cursor-pointer font-normal">
            {unknownLabel}
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
```

### File: `web/components/wizard/shared/CheckboxList.tsx`

```tsx
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CheckboxOption {
  id: string;
  label: string;
  description?: string;
}

interface CheckboxListProps {
  options: readonly CheckboxOption[] | CheckboxOption[];
  value: string[];
  onChange: (id: string, checked: boolean) => void;
  disabled?: boolean;
}

export function CheckboxList({ 
  options, 
  value, 
  onChange, 
  disabled = false 
}: CheckboxListProps) {
  return (
    <div className="space-y-3">
      {options.map((option) => (
        <div key={option.id} className="flex items-start space-x-3">
          <Checkbox
            id={option.id}
            checked={value.includes(option.id)}
            onCheckedChange={(checked) => onChange(option.id, !!checked)}
            disabled={disabled}
            className="mt-0.5"
          />
          <div className="space-y-0.5">
            <Label 
              htmlFor={option.id} 
              className="cursor-pointer font-normal leading-tight"
            >
              {option.label}
            </Label>
            {option.description && (
              <p className="text-xs text-muted-foreground">
                {option.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### File: `web/components/wizard/shared/ExemptionAlert.tsx`

```tsx
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ExemptionAlertProps {
  type: "exempt" | "reportable";
  title?: string;
  description: string;
}

export function ExemptionAlert({ type, title, description }: ExemptionAlertProps) {
  if (type === "exempt") {
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">
          {title || "This transfer appears to be exempt"}
        </AlertTitle>
        <AlertDescription className="text-amber-700">
          {description}
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <Alert className="border-green-200 bg-green-50">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-800">
        {title || "FinCEN Report Required"}
      </AlertTitle>
      <AlertDescription className="text-green-700">
        {description}
      </AlertDescription>
    </Alert>
  );
}
```

### File: `web/components/wizard/shared/TransactionReferenceStep.tsx`

```tsx
"use client";

import { useState } from "react";
import { StepCard } from "./StepCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { LEGAL_DESCRIPTION_TYPE_OPTIONS } from "../constants";

// US States for manual entry
const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

interface PropertyAddress {
  street: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
  county?: string;
}

interface TransactionReferenceData {
  propertyAddress: PropertyAddress | null;
  escrowNumber: string | null;
  closingDate: string | null;
  purchasePrice: number | null;
  apn?: string;
  legalDescriptionType: string;  // "metes_and_bounds" | "lot_block_subdivision" | "other" | ""
  legalDescription: string | null;
  siteXData?: any;
}

interface TransactionReferenceStepProps {
  value: TransactionReferenceData;
  onChange: (updates: Partial<TransactionReferenceData>) => void;
}

export function TransactionReferenceStep({ 
  value, 
  onChange 
}: TransactionReferenceStepProps) {
  const [showManualAddress, setShowManualAddress] = useState(false);
  
  const address = value.propertyAddress || {
    street: "",
    unit: "",
    city: "",
    state: "",
    zip: "",
    county: "",
  };
  
  const handleAddressSelect = (
    selectedAddress: { street: string; city: string; state: string; zip: string; county?: string },
    propertyData?: any
  ) => {
    onChange({
      propertyAddress: {
        street: selectedAddress.street,
        city: selectedAddress.city,
        state: selectedAddress.state,
        zip: selectedAddress.zip,
        county: selectedAddress.county || propertyData?.county || "",
      },
      apn: propertyData?.apn || value.apn,
      siteXData: propertyData,
    });
  };
  
  const handleAddressChange = (field: string, fieldValue: string) => {
    onChange({
      propertyAddress: {
        ...address,
        [field]: fieldValue,
      },
    });
  };
  
  return (
    <StepCard
      title="Transaction Reference"
      description="Enter the property and transaction details. This information will appear on the exemption certificate or FinCEN report."
    >
      <div className="space-y-6">
        {/* Property Address */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Property Address *</Label>
            <button
              type="button"
              onClick={() => setShowManualAddress(!showManualAddress)}
              className="text-sm text-primary hover:underline"
            >
              {showManualAddress ? "Use autocomplete" : "Enter manually"}
            </button>
          </div>
          
          {!showManualAddress ? (
            <AddressAutocomplete
              onSelect={handleAddressSelect}
              fetchPropertyData={true}
              showPropertyCard={true}
              placeholder="Start typing property address..."
            />
          ) : (
            <div className="grid gap-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    value={address.street}
                    onChange={(e) => handleAddressChange("street", e.target.value)}
                    placeholder="123 Main St"
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    value={address.unit || ""}
                    onChange={(e) => handleAddressChange("unit", e.target.value)}
                    placeholder="Apt 4B"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-6 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={address.city}
                    onChange={(e) => handleAddressChange("city", e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="state">State</Label>
                  <Select
                    value={address.state}
                    onValueChange={(v) => handleAddressChange("state", v)}
                  >
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state.value} value={state.value}>
                          {state.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={address.zip}
                    onChange={(e) => handleAddressChange("zip", e.target.value)}
                    placeholder="90210"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="county">County</Label>
                <Input
                  id="county"
                  value={address.county || ""}
                  onChange={(e) => handleAddressChange("county", e.target.value)}
                  placeholder="Los Angeles"
                />
              </div>
            </div>
          )}
          
          {/* Auto-filled APN from SiteX */}
          {value.apn && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                APN: {value.apn}
              </Badge>
              <span className="text-xs text-muted-foreground">Auto-filled from title plant</span>
            </div>
          )}
        </div>
        
        {/* Escrow Number */}
        <div className="space-y-2">
          <Label htmlFor="escrowNumber">Escrow / File Number *</Label>
          <Input
            id="escrowNumber"
            value={value.escrowNumber || ""}
            onChange={(e) => onChange({ escrowNumber: e.target.value })}
            placeholder="2026-001234"
          />
          <p className="text-xs text-muted-foreground">
            Your internal reference number for this transaction
          </p>
        </div>
        
        {/* Purchase Price */}
        <div className="space-y-2">
          <Label htmlFor="purchasePrice">Purchase Price *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="purchasePrice"
              type="text"
              className="pl-7"
              value={value.purchasePrice ? value.purchasePrice.toLocaleString() : ""}
              onChange={(e) => {
                const numValue = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
                onChange({ purchasePrice: isNaN(numValue) ? null : numValue });
              }}
              placeholder="500,000"
            />
          </div>
        </div>
        
        {/* Closing Date */}
        <div className="space-y-2">
          <Label htmlFor="closingDate">Closing Date *</Label>
          <Input
            id="closingDate"
            type="date"
            value={value.closingDate || ""}
            onChange={(e) => onChange({ closingDate: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            FinCEN reports must be filed within 30 days of closing
          </p>
        </div>
        
        {/* Legal Description - Required for FinCEN filing */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Legal Description</Label>
            {value.siteXData?.legal_description && (
              <Badge variant="secondary" className="text-xs">
                Auto-filled from title plant
              </Badge>
            )}
          </div>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="legalDescriptionType">Description Type *</Label>
              <Select
                value={value.legalDescriptionType || undefined}
                onValueChange={(v) => onChange({ legalDescriptionType: v })}
              >
                <SelectTrigger id="legalDescriptionType">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {LEGAL_DESCRIPTION_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Select the format of the legal description
              </p>
            </div>
            
            <div>
              <Label htmlFor="legalDescription">Legal Description *</Label>
              <Textarea
                id="legalDescription"
                value={value.legalDescription || ""}
                onChange={(e) => {
                  // Truncate to 1000 chars (FinCEN limit)
                  const text = e.target.value.slice(0, 1000);
                  onChange({ legalDescription: text });
                }}
                placeholder="Enter the legal description from the deed or title report..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(value.legalDescription?.length || 0)} / 1,000 characters
              </p>
            </div>
          </div>
        </div>
      </div>
    </StepCard>
  );
}
```

### File: `web/components/wizard/shared/index.ts`

```typescript
export { StepCard } from "./StepCard";
export { YesNoQuestion } from "./YesNoQuestion";
export { YesNoUnknownQuestion } from "./YesNoUnknownQuestion";
export { CheckboxList } from "./CheckboxList";
export { ExemptionAlert } from "./ExemptionAlert";
export { TransactionReferenceStep } from "./TransactionReferenceStep";
```

---

## Step 4: Create Hooks

### File: `web/components/wizard/hooks/useWizardState.ts`

```typescript
import { useState, useCallback } from "react";
import { 
  WizardState, 
  DeterminationState, 
  CollectionState,
  createInitialWizardState 
} from "../types";

export function useWizardState(initialData?: Partial<WizardState>) {
  const [state, setState] = useState<WizardState>(() => {
    const initial = createInitialWizardState();
    if (initialData) {
      return {
        ...initial,
        determination: { ...initial.determination, ...initialData.determination },
        collection: { ...initial.collection, ...initialData.collection },
        exemptionReason: initialData.exemptionReason,
      };
    }
    return initial;
  });
  
  const updateDetermination = useCallback((updates: Partial<DeterminationState>) => {
    setState((prev) => ({
      ...prev,
      determination: { ...prev.determination, ...updates },
    }));
  }, []);
  
  const updateCollection = useCallback((updates: Partial<CollectionState>) => {
    setState((prev) => ({
      ...prev,
      collection: { ...prev.collection, ...updates },
    }));
  }, []);
  
  const setExemptionReason = useCallback((reason: string) => {
    setState((prev) => ({
      ...prev,
      exemptionReason: reason,
    }));
  }, []);
  
  const reset = useCallback(() => {
    setState(createInitialWizardState());
  }, []);
  
  return {
    state,
    updateDetermination,
    updateCollection,
    setExemptionReason,
    reset,
  };
}
```

### File: `web/components/wizard/hooks/useWizardNavigation.ts`

```typescript
import { useMemo, useState, useCallback } from "react";
import { WizardState, StepId, DeterminationState, DeterminationResult } from "../types";

// ============================================================
// WIZARD NAVIGATION HOOK
// This is the brain - determines which steps are visible
// based on determination answers (FinCEN decision tree)
// ============================================================

export function useWizardNavigation(state: WizardState, reportStatus: string) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
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
      steps.push("transaction-details");
      steps.push("party-setup");
      steps.push("party-status");
      steps.push("reporting-person");
      steps.push("review-and-file");
    }
    
    return steps;
  }, [state.determination, reportStatus]);
  
  // Current step
  const currentStep = visibleSteps[currentStepIndex] || visibleSteps[0];
  
  // Current phase
  const phase = useMemo(() => {
    const collectionSteps: StepId[] = [
      "transaction-details",
      "party-setup", 
      "party-status",
      "reporting-person",
      "review-and-file"
    ];
    
    if (collectionSteps.includes(currentStep)) {
      return "collection";
    }
    return "determination";
  }, [currentStep]);
  
  // Navigation functions
  const goBack = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);
  
  const goNext = useCallback(() => {
    setCurrentStepIndex((prev) => Math.min(visibleSteps.length - 1, prev + 1));
  }, [visibleSteps.length]);
  
  const goToStep = useCallback((step: StepId) => {
    const index = visibleSteps.indexOf(step);
    if (index !== -1) {
      setCurrentStepIndex(index);
    }
  }, [visibleSteps]);
  
  // Can navigate?
  const canGoBack = currentStepIndex > 0;
  const canGoNext = currentStepIndex < visibleSteps.length - 1 && 
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
  return d.transferExemptions.length > 0 && 
    !d.transferExemptions.includes("none");
}

function computeDeterminationResult(d: DeterminationState): DeterminationResult | null {
  // Check 1: Transfer exemption
  if (hasTransferExemption(d)) {
    const exemptions = d.transferExemptions.filter(e => e !== "none");
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
      const exemptions = d.entityExemptions.filter(e => e !== "none");
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
      const exemptions = d.trustExemptions.filter(e => e !== "none");
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
```

### File: `web/components/wizard/hooks/useAutoSave.ts`

```typescript
import { useEffect, useRef, useCallback } from "react";
import { WizardState } from "../types";
import { updateReport } from "@/lib/api";

// ============================================================
// AUTO-SAVE HOOK
// Debounced save of wizard_data to the API
// ============================================================

export function useAutoSave(
  reportId: string,
  state: WizardState,
  debounceMs: number = 1000
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");
  
  const save = useCallback(async () => {
    const stateJson = JSON.stringify(state);
    
    // Skip if nothing changed
    if (stateJson === lastSavedRef.current) {
      return;
    }
    
    try {
      await updateReport(reportId, {
        wizard_data: state,
      });
      lastSavedRef.current = stateJson;
      console.log("[AutoSave] Saved wizard_data");
    } catch (error) {
      console.error("[AutoSave] Failed to save:", error);
    }
  }, [reportId, state]);
  
  // Debounced save on state change
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      save();
    }, debounceMs);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [state, save, debounceMs]);
  
  // Save immediately (for critical moments like step completion)
  const saveNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await save();
  }, [save]);
  
  return { saveNow };
}
```

### File: `web/components/wizard/hooks/index.ts`

```typescript
export { useWizardState } from "./useWizardState";
export { useWizardNavigation } from "./useWizardNavigation";
export { useAutoSave } from "./useAutoSave";
```

---

## Step 5: Create Index Exports

### File: `web/components/wizard/index.ts`

```typescript
// Types
export * from "./types";

// Constants
export * from "./constants";

// Shared components
export * from "./shared";

// Hooks
export * from "./hooks";

// Step components (will be added in Day 2 and 3)
// export * from "./determination";
// export * from "./collection";
```

---

## Testing Checklist (Day 1)

Before proceeding to Day 2, verify:

### 1. Types Compile
```bash
cd web && npx tsc --noEmit
```
Should have no errors in `components/wizard/` files.

### 2. Shared Components Render

Create a quick test page or use Storybook to verify:

```tsx
// Quick test in any page
import { 
  StepCard, 
  YesNoQuestion, 
  CheckboxList,
  ExemptionAlert 
} from "@/components/wizard";

// Render each and verify styling matches app
```

### 3. Hooks Work

```tsx
import { useWizardState, useWizardNavigation } from "@/components/wizard";

function TestComponent() {
  const { state, updateDetermination } = useWizardState();
  const { currentStep, visibleSteps } = useWizardNavigation(state, "draft");
  
  console.log("Current step:", currentStep);
  console.log("Visible steps:", visibleSteps);
  
  // Should log: "transfer-exemptions" and ["transfer-exemptions"]
}
```

### 4. Navigation Logic

Test the brain (`useWizardNavigation`) with these scenarios:

| Input | Expected visibleSteps |
|-------|----------------------|
| Empty state (no address) | `["transaction-reference"]` |
| Has address+escrow+price+date | `["transaction-reference", "transfer-exemptions"]` |
| ... + transferExemptions: ["death"] | `[..., "transfer-exemptions", "determination-result"]` |
| ... + transferExemptions: ["none"], isResidential: null | `[..., "transfer-exemptions", "property-type"]` |
| ... + isResidential: "no", hasIntentToBuild: "no" | `[..., "property-type", "determination-result"]` |
| ... + isResidential: "yes" | `[..., "property-type", "financing"]` |

---

## Success Criteria

✅ All files created in `web/components/wizard/`  
✅ TypeScript compiles with no errors  
✅ Shared components render correctly  
✅ `useWizardNavigation` returns correct steps for test scenarios  
✅ `useAutoSave` logs saves to console  

---

## DO NOT

- ❌ Touch the old `rrer-questionnaire.tsx`
- ❌ Modify any API endpoints
- ❌ Change `rrer-types.ts` (we'll import from it later)
- ❌ Proceed to Day 2 until all tests pass

---

## Next: Day 2

Once Day 1 passes all tests, proceed to Day 2 where we build the 7 determination step components.
