# Fix: 5 Issues Found During Testing

## Issue 1: Remove Bed/Bath from Property Card

The SiteX property card shows bedrooms/bathrooms — not relevant for FinCEN compliance.

### File: `web/components/AddressAutocomplete.tsx`

Find where the property card renders bed/bath data (look for `Bedrooms`, `Bathrooms`, `bed`, `bath` in the JSX). Remove those fields from the property card display. Keep: APN, County, Owner, Legal Description, Property Type, Year Built, Assessed Value. Remove: Bedrooms, Bathrooms, Square Feet (if shown).

---

## Issue 2: Certificate PDF Generation — Corrupted Output

The on-screen certificate works. The PDF download produces a corrupted file. `PDFSHIFT_ENABLED=true` is set in Render.

### Diagnose first — run these and paste output:

```bash
# 1. Check if PDFSHIFT_API_KEY is set (not just ENABLED)
grep -n "PDFSHIFT" api/app/config.py
grep -n "pdfshift" api/app/services/pdf_service.py | head -20

# 2. Show the generate_certificate_pdf function
grep -n "def generate_certificate_pdf\|def generate_certificate_html\|def get_certificate_pdf" api/app/services/pdf_service.py

# 3. Show the certificate PDF endpoint
grep -n "certificate" api/app/routes/reports.py | head -10

# 4. Show the full certificate PDF endpoint handler
sed -n '/certificate\/pdf/,/^@router\|^async def [a-z]/p' api/app/routes/reports.py

# 5. Show the downloadCertificatePdf function in api.ts
grep -A 20 "downloadCertificatePdf\|certificate.*pdf\|certificatePdf" web/lib/api.ts

# 6. Check what content-type the endpoint returns
grep -n "content-type\|Content-Type\|application/pdf\|StreamingResponse\|FileResponse" api/app/services/pdf_service.py | head -10
```

Common causes of corrupted PDFs:
- `PDFSHIFT_API_KEY` not set (only `PDFSHIFT_ENABLED` set)
- HTML template has broken tags or missing closing elements
- Response not sent as `application/pdf` content type
- Frontend not handling blob response correctly

**After you paste the output**, apply the fix. Do NOT guess.

---

## Issue 3: Remove Back Button from Exempt Certificate Page — Replace with "Done"

Once a report is determined exempt, it should be **final**. No going back to alter the determination. The user can only view the certificate and start a new request.

### File: `web/app/(app)/app/reports/[id]/certificate/page.tsx`

Find the Back button in the action bar:

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => router.push("/app/requests")}
>
  <ArrowLeft className="h-4 w-4 mr-1" />
  Back
</Button>
```

Replace with:

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => router.push("/app/requests")}
>
  Done
</Button>
```

Remove the `ArrowLeft` import if it's no longer used anywhere in the file.

### Also: File `web/components/wizard/determination/DeterminationResultStep.tsx`

Find any "Back" or "Go Back" button on the exempt result screen. When `isReportable === false` (exempt), the user should NOT be able to go back to previous determination steps. 

Check if the bottom `WizardNavigation` shows a back button on the determination-result step. If so, the `WizardContainer` should hide the bottom nav when on the determination-result step. Check this line in WizardContainer.tsx:

```tsx
const showBottomNav = currentStep !== "determination-result";
```

If this line doesn't exist, find where `showBottomNav` is defined and add this condition. The determination-result step has its own action buttons (View Certificate / Begin Data Collection), so the generic back/next nav should be hidden.

---

## Issue 4: Verify Certificate ID is Stored in Database

The certificate shows `EXM-20260211-1E0F5711`. Verify this is persisted.

```bash
# 1. Where is certificate_id generated?
grep -rn "certificate_id\|generate_exemption_certificate_id\|EXM-" api/app/ --include="*.py" | head -15

# 2. Where is it stored?
grep -rn "certificate_id" api/app/models/ --include="*.py" | head -10

# 3. Is it in wizard_data or a column on the report?
grep -n "certificate_id" api/app/routes/reports.py | head -10

# 4. Check the generate function
grep -A 15 "def generate_exemption_certificate_id" api/app/services/early_determination.py 2>/dev/null || grep -A 15 "def generate_exemption_certificate_id" api/app/services/*.py
```

Paste the output. I need to confirm:
- The ID format matches what's generated (`EXM-YYYYMMDD-XXXXXXXX`)
- It's stored persistently (DB column or wizard_data JSONB)
- It's retrievable via the API (included in Report response)

---

## Issue 5: "Begin Data Collection" Button Does Nothing

### This is the critical bug.

When determination result is REPORTABLE and user clicks "Begin Data Collection", nothing happens. No navigation, no error in the UI.

**The console errors you see are NOT the cause:**
- `runtime.lastError` — Chrome extension noise (bfcache), harmless
- Google Maps `Autocomplete` deprecation — warning only, doesn't break anything
- `message channel closed` — Chrome extension artifact, not your code

**The real cause** is in the `DeterminationResultStep` click handler. Let me investigate.

### Diagnose:

```bash
# 1. Show the full DeterminationResultStep component
cat web/components/wizard/determination/DeterminationResultStep.tsx

# 2. Show the determine function in api.ts
grep -A 20 "export.*determine\|function determine\|const determine" web/lib/api.ts | head -30

# 3. Show what the /reports/{id}/determine endpoint does
sed -n '/determine_report\|\/determine/,/^@router\|^async def [a-z]/p' api/app/routes/reports.py | head -50

# 4. Check if there's a status guard — does the endpoint reject reports that are already exempt?
grep -n "status.*exempt\|already.*exempt\|report.status" api/app/routes/reports.py | head -10

# 5. What report status is the SECOND report in? (the one you're testing)
# If you can, check the network tab: what does the determine call return?
# Or check: does the button even have an onClick handler for the "reportable" case?
```

**My hypothesis:** The `DeterminationResultStep` has a `handleViewCertificate` for exempt, but the "Begin Data Collection" button's `onClick` may be calling the same `determine()` endpoint, which fails because the previous (exempt) report left something in a bad state, OR the `onBeginCollection` callback isn't wired properly to the parent `WizardContainer`.

Check the `DeterminationResultStep` for both handlers:
- `handleViewCertificate` (exempt path) 
- Whatever handles "Begin Data Collection" (reportable path) — this is likely `onBeginCollection` prop

Then check `WizardContainer.tsx` to see what's passed as `onBeginCollection`:

```bash
grep -n "onBeginCollection\|Begin.*Collection\|party-setup" web/components/wizard/WizardContainer.tsx
```

**Paste ALL diagnostic output before making changes.**

---

## Order of Operations

1. Fix #1 (bed/bath) — simple removal
2. Fix #3 (Done button) — simple swap  
3. Diagnose #2, #4, #5 — paste output
4. Fix based on findings

## DO NOT

- ❌ Fix #2 (PDF) without diagnosing first
- ❌ Fix #5 (Begin Collection) without diagnosing first
- ❌ Guess at the Begin Collection fix — this needs the actual code
- ❌ Change determination logic
- ❌ Change any data structures
