# Task: Wire AddressAutocomplete + SiteX into TransactionReferenceStep

## Goal

Replace manual address entry in the wizard's Step 0 with the existing `AddressAutocomplete` component, and auto-fill legal description from SiteX data.

---

## Files to Modify

### 1. `web/components/wizard/shared/TransactionReferenceStep.tsx`

**Current:** Manual address fields (street, city, state, zip)  
**New:** Use `AddressAutocomplete` component with SiteX integration

#### Changes Required

```tsx
// Add imports
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

// Add helper function to detect legal description type
function detectLegalDescriptionType(siteXData: any): "metes_and_bounds" | "lot_block_subdivision" | "other" {
  // If lot/block/subdivision data exists → Lot/Block/Subdivision
  if (siteXData?.lot_number || siteXData?.block_number || siteXData?.subdivision_name) {
    return "lot_block_subdivision";
  }
  
  // If description contains metes and bounds indicators
  const desc = (siteXData?.legal_description || "").toLowerCase();
  if (desc.includes("beginning at") || desc.includes("thence") || desc.includes("metes and bounds")) {
    return "metes_and_bounds";
  }
  
  // Default to other
  return "other";
}

// Replace the address Input fields with AddressAutocomplete
<AddressAutocomplete
  onSelect={(address, property) => {
    // Update address fields
    onChange("propertyAddress", {
      ...data.propertyAddress,
      street: address.street,
      city: address.city,
      state: address.state,
      zip: address.zip,
      county: address.county || data.propertyAddress.county,
    });
    
    // If SiteX returned property data, auto-fill additional fields
    if (property) {
      // Auto-fill APN if available
      if (property.apn) {
        onChange("apn", property.apn);
      }
      
      // Auto-fill legal description
      if (property.legal_description) {
        onChange("legalDescriptionText", property.legal_description);
        
        // Auto-detect and set legal description type
        const detectedType = detectLegalDescriptionType(property);
        onChange("legalDescriptionType", detectedType);
      }
      
      // Store full SiteX data for reference
      onChange("siteXData", property);
    }
  }}
  fetchPropertyData={true}
  showPropertyCard={true}
  placeholder="Start typing property address..."
  defaultValue={data.propertyAddress.street ? 
    `${data.propertyAddress.street}, ${data.propertyAddress.city}, ${data.propertyAddress.state} ${data.propertyAddress.zip}` 
    : ""
  }
/>
```

#### Keep These Fields Visible (for manual override)

After `AddressAutocomplete`, show the parsed address fields as read-only or editable:

```tsx
{/* Show parsed address for verification/manual edit */}
{data.propertyAddress.street && (
  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
    <div>
      <Label className="text-xs text-muted-foreground">Street</Label>
      <p className="text-sm">{data.propertyAddress.street}</p>
    </div>
    <div>
      <Label className="text-xs text-muted-foreground">City</Label>
      <p className="text-sm">{data.propertyAddress.city}</p>
    </div>
    <div>
      <Label className="text-xs text-muted-foreground">State</Label>
      <p className="text-sm">{data.propertyAddress.state}</p>
    </div>
    <div>
      <Label className="text-xs text-muted-foreground">ZIP</Label>
      <p className="text-sm">{data.propertyAddress.zip}</p>
    </div>
    {data.propertyAddress.county && (
      <div>
        <Label className="text-xs text-muted-foreground">County</Label>
        <p className="text-sm">{data.propertyAddress.county}</p>
      </div>
    )}
  </div>
)}
```

#### Legal Description Section Update

The legal description dropdown + text field should show "Auto-filled from title plant" badge when SiteX provided it:

```tsx
{/* Legal Description Type */}
<div className="space-y-2">
  <div className="flex items-center gap-2">
    <Label>Legal Description Type</Label>
    {data.siteXData?.legal_description && (
      <Badge variant="secondary" className="text-xs">Auto-detected</Badge>
    )}
  </div>
  <Select
    value={data.legalDescriptionType}
    onValueChange={(v) => onChange("legalDescriptionType", v)}
  >
    {/* ... options ... */}
  </Select>
</div>

{/* Legal Description Text */}
<div className="space-y-2">
  <div className="flex items-center gap-2">
    <Label>Legal Description</Label>
    {data.siteXData?.legal_description && (
      <Badge variant="secondary" className="text-xs">From title plant</Badge>
    )}
  </div>
  <Textarea
    value={data.legalDescriptionText}
    onChange={(e) => onChange("legalDescriptionText", e.target.value)}
    placeholder="e.g., LOT 5, BLOCK 2, SUNNY ACRES TRACT..."
    rows={3}
  />
</div>
```

---

### 2. `web/components/wizard/types.ts`

Add `siteXData` to the collection state if not already present:

```typescript
// In CollectionState or TransactionData
siteXData?: {
  apn?: string;
  legal_description?: string;
  legal_description_full?: string;
  subdivision_name?: string;
  lot_number?: string;
  block_number?: string;
  tract_number?: string;
  primary_owner?: {
    full_name?: string;
  };
  // ... other SiteX fields
} | null;
```

---

### 3. `web/app/(app)/app/reports/new/page.tsx`

Simplify to just create a blank report and redirect to wizard:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createReport } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";

export default function NewReportPage() {
  const router = useRouter();
  
  useEffect(() => {
    async function initReport() {
      try {
        // Create blank report
        const report = await createReport({
          // Minimal data - wizard will collect everything
        });
        
        // Redirect to wizard
        router.replace(`/app/reports/${report.id}/wizard`);
      } catch (error) {
        console.error("Failed to create report:", error);
        router.replace("/app/reports");
      }
    }
    
    initReport();
  }, [router]);
  
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <Spinner className="mx-auto" />
        <p className="text-muted-foreground">Creating new report...</p>
      </div>
    </div>
  );
}
```

---

### 4. Remove or Redirect `/app/requests/new/page.tsx`

If this page exists and is separate from `/app/reports/new`, either:

**Option A:** Delete it entirely if no longer used

**Option B:** Redirect to the reports flow:
```tsx
"use client";
import { redirect } from "next/navigation";
redirect("/app/reports/new");
```

---

## SiteX Field Mapping Reference

| SiteX Field | Maps To | Notes |
|-------------|---------|-------|
| `apn` | `collection.apn` | APN from title plant |
| `legal_description` | `collection.legalDescriptionText` | Brief legal description |
| `lot_number` | Used for type detection | If present → "lot_block_subdivision" |
| `block_number` | Used for type detection | If present → "lot_block_subdivision" |
| `subdivision_name` | Used for type detection | If present → "lot_block_subdivision" |
| `primary_owner.full_name` | Display only | Show "Owner of record" in property card |

---

## Testing Checklist

- [ ] Type address → Google autocomplete suggests
- [ ] Select address → SiteX lookup fires
- [ ] SiteX returns data → Address fields auto-fill
- [ ] SiteX returns legal description → `legalDescriptionText` auto-fills
- [ ] Legal description type auto-detected correctly:
  - [ ] Lot/block data → "lot_block_subdivision"
  - [ ] "Beginning at..." → "metes_and_bounds"  
  - [ ] Otherwise → "other"
- [ ] User can manually override any auto-filled field
- [ ] "Auto-filled" badges appear when SiteX provided data
- [ ] Works when SiteX is unavailable (graceful degradation)
- [ ] `/app/reports/new` creates blank report and redirects to wizard

---

## Do NOT

- ❌ Remove the legal description type dropdown (RERX requires it)
- ❌ Make legal description read-only (user may need to correct it)
- ❌ Break existing wizard functionality
- ❌ Remove manual address entry fallback (SiteX may be down)
