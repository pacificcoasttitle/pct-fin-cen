# 🔍 Bug Investigation — Diagnose Before Fix

## Instructions

**DO NOT FIX ANYTHING YET.** 

Run these diagnostic commands and report findings. We need to understand the root cause before making changes.

---

## Bug #5: Send Party Links Returns 400

The console shows:
```
POST /reports/{id}/party-links → 400 Bad Request
```

### Investigation Steps

**Step 1: Find the endpoint definition**

```bash
# Find the party-links endpoint in reports.py
grep -n "party-links\|party_links" api/app/routes/reports.py
```

**Report:** What line is the endpoint on? What's the function signature?

**Step 2: Check the request schema**

```bash
# Find what schema/model the endpoint expects
grep -n -A 20 "party-links" api/app/routes/reports.py
```

**Report:** What request body does it expect? (e.g., `party_ids: List[str]`?)

**Step 3: Check if parties exist before links can be created**

```bash
# Check if parties need to exist in database first
grep -n "ReportParty" api/app/routes/reports.py
```

**Report:** Does the endpoint query for existing parties? Does it validate they exist?

**Step 4: Find the frontend call**

```bash
# Find where createPartyLinks is defined
grep -n "party-links\|partyLinks\|createPartyLinks" web/lib/api.ts
```

**Report:** What is being sent in the request body?

**Step 5: Find where the button calls this**

```bash
# Find the Send Links button handler in wizard
grep -n "Send.*Link\|sendLink\|handleSend" web/components/rrer-questionnaire.tsx
```

**Report:** What data is passed to the API call? Are party IDs from database or from local state?

**Step 6: Check if parties are saved to database**

```bash
# Find where parties get created/saved
grep -n "POST.*parties\|create.*party\|save.*party" api/app/routes/reports.py
grep -n "ReportParty" api/app/routes/reports.py | head -20
```

**Report:** Is there a separate endpoint to create parties? Or are they created inline with the report?

---

## Bug #6: Sales Price Missing

### Investigation Steps

**Step 1: Check if purchasePrice exists in types**

```bash
grep -n "purchasePrice\|purchase_price\|salesPrice\|sale_price" web/lib/rrer-types.ts
```

**Report:** Is the field defined in `CollectionData`?

**Step 2: Check if it's in the wizard**

```bash
grep -n "purchasePrice\|purchase_price\|salesPrice\|Price" web/components/rrer-questionnaire.tsx | head -20
```

**Report:** Is there an input field for price? Which step is it in?

**Step 3: Check RERX builder usage**

```bash
grep -n "purchasePrice\|purchase_price\|TotalConsideration" api/app/services/fincen/rerx_builder.py
```

**Report:** How does the XML builder get the price? What field name does it expect?

---

## Bug #2: SiteX Data Not Auto-Filling

### Investigation Steps

**Step 1: Check AddressAutocomplete component**

```bash
# Find the onSelect callback signature
grep -n "onSelect\|onPropertyData" web/components/AddressAutocomplete.tsx | head -10
```

**Report:** What data does the callback provide?

**Step 2: Check wizard integration**

```bash
# Find where AddressAutocomplete is used in wizard
grep -n "AddressAutocomplete" web/components/rrer-questionnaire.tsx
```

**Report:** Is AddressAutocomplete used? What's passed to onSelect?

**Step 3: Check what fields are being set**

```bash
# Find the onSelect handler and what it sets
grep -n -A 30 "AddressAutocomplete" web/components/rrer-questionnaire.tsx
```

**Report:** Does the onSelect set `apn`, `county`, `legalDescription`?

**Step 4: Check if fields exist in form**

```bash
# Check if APN/county/legal description inputs exist
grep -n "apn\|APN\|legalDescription\|Legal Description" web/components/rrer-questionnaire.tsx | head -20
```

**Report:** Are there input fields for these? Or just state?

---

## Bug #4: Seller Entity Type Order

### Investigation Steps

**Step 1: Find seller section in wizard**

```bash
# Find where sellers are rendered
grep -n "seller\|Seller" web/components/rrer-questionnaire.tsx | head -30
```

**Report:** What line range is the seller form section?

**Step 2: Check the order of fields**

```bash
# Look at the seller form structure (get line numbers first, then view that section)
grep -n "seller.*type\|entityType.*seller\|Seller Type" web/components/rrer-questionnaire.tsx
```

**Report:** What comes first - type selection or name/email fields?

---

## Bug #1: Start Over Button

### Investigation Steps

**Step 1: Find the Start Over button**

```bash
grep -n "Start Over\|startOver\|Start New" web/components/rrer-questionnaire.tsx
```

**Report:** What does the onClick do? Does it navigate or reset state?

---

## Bug #3: Certificate PDF

### Investigation Steps

**Step 1: Check if PDF endpoint exists**

```bash
grep -n "certificate.*pdf\|pdf.*certificate" api/app/routes/reports.py
```

**Report:** Is there a `/reports/{id}/certificate/pdf` endpoint?

**Step 2: Check frontend certificate page**

```bash
# Find certificate page
ls -la web/app/\(app\)/app/reports/\[id\]/certificate/ 2>/dev/null || echo "Directory not found"
cat web/app/\(app\)/app/reports/\[id\]/certificate/page.tsx 2>/dev/null | head -50 || echo "File not found"
```

**Report:** Does the page exist? How does it generate PDF?

**Step 3: Check if PDFShift is configured**

```bash
grep -n "pdfshift\|PDFSHIFT" api/app/config.py
grep -n "pdfshift\|PDFSHIFT" api/app/services/pdf_service.py 2>/dev/null || echo "pdf_service.py not found"
```

**Report:** Is PDFShift configured? Is there a PDF service?

---

## Output Format

Create a report with this structure:

```markdown
# Bug Investigation Report

## Bug #5: Send Party Links (400 Error)

### Findings
- Endpoint location: `api/app/routes/reports.py` line XXX
- Request schema expects: [list fields]
- Frontend sends: [list fields]
- **Root Cause:** [explain mismatch or missing step]

### Recommended Fix
[Brief description of what needs to change]

## Bug #6: Sales Price Missing

### Findings
- Field in types: [Yes/No, where]
- Field in wizard UI: [Yes/No, where]
- RERX builder expects: [field name]
- **Root Cause:** [explain]

### Recommended Fix
[Brief description]

[... repeat for each bug ...]
```

---

## Remember

**INVESTIGATE ONLY. DO NOT MODIFY ANY CODE.**

We need the facts before we can fix correctly.
