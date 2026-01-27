# CURSOR PROMPT: Fix 422 Error - Payload Mismatch

## Issue

The submission form is returning a `422 Unprocessable Entity` error. This means CORS is fixed and the API is receiving requests, but the request body doesn't match the expected schema.

---

## API Schema (What Backend Expects)

**File:** `api/app/routes/submission_requests.py`

```python
class PropertyAddress(BaseModel):
    street: str
    city: str
    state: str
    zip: str
    county: Optional[str] = None

class SubmissionRequestCreate(BaseModel):
    property_address: PropertyAddress      # Object, not string!
    purchase_price_cents: int              # In CENTS (multiply dollars by 100)
    expected_closing_date: date            # Format: "2026-02-15"
    escrow_number: Optional[str] = None
    financing_type: str                    # "cash" | "financed" | "unknown"
    buyer_name: str
    buyer_email: str                       # Valid email
    buyer_type: str                        # "individual" | "entity" | "trust"
    seller_name: str
    seller_email: Optional[str] = None
    seller_type: Optional[str] = "individual"
    notes: Optional[str] = None
```

---

## Frontend Fix

**File:** `web/app/(app)/app/requests/new/page.tsx`

Find the `handleSubmit` function and ensure the payload matches the API schema:

```typescript
const handleSubmit = async (e?: React.FormEvent) => {
  if (e) e.preventDefault();
  setIsSubmitting(true);
  setError(null);

  try {
    // Build the payload to match API schema EXACTLY
    const payload = {
      // Property address as OBJECT (not string)
      property_address: {
        street: formData.propertyAddress,      // or formData.street
        city: formData.propertyCity,           // or formData.city
        state: formData.propertyState,         // or formData.state
        zip: formData.propertyZip,             // or formData.zip
        county: formData.propertyCounty || null,
      },
      
      // Price in CENTS (multiply by 100)
      purchase_price_cents: Math.round(
        parseFloat(formData.purchasePrice.replace(/[,$]/g, '')) * 100
      ),
      
      // Date field name
      expected_closing_date: formData.closingDate,  // Format: "2026-02-15"
      
      // Optional escrow number
      escrow_number: formData.escrowNumber || null,
      
      // Financing type (lowercase)
      financing_type: formData.financingType?.toLowerCase() || "cash",
      
      // Buyer info (snake_case)
      buyer_name: formData.buyerName,
      buyer_email: formData.buyerEmail,
      buyer_type: formData.buyerType?.toLowerCase() || "entity",
      
      // Seller info (snake_case)
      seller_name: formData.sellerName,
      seller_email: formData.sellerEmail || null,
      seller_type: formData.sellerType?.toLowerCase() || "individual",
      
      // Optional notes
      notes: formData.notes || null,
    };

    console.log("Submitting payload:", payload);  // Debug logging

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/submission-requests`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("API error response:", errorData);  // Debug logging
      
      // Format validation errors for display
      if (errorData.detail && Array.isArray(errorData.detail)) {
        const messages = errorData.detail.map((err: any) => 
          `${err.loc?.join(' → ') || 'Field'}: ${err.msg}`
        ).join('\n');
        throw new Error(messages);
      }
      
      throw new Error(errorData.detail || 'Failed to submit request');
    }

    const result = await response.json();
    setRequestId(result.id);
    setIsSuccess(true);
    
  } catch (err) {
    console.error("Submission error:", err);
    setError(err instanceof Error ? err.message : 'An error occurred');
  } finally {
    setIsSubmitting(false);
  }
};
```

---

## Field Name Mapping

Make sure your form state uses these field names (or map them in the payload):

| Form Field | API Field | Type |
|------------|-----------|------|
| `propertyAddress` or `street` | `property_address.street` | string |
| `propertyCity` or `city` | `property_address.city` | string |
| `propertyState` or `state` | `property_address.state` | string |
| `propertyZip` or `zip` | `property_address.zip` | string |
| `propertyCounty` or `county` | `property_address.county` | string (optional) |
| `purchasePrice` | `purchase_price_cents` | int (cents!) |
| `closingDate` | `expected_closing_date` | date string "YYYY-MM-DD" |
| `escrowNumber` | `escrow_number` | string (optional) |
| `financingType` | `financing_type` | "cash" \| "financed" |
| `buyerName` | `buyer_name` | string |
| `buyerEmail` | `buyer_email` | valid email |
| `buyerType` | `buyer_type` | "individual" \| "entity" \| "trust" |
| `sellerName` | `seller_name` | string |
| `sellerEmail` | `seller_email` | valid email (optional) |
| `sellerType` | `seller_type` | string (optional) |

---

## Common Pitfalls

### 1. Price Conversion
```typescript
// WRONG - sends dollars as string
purchase_price_cents: formData.purchasePrice

// RIGHT - convert to cents integer
purchase_price_cents: Math.round(parseFloat(formData.purchasePrice.replace(/[,$]/g, '')) * 100)
```

### 2. Property Address as String
```typescript
// WRONG - single string
property_address: "123 Main St, Los Angeles, CA 90210"

// RIGHT - object with components
property_address: {
  street: "123 Main St",
  city: "Los Angeles",
  state: "CA",
  zip: "90210"
}
```

### 3. Date Format
```typescript
// WRONG - JavaScript Date object or wrong format
expected_closing_date: new Date()
expected_closing_date: "02/15/2026"

// RIGHT - ISO date string
expected_closing_date: "2026-02-15"
```

### 4. Email Validation
```typescript
// The API validates email format
// Make sure buyer_email is a valid email string
buyer_email: "contact@company.com"  // ✓
buyer_email: "not-an-email"          // ✗ will cause 422
```

---

## Debug: Add Console Logging

Temporarily add logging to see exactly what's being sent:

```typescript
console.log("=== SUBMISSION DEBUG ===");
console.log("Form data:", formData);
console.log("Payload being sent:", JSON.stringify(payload, null, 2));
```

Then check browser console to see:
1. What form data you have
2. What payload is being built
3. What error the API returns

---

## Test Payload (For Manual Testing)

You can test the API directly with curl:

```bash
curl -X POST https://pct-fin-cen-staging.onrender.com/submission-requests \
  -H "Content-Type: application/json" \
  -d '{
    "property_address": {
      "street": "123 Test Street",
      "city": "Los Angeles",
      "state": "CA",
      "zip": "90210"
    },
    "purchase_price_cents": 50000000,
    "expected_closing_date": "2026-02-15",
    "financing_type": "cash",
    "buyer_name": "Test Buyer LLC",
    "buyer_email": "buyer@test.com",
    "buyer_type": "entity",
    "seller_name": "Test Seller",
    "seller_email": "seller@test.com"
  }'
```

If this works but the frontend doesn't, the issue is in the payload construction.

---

## Update KilledSharks.md

```markdown
### 10. Fix 422 Payload Mismatch ✅

**Issue:** Submission form returned 422 error - payload didn't match API schema

**Root Cause:** Field name mismatches and data type issues:
- `propertyAddress` (string) vs `property_address` (object)
- `purchasePrice` (dollars) vs `purchase_price_cents` (cents)
- `closingDate` vs `expected_closing_date`

**Fix:** Updated payload construction to match API schema exactly

**Status:** ✅ Killed
```
