# Wizard Flow Analysis + Fix Duplicate Data Entry

## Goal

1. Understand the current wizard flow end-to-end
2. Fix: Property address asked twice (new report form + wizard)
3. Fix: First form missing Google autocomplete + SiteX integration
4. Principle: Minimize typing — autocomplete everything possible

---

## Step 1: Map the Current Flow

### Examine the new report entry form

```bash
# View the new report form that clients see first
cat web/app/\(app\)/app/reports/new/page.tsx
```

**Questions to answer:**
- What fields does it collect?
- Does it use AddressAutocomplete component?
- What data does it pass when creating the report?
- Where does it redirect after creation?

### Examine the wizard component

```bash
# View the main wizard component
cat web/components/rrer-questionnaire.tsx | head -200

# See the full structure
wc -l web/components/rrer-questionnaire.tsx

# Find all the steps/phases
grep -n "step\|phase\|Step\|Phase" web/components/rrer-questionnaire.tsx | head -40
```

**Questions to answer:**
- What steps/phases exist?
- Which step asks for property address?
- Which step asks for closing date?
- What's the step order?

### Examine the AddressAutocomplete component

```bash
# View the autocomplete component that should be used
cat web/components/AddressAutocomplete.tsx | head -100

# Check its props/interface
grep -n "interface\|Props\|props" web/components/AddressAutocomplete.tsx
```

---

## Step 2: Identify the Duplication

### Find all places property address is collected

```bash
# Search for property address fields across the app
grep -rn "propertyAddress\|property_address\|property-address" web/ --include="*.tsx" | head -30

# Search for closing date fields
grep -rn "closingDate\|closing_date\|closing-date" web/ --include="*.tsx" | head -30

# Find AddressFields or similar components
grep -rn "AddressFields\|AddressInput\|AddressAutocomplete" web/ --include="*.tsx" | head -20
```

### Map where data is collected vs. where it should be

| Field | New Report Form | Wizard Step | Should Be |
|-------|-----------------|-------------|-----------|
| Property Address | ? | ? | Once (entry form with autocomplete) |
| Closing Date | ? | ? | Once (entry form or wizard, not both) |
| Buyer Type | ? | ? | Wizard only (determination) |
| Payment Sources | ? | ? | Wizard only (collection) |

---

## Step 3: Understand Data Flow

### How does data pass from entry form to wizard?

```bash
# Check what the entry form sends to API
grep -n "fetch\|POST\|wizard_data" web/app/\(app\)/app/reports/new/page.tsx

# Check how wizard loads initial data
grep -n "wizard_data\|initialData\|useEffect" web/components/rrer-questionnaire.tsx | head -20

# Check the wizard page that wraps the component
cat web/app/\(app\)/app/reports/\[id\]/wizard/page.tsx | head -100
```

**Expected flow:**
1. Entry form creates Report with initial `wizard_data`
2. Wizard page loads Report and passes `wizard_data` to questionnaire
3. Questionnaire should use pre-filled data, not ask again

---

## Step 4: Proposed Fix

### Option A: Entry form collects minimal info, wizard does the rest

**Entry form collects:**
- Property address (with Google autocomplete + SiteX)
- Escrow number (optional)

**Wizard collects:**
- Closing date
- Buyer type (determination)
- Everything else

**Pros:** Clean separation
**Cons:** Wizard still has a lot to collect

### Option B: Entry form collects all "known upfront" info (RECOMMENDED)

**Entry form collects:**
- Property address (with Google autocomplete + SiteX)
- Closing date
- Purchase price
- Financing type (cash/financed)
- Escrow number

**Wizard collects:**
- Buyer type (determination)
- Buyer/seller details
- Payment sources

**Pros:** 
- Most "transaction basics" captured upfront
- Early exemption check possible (if financed → exempt immediately)
- Wizard focuses on compliance-specific questions

### Option C: Remove entry form entirely, wizard is the entry point

**Entry form:** None — client goes directly to wizard
**Wizard Step 1:** Property address with autocomplete + SiteX

**Pros:** Single flow, no duplication possible
**Cons:** Wizard becomes longer

---

## Step 5: Implementation — Fix Entry Form

### Add AddressAutocomplete to entry form

```tsx
// web/app/(app)/app/reports/new/page.tsx

import { AddressAutocomplete } from "@/components/AddressAutocomplete";

// In the form:
<AddressAutocomplete
  onSelect={(address, property) => {
    setFormData(prev => ({
      ...prev,
      propertyStreet: address.street,
      propertyCity: address.city,
      propertyState: address.state,
      propertyZip: address.zip,
      propertyCounty: address.county || "",
      // From SiteX
      apn: property?.apn || "",
      ownerName: property?.primary_owner?.full_name || "",
    }));
  }}
  fetchPropertyData={true}
  showPropertyCard={true}
  placeholder="Start typing property address..."
/>
```

### Pass complete data to wizard_data

```tsx
// When creating report:
const res = await fetch("/api/reports", {
  method: "POST",
  body: JSON.stringify({
    wizard_data: {
      collection: {
        propertyAddress: {
          street: formData.propertyStreet,
          city: formData.propertyCity,
          state: formData.propertyState,
          zip: formData.propertyZip,
          county: formData.propertyCounty,
        },
        closingDate: formData.closingDate,
        purchasePrice: formData.purchasePrice,
        apn: formData.apn,
        siteXData: formData.siteXData,  // Full SiteX response
      },
    },
  }),
});
```

---

## Step 6: Implementation — Fix Wizard to Not Re-ask

### Skip property address step if already filled

```tsx
// In rrer-questionnaire.tsx

// Check if property address is pre-filled
const hasPropertyAddress = Boolean(
  wizardData?.collection?.propertyAddress?.street
);

// Skip the property address step or show as read-only
{currentStep === "transaction-property" && (
  hasPropertyAddress ? (
    // Show as read-only confirmation
    <div className="bg-gray-50 p-4 rounded-lg">
      <p className="text-sm text-gray-500">Property Address</p>
      <p className="font-medium">
        {wizardData.collection.propertyAddress.street},
        {wizardData.collection.propertyAddress.city},
        {wizardData.collection.propertyAddress.state}
      </p>
      <Button variant="link" onClick={() => setEditingAddress(true)}>
        Edit
      </Button>
    </div>
  ) : (
    // Show full address input
    <AddressAutocomplete ... />
  )
)}
```

### Or remove the step entirely from wizard if entry form handles it

```tsx
// Define steps conditionally
const steps = [
  // Only include property step if not pre-filled
  ...(hasPropertyAddress ? [] : ["transaction-property"]),
  "transaction-details",  // Closing date, price (if not in entry form)
  "buyer-type",
  "determination",
  // ... rest of steps
];
```

---

## Step 7: Verify Changes

After implementation:

### Test the full flow
1. Log in as client_user
2. Click "Start New Report"
3. **Entry form should have:**
   - Address autocomplete (Google)
   - SiteX property card appears after selection
   - Closing date field
   - Continue button
4. Click Continue → Redirects to wizard
5. **Wizard should:**
   - Show property address as read-only (or skip step)
   - NOT ask for address again
   - NOT ask for closing date again (if collected in entry form)
   - Start with determination questions

### Check data persistence
```bash
# After creating a report, check the wizard_data in database
# Should see propertyAddress, closingDate, siteXData populated
```

---

## Summary of Files to Examine/Modify

| File | Examine | Modify |
|------|---------|--------|
| `web/app/(app)/app/reports/new/page.tsx` | Current fields | Add AddressAutocomplete |
| `web/components/rrer-questionnaire.tsx` | Step structure | Skip pre-filled steps |
| `web/components/AddressAutocomplete.tsx` | Props/usage | May need tweaks |
| `web/lib/rrer-types.ts` | wizard_data structure | Verify types |

---

## Commands to Run First

```bash
# 1. See the entry form
cat web/app/\(app\)/app/reports/new/page.tsx

# 2. See wizard steps structure  
grep -n "step\|Step\|currentStep" web/components/rrer-questionnaire.tsx | head -50

# 3. See where property address is asked in wizard
grep -n "propertyAddress\|AddressFields\|AddressAutocomplete" web/components/rrer-questionnaire.tsx

# 4. See the AddressAutocomplete component interface
grep -A20 "interface.*Props\|type.*Props" web/components/AddressAutocomplete.tsx
```

Run these and share the output. Then we'll know exactly what to change.
