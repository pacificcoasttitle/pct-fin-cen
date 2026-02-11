# Fix: Use Existing AddressAutocomplete — NOT AddressPropertyLookup

## Problem

The wizard's `TransactionReferenceStep.tsx` is importing a NEW component called `AddressPropertyLookup` that Cursor created. This component calls `/api/property/lookup` which **does not exist** on our backend. Our backend route is `/property/lookup` (no `/api` prefix).

We already have a working component called `AddressAutocomplete` (built in Shark #43) that calls the correct URL. **Use it. Do not create a new component.**

## What To Do

### Step 1: Open `web/components/wizard/shared/TransactionReferenceStep.tsx`

Find and replace the import. It will look something like one of these:

```tsx
// WRONG — find this and remove it:
import AddressPropertyLookup from "@/components/AddressPropertyLookup";
// OR
import { AddressPropertyLookup } from "@/components/AddressPropertyLookup";
```

Replace with:

```tsx
// CORRECT — use the existing component:
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
```

### Step 2: Replace the JSX usage

Find where `<AddressPropertyLookup` is used in the render. Replace it with:

```tsx
<AddressAutocomplete
  onSelect={(address, property) => {
    // Update address fields
    onChange({
      propertyAddress: {
        street: address.street,
        city: address.city,
        state: address.state,
        zip: address.zip,
        county: address.county || "",
      },
      apn: property?.apn || value.apn,
      siteXData: property || null,
    });

    // Auto-fill legal description if SiteX returned it
    if (property?.legal_description) {
      onChange({
        legalDescription: property.legal_description,
        legalDescriptionType: detectLegalDescriptionType(property),
      });
    }
  }}
  fetchPropertyData={true}
  showPropertyCard={true}
  placeholder="Start typing property address..."
  defaultValue={
    address.street
      ? `${address.street}, ${address.city}, ${address.state} ${address.zip}`
      : ""
  }
/>
```

### Step 3: Add this helper function (if not already present) above the component:

```tsx
function detectLegalDescriptionType(
  siteXData: any
): "metes_and_bounds" | "lot_block_subdivision" | "other" {
  if (
    siteXData?.lot_number ||
    siteXData?.block_number ||
    siteXData?.subdivision_name
  ) {
    return "lot_block_subdivision";
  }
  const desc = (siteXData?.legal_description || "").toLowerCase();
  if (
    desc.includes("beginning at") ||
    desc.includes("thence") ||
    desc.includes("metes and bounds")
  ) {
    return "metes_and_bounds";
  }
  return "other";
}
```

### Step 4: Delete the unused component

```bash
rm web/components/AddressPropertyLookup.tsx
```

If anything else imports `AddressPropertyLookup`, change those imports to `AddressAutocomplete` as well:

```bash
grep -rn "AddressPropertyLookup" web/ --include="*.tsx" --include="*.ts"
```

If that returns results, fix each one the same way.

## DO NOT

- ❌ Create any new components
- ❌ Change the backend route prefix
- ❌ Add `/api` to any frontend URL
- ❌ Modify `AddressAutocomplete.tsx` 
- ❌ Modify `api/app/routes/property.py`

## Why This Works

Our deployed backend (`api/app/main.py`) mounts routes with NO `/api` prefix:

```python
app.include_router(property_router)  # → /property/lookup
```

The existing `AddressAutocomplete` component already calls `/property/lookup`. It was built and tested in Shark #43. It works.

## After You're Done

1. Run `npx tsc --noEmit` — no TypeScript errors
2. `grep -rn "AddressPropertyLookup" web/` — should return ZERO results
3. `grep -rn "/api/property" web/` — should return ZERO results
4. Commit and push
5. Verify on staging: type an address → select from dropdown → SiteX data appears
