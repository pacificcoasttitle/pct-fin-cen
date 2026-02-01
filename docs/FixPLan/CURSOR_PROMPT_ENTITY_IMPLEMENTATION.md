# CURSOR PROMPT: Entity Enhancements Implementation

## 📋 INVESTIGATION SUMMARY

Based on the recon, here's what we're working with:

| Feature | Status | Action |
|---------|--------|--------|
| Entity Subtype (Wizard) | ❌ Missing | Add to wizard |
| Indirect Ownership | ❌ Missing | Add to BeneficialOwnerCard |
| Trust BO Roles | ❌ Missing | Add to BeneficialOwnerCard |
| BOI Status | ❌ Missing | Add to wizard |
| Document Upload | ✅ Complete | No changes needed |

**Total estimated: ~180 lines of new code across 4 files**

---

## FILE MAP

```
Files to modify:
├── web/lib/rrer-types.ts                      (TypeScript interfaces)
├── web/components/rrer-questionnaire.tsx      (Main wizard - 4500 lines)
├── web/components/party-portal/types.ts       (Party portal types)
└── web/components/party-portal/BeneficialOwnerCard.tsx (BO form)
```

---

## PHASE 1: UPDATE TYPESCRIPT INTERFACES

### 1A: Update DeterminationState

**File:** `web/lib/rrer-types.ts`
**Location:** Line ~296 (DeterminationState interface)

Add these fields to the existing interface:

```typescript
// Find this interface and ADD these fields:
export interface DeterminationState {
  // ... existing fields ...
  isResidential: YesNoUnknown;
  hasIntentToBuild: YesNoUnknown;
  isNonFinanced: YesNoUnknown;
  lenderHasAml: YesNoUnknown;
  buyerType: BuyerType;
  individualExemptions: string[];
  entityExemptions: string[];
  trustExemptions: string[];
  
  // ADD THESE NEW FIELDS:
  entitySubtype?: EntitySubtype;
  buyerBoiStatus?: BoiStatus;
  buyerFincenId?: string;
}

// ADD these new type definitions (near other type definitions):
export type EntitySubtype = 
  | "llc" 
  | "corporation_domestic" 
  | "corporation_foreign" 
  | "partnership" 
  | "pension_plan" 
  | "other";

export type BoiStatus = "filed" | "not_filed" | "exempt" | "unknown";

// ADD constant for entity subtype options (for UI dropdowns):
export const ENTITY_SUBTYPE_OPTIONS: { value: EntitySubtype; label: string; description: string }[] = [
  { value: "llc", label: "LLC", description: "Limited Liability Company" },
  { value: "corporation_domestic", label: "Domestic Corporation", description: "U.S. incorporated company" },
  { value: "corporation_foreign", label: "Foreign Entity", description: "Incorporated outside the U.S." },
  { value: "partnership", label: "Partnership", description: "General or Limited Partnership" },
  { value: "pension_plan", label: "Pension/Retirement Plan", description: "ERISA, government, or church plan" },
  { value: "other", label: "Other", description: "Other entity type" },
];

// ADD constant for BOI status options:
export const BOI_STATUS_OPTIONS: { value: BoiStatus; label: string }[] = [
  { value: "filed", label: "Yes, BOI report filed with FinCEN" },
  { value: "not_filed", label: "No, not yet filed" },
  { value: "exempt", label: "Exempt from BOI reporting" },
  { value: "unknown", label: "Unknown" },
];

// ADD constant for document checklists per entity type:
export const ENTITY_DOCUMENT_CHECKLIST: Record<EntitySubtype, string[]> = {
  llc: [
    "Articles of Organization",
    "Operating Agreement", 
    "Member List with Ownership Percentages",
    "EIN Documentation",
  ],
  corporation_domestic: [
    "Articles of Incorporation",
    "Bylaws",
    "Statement of Information",
    "Shareholder Roster",
    "Officer/Director List",
  ],
  corporation_foreign: [
    "Foreign Formation Documents (certified)",
    "English translation (if applicable)",
    "U.S. Registration (if applicable)",
    "Foreign Tax ID or EIN",
  ],
  partnership: [
    "Partnership Agreement",
    "Partner List with Ownership Percentages",
    "EIN Documentation",
  ],
  pension_plan: [
    "Plan Trust Agreement",
    "Adoption Agreement",
    "Plan Sponsor Information",
    "IRS Qualification Documentation",
  ],
  other: [
    "Formation/Organization Documents",
    "Ownership Documentation",
    "Tax ID Documentation",
  ],
};
```

### 1B: Update BeneficialOwner Interface

**File:** `web/lib/rrer-types.ts`
**Location:** Line ~79 (BeneficialOwner interface - if it exists here)

```typescript
// Find BeneficialOwner interface and ADD these fields:
export interface BeneficialOwner {
  // ... existing fields ...
  
  // ADD THESE NEW FIELDS:
  is_indirect_owner?: boolean;
  indirect_entity_name?: string;
  trust_role?: TrustRole;
}

// ADD this type:
export type TrustRole = "trustee" | "settlor" | "beneficiary" | "power_holder" | "other";

export const TRUST_ROLE_OPTIONS: { value: TrustRole; label: string }[] = [
  { value: "trustee", label: "Trustee" },
  { value: "settlor", label: "Settlor/Grantor" },
  { value: "beneficiary", label: "Beneficiary" },
  { value: "power_holder", label: "Power of Appointment Holder" },
  { value: "other", label: "Other" },
];
```

### 1C: Update Party Portal Types

**File:** `web/components/party-portal/types.ts`
**Location:** Line ~12 (BeneficialOwnerData interface)

```typescript
// Find BeneficialOwnerData interface and ADD these fields:
export interface BeneficialOwnerData {
  // ... existing fields ...
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  // ... other existing fields ...
  
  // ADD THESE NEW FIELDS:
  is_indirect_owner?: boolean;
  indirect_entity_name?: string;
  trust_role?: "trustee" | "settlor" | "beneficiary" | "power_holder" | "other";
}
```

---

## PHASE 2: ADD ENTITY SUBTYPE TO WIZARD

**File:** `web/components/rrer-questionnaire.tsx`
**Location:** After buyer-type step (~line 1337)

### 2A: Add Entity Subtype UI

Find the buyer-type step UI section (around line 1292-1337). AFTER the buyer type radio selection for "entity", add the subtype selector:

```tsx
// Inside the buyer-type step, AFTER the RadioGroup for buyerType
// Add this CONDITIONALLY when buyerType === "entity":

{determination.buyerType === "entity" && (
  <div className="mt-6 space-y-4">
    <div>
      <Label className="text-base font-medium">What type of entity is the buyer?</Label>
      <p className="text-sm text-muted-foreground mt-1">
        Select the specific entity type for accurate document requirements
      </p>
    </div>
    
    <RadioGroup
      value={determination.entitySubtype || ""}
      onValueChange={(value) => 
        setDetermination(prev => ({ ...prev, entitySubtype: value as EntitySubtype }))
      }
      className="grid grid-cols-1 md:grid-cols-2 gap-3"
    >
      {ENTITY_SUBTYPE_OPTIONS.map((option) => (
        <div key={option.value} className="flex items-center space-x-2">
          <RadioGroupItem value={option.value} id={`subtype-${option.value}`} />
          <Label 
            htmlFor={`subtype-${option.value}`} 
            className="flex flex-col cursor-pointer"
          >
            <span className="font-medium">{option.label}</span>
            <span className="text-xs text-muted-foreground">{option.description}</span>
          </Label>
        </div>
      ))}
    </RadioGroup>
    
    {/* Document Checklist - shows after subtype selected */}
    {determination.entitySubtype && (
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-blue-800">
            Documents to Have on File
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="text-sm text-blue-700 space-y-1">
            {ENTITY_DOCUMENT_CHECKLIST[determination.entitySubtype].map((doc, i) => (
              <li key={i} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>{doc}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    )}
  </div>
)}
```

### 2B: Add BOI Status Question

Add this AFTER the entity subtype selection (still within the entity flow):

```tsx
{/* BOI Status - only for entities that need BOI reporting */}
{determination.buyerType === "entity" && 
 determination.entitySubtype && 
 determination.entitySubtype !== "pension_plan" && (
  <div className="mt-6 space-y-4">
    <div>
      <Label className="text-base font-medium">
        Has this entity filed its Beneficial Ownership Information (BOI) report with FinCEN?
      </Label>
    </div>
    
    <RadioGroup
      value={determination.buyerBoiStatus || ""}
      onValueChange={(value) => 
        setDetermination(prev => ({ ...prev, buyerBoiStatus: value as BoiStatus }))
      }
      className="space-y-2"
    >
      {BOI_STATUS_OPTIONS.map((option) => (
        <div key={option.value} className="flex items-center space-x-2">
          <RadioGroupItem value={option.value} id={`boi-${option.value}`} />
          <Label htmlFor={`boi-${option.value}`} className="cursor-pointer">
            {option.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
    
    {/* FinCEN ID input if BOI filed */}
    {determination.buyerBoiStatus === "filed" && (
      <div className="mt-3">
        <Label htmlFor="fincen-id">FinCEN ID (optional)</Label>
        <Input
          id="fincen-id"
          placeholder="Enter FinCEN ID if available"
          value={determination.buyerFincenId || ""}
          onChange={(e) => 
            setDetermination(prev => ({ ...prev, buyerFincenId: e.target.value }))
          }
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          If available, this can help verify beneficial owner information
        </p>
      </div>
    )}
    
    {/* Warning if BOI not filed */}
    {determination.buyerBoiStatus === "not_filed" && (
      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-700 text-sm">
          Note: Most entities are required to file BOI reports with FinCEN. 
          This may be a compliance concern for the buyer.
        </AlertDescription>
      </Alert>
    )}
  </div>
)}
```

### 2C: Add Required Imports

At the top of `rrer-questionnaire.tsx`, ensure these are imported:

```tsx
import { 
  ENTITY_SUBTYPE_OPTIONS, 
  ENTITY_DOCUMENT_CHECKLIST,
  BOI_STATUS_OPTIONS,
  EntitySubtype,
  BoiStatus,
} from "@/lib/rrer-types";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
```

---

## PHASE 3: ADD INDIRECT OWNERSHIP TO BO CARD

**File:** `web/components/party-portal/BeneficialOwnerCard.tsx`
**Location:** After the control_type checkboxes (~line 250)

### 3A: Add Indirect Ownership Section

Find the section where control_type checkboxes are rendered. AFTER that section, add:

```tsx
{/* Indirect Ownership Section */}
<div className="space-y-3 pt-4 border-t">
  <div className="flex items-start space-x-2">
    <Checkbox
      id={`indirect-${owner.id}`}
      checked={owner.is_indirect_owner || false}
      onCheckedChange={(checked) => 
        onUpdate({ ...owner, is_indirect_owner: checked as boolean })
      }
    />
    <div className="grid gap-1.5 leading-none">
      <Label
        htmlFor={`indirect-${owner.id}`}
        className="text-sm font-medium cursor-pointer"
      >
        This person owns through another entity (indirect ownership)
      </Label>
      <p className="text-xs text-muted-foreground">
        Check if ownership is held through an LLC, corporation, or other entity
      </p>
    </div>
  </div>
  
  {owner.is_indirect_owner && (
    <div className="ml-6 space-y-2">
      <Label htmlFor={`indirect-entity-${owner.id}`}>
        Through which entity?
      </Label>
      <Input
        id={`indirect-entity-${owner.id}`}
        placeholder="e.g., ABC Holdings LLC"
        value={owner.indirect_entity_name || ""}
        onChange={(e) => 
          onUpdate({ ...owner, indirect_entity_name: e.target.value })
        }
      />
      <p className="text-xs text-muted-foreground">
        The entity through which this person holds their ownership interest
      </p>
    </div>
  )}
</div>
```

### 3B: Add Indirect Ownership Guidance Alert

At the TOP of the beneficial owners section (in the parent component that renders BO cards), add this guidance:

```tsx
{/* Add this guidance above the BO cards list */}
<Alert className="mb-4 bg-amber-50 border-amber-200">
  <AlertTriangle className="h-4 w-4 text-amber-600" />
  <AlertTitle className="text-amber-800">Indirect Ownership</AlertTitle>
  <AlertDescription className="text-amber-700">
    <p className="mb-2">
      If any owner holds their interest through another entity (e.g., a member 
      is itself a corporation), identify the <strong>individuals</strong> who 
      ultimately own or control through those entities.
    </p>
    <p className="text-sm">
      Example: If ABC Corp owns 40% of the buyer, and John Smith owns 100% of 
      ABC Corp, then John Smith is a beneficial owner with 40% indirect interest.
    </p>
  </AlertDescription>
</Alert>
```

---

## PHASE 4: ADD TRUST BO ROLES

**File:** `web/components/party-portal/BeneficialOwnerCard.tsx`

### 4A: Accept parentEntityType Prop

Update the component props to accept the parent entity type:

```tsx
interface BeneficialOwnerCardProps {
  owner: BeneficialOwnerData;
  onUpdate: (owner: BeneficialOwnerData) => void;
  onRemove: () => void;
  parentEntityType?: "entity" | "trust";  // ADD THIS PROP
}

export function BeneficialOwnerCard({ 
  owner, 
  onUpdate, 
  onRemove,
  parentEntityType = "entity",  // Default to entity
}: BeneficialOwnerCardProps) {
```

### 4B: Add Trust Role Selector

At the TOP of the card form (before first_name field), add:

```tsx
{/* Trust Role - only show for trust buyers */}
{parentEntityType === "trust" && (
  <div className="space-y-2 pb-4 border-b mb-4">
    <Label htmlFor={`trust-role-${owner.id}`}>Role in Trust *</Label>
    <Select
      value={owner.trust_role || ""}
      onValueChange={(value) => 
        onUpdate({ ...owner, trust_role: value as TrustRole })
      }
    >
      <SelectTrigger id={`trust-role-${owner.id}`}>
        <SelectValue placeholder="Select role in trust..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="trustee">Trustee</SelectItem>
        <SelectItem value="settlor">Settlor/Grantor</SelectItem>
        <SelectItem value="beneficiary">Beneficiary</SelectItem>
        <SelectItem value="power_holder">Power of Appointment Holder</SelectItem>
        <SelectItem value="other">Other</SelectItem>
      </SelectContent>
    </Select>
  </div>
)}
```

### 4C: Add Trust BO Guidance

In the parent component that shows BOs for trusts, add this guidance:

```tsx
{/* Trust-specific guidance - show when buyer is a trust */}
{buyerType === "trust" && (
  <Alert className="mb-4 bg-teal-50 border-teal-200">
    <ScrollText className="h-4 w-4 text-teal-600" />
    <AlertTitle className="text-teal-800">Trust Beneficial Owners</AlertTitle>
    <AlertDescription className="text-teal-700">
      <p className="mb-2">For trusts, beneficial owners typically include:</p>
      <ul className="list-disc list-inside space-y-1 text-sm">
        <li><strong>Trustee(s)</strong> - who manage the trust</li>
        <li><strong>Settlor/Grantor</strong> - if they retain revocation powers</li>
        <li><strong>Beneficiaries</strong> - with present rights to trust assets</li>
        <li><strong>Anyone</strong> with power to dispose of trust assets</li>
      </ul>
    </AlertDescription>
  </Alert>
)}
```

### 4D: Update Parent Components

**File:** `web/components/party-portal/BuyerTrustForm.tsx`

When rendering BeneficialOwnerCard components, pass the parentEntityType:

```tsx
{beneficialOwners.map((owner, index) => (
  <BeneficialOwnerCard
    key={owner.id}
    owner={owner}
    onUpdate={(updated) => updateBeneficialOwner(index, updated)}
    onRemove={() => removeBeneficialOwner(index)}
    parentEntityType="trust"  // ADD THIS
  />
))}
```

**File:** `web/components/party-portal/BuyerEntityForm.tsx`

```tsx
{beneficialOwners.map((owner, index) => (
  <BeneficialOwnerCard
    key={owner.id}
    owner={owner}
    onUpdate={(updated) => updateBeneficialOwner(index, updated)}
    onRemove={() => removeBeneficialOwner(index)}
    parentEntityType="entity"  // ADD THIS
  />
))}
```

---

## PHASE 5: ADD REQUIRED IMPORTS

Ensure all files have necessary imports:

### In BeneficialOwnerCard.tsx:

```tsx
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ScrollText } from "lucide-react";
```

---

## VERIFICATION CHECKLIST

Run through these to confirm implementation:

### Phase 1: Types
- [ ] `EntitySubtype` type exists in rrer-types.ts
- [ ] `BoiStatus` type exists in rrer-types.ts
- [ ] `TrustRole` type exists in rrer-types.ts
- [ ] `ENTITY_SUBTYPE_OPTIONS` constant exists
- [ ] `BOI_STATUS_OPTIONS` constant exists
- [ ] `ENTITY_DOCUMENT_CHECKLIST` constant exists
- [ ] `DeterminationState` has new fields
- [ ] `BeneficialOwnerData` has new fields

### Phase 2: Wizard
- [ ] Entity subtype selector appears when buyer_type = "entity"
- [ ] Document checklist shows based on subtype
- [ ] BOI status question appears for non-pension entities
- [ ] FinCEN ID input appears when BOI status = "filed"
- [ ] Warning shows when BOI status = "not_filed"
- [ ] All new fields persist on auto-save

### Phase 3: Indirect Ownership
- [ ] Checkbox appears in BeneficialOwnerCard
- [ ] Entity name input appears when checked
- [ ] Guidance alert shows above BO list

### Phase 4: Trust Roles
- [ ] Role dropdown appears for trust buyers only
- [ ] Trust guidance alert shows for trust buyers
- [ ] parentEntityType prop passed correctly

### Phase 5: No Errors
- [ ] TypeScript compiles without errors
- [ ] No console errors in browser
- [ ] Auto-save works with new fields

---

## TESTING SCENARIOS

1. **Create new report → Select Entity buyer → LLC**
   - Verify subtype selector appears
   - Verify LLC document checklist shows
   - Verify BOI status question appears
   
2. **Create new report → Select Entity buyer → Pension Plan**
   - Verify subtype selector appears
   - Verify BOI status question does NOT appear (pensions often exempt)

3. **Add Beneficial Owner → Mark as indirect**
   - Verify checkbox works
   - Verify entity name input appears

4. **Create new report → Select Trust buyer → Add BO**
   - Verify trust role dropdown appears
   - Verify trust guidance shows

5. **Save and refresh → Resume**
   - Verify all new fields persist

---

**🎯 IMPLEMENTATION READY. EXECUTE PHASES 1-5 IN ORDER.**
