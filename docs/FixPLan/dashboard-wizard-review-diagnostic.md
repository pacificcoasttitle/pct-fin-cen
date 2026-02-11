# Diagnostic + Enhancement: Dashboard, Wizard UX, and Ready-to-File Flow

## IMPORTANT: Run ALL diagnostics first. Paste ALL output. Do NOT make changes until you've gathered the full picture.

---

## DIAGNOSTIC PHASE — Run Everything Below

### D1: Dashboard Cards — Current State

```bash
# 1. Show the full dashboard page
cat web/app/\(app\)/app/dashboard/page.tsx

# 2. What colors/theme tokens are used?
grep -n "bg-\|text-\|border-\|className.*card\|gradient" web/app/\(app\)/app/dashboard/page.tsx | head -40

# 3. What stats does the dashboard fetch?
grep -n "fetch\|api\|stats\|useEffect\|getReport\|dashboard" web/app/\(app\)/app/dashboard/page.tsx | head -20

# 4. Show our theme/design tokens
grep -n "primary\|accent\|brand\|--" web/app/globals.css | head -30
cat tailwind.config.ts 2>/dev/null || cat tailwind.config.js 2>/dev/null | head -50
```

### D2: All Requests Page — Current Table

```bash
# 1. Show the requests page
cat web/app/\(app\)/app/requests/page.tsx

# 2. What table component is used?
grep -n "Table\|DataTable\|column\|sort\|header" web/app/\(app\)/app/requests/page.tsx | head -20

# 3. What columns exist?
grep -n "column\|header\|accessor\|key\|field" web/app/\(app\)/app/requests/page.tsx | head -20
```

### D3: New Request Button — Current Style

```bash
# Find the New Request button
grep -n "New Request\|new.*request\|Create.*Request\|new.*report" web/app/\(app\)/app/requests/page.tsx | head -10
grep -B 3 -A 5 "New Request\|new.*request" web/app/\(app\)/app/requests/page.tsx
```

### D4: Wizard Input Sizes + Centering

```bash
# 1. Current input component defaults
cat web/components/ui/input.tsx

# 2. Current textarea defaults
cat web/components/ui/textarea.tsx

# 3. Current select trigger defaults
grep -n "SelectTrigger\|className" web/components/ui/select.tsx | head -10

# 4. Current radio group styling
grep -n "className\|RadioGroupItem" web/components/ui/radio-group.tsx | head -10

# 5. Current checkbox styling
grep -n "className\|Checkbox" web/components/ui/checkbox.tsx | head -10

# 6. WizardContainer layout — check centering
grep -n "container\|max-w\|mx-auto\|flex\|justify\|items-center\|sidebar" web/components/wizard/WizardContainer.tsx | head -15

# 7. App layout — does it wrap content?
grep -n "main\|content\|children\|sidebar\|flex\|ml-\|pl-" web/app/\(app\)/layout.tsx | head -20

# 8. Profile page for comparison — how is it centered?
cat web/app/\(app\)/app/settings/page.tsx | head -30
```

### D5: Ready-to-File Flow — CRITICAL INVESTIGATION

```bash
# 1. What happens when a ready_to_file report is clicked?
grep -n "ready_to_file\|ready-to-file\|readyToFile" web/app/\(app\)/app/requests/page.tsx | head -10
grep -n "ready_to_file\|ready-to-file\|readyToFile" web/app/\(app\)/app/staff/queue/page.tsx 2>/dev/null | head -10

# 2. Where does clicking a request navigate to?
grep -n "router.push\|onClick\|href.*report" web/app/\(app\)/app/requests/page.tsx | head -15

# 3. Does a review page exist?
find web/app -path "*review*" -name "page.tsx" | head -5
find web/app -path "*file*" -name "page.tsx" | head -5

# 4. Show the review page if it exists
cat web/app/\(app\)/app/reports/\[id\]/review/page.tsx 2>/dev/null || echo "NO REVIEW PAGE EXISTS"

# 5. What does the filing endpoint expect?
grep -n "def file_report\|\/file\b" api/app/routes/reports.py | head -10
sed -n '/@router.*file/,/^@router\|^async def [a-z]/p' api/app/routes/reports.py | head -40

# 6. What status transitions exist?
grep -n "ready_to_file\|status.*filed\|filing_status" api/app/routes/reports.py | head -15

# 7. What certifications/checks are needed before filing?
grep -n "ready_check\|perform_ready_check\|ReadyCheck\|pre_file\|certification" api/app/services/ -r --include="*.py" | head -15
grep -A 30 "def perform_ready_check" api/app/services/filing_lifecycle.py 2>/dev/null || echo "No ready_check found"

# 8. Show the filing lifecycle — what's the full flow?
grep -n "def.*submit\|def.*file\|def.*accept\|def mark_" api/app/services/filing_lifecycle.py | head -20

# 9. Do we have any certifications or checkbox data in the model?
grep -n "certification\|attestation\|signature\|sign_off\|officer" api/app/models/report.py | head -10
grep -n "certification\|attestation\|signature\|sign_off\|officer" api/app/models/filing_submission.py | head -10
```

### D6: Dashboard Data Accuracy

```bash
# 1. What API endpoint powers the dashboard?
grep -n "dashboard\|stats\|summary" web/app/\(app\)/app/dashboard/page.tsx | head -10

# 2. Show the backend stats endpoint
grep -n "dashboard\|stats\|summary" api/app/routes/reports.py | head -10
grep -n "dashboard\|stats\|summary" api/app/routes/ -r --include="*.py" | head -10

# 3. How is demo data seeded? What reports exist?
grep -n "status\|ready_to_file\|filed\|exempt\|draft" api/app/services/demo_seed.py | head -20

# 4. Show dummy/demo report statuses
grep -A 5 "Report(" api/app/services/demo_seed.py | head -40
```

### D7: Filing Status Propagation — End to End

```bash
# 1. Executive dashboard stats endpoint
grep -n "executive\|exec.*stats" api/app/routes/reports.py | head -5
sed -n '/executive.stats\|exec.*stats/,/^@router/p' api/app/routes/reports.py | head -40

# 2. Admin reports page — does it show filing status?
grep -n "filing_status\|receipt_id\|filed" web/app/\(app\)/app/admin/reports/page.tsx | head -10

# 3. Staff queue — does it reflect filing?
grep -n "filing_status\|receipt_id\|filed" web/app/\(app\)/app/staff/queue/page.tsx 2>/dev/null | head -10

# 4. Client requests — receipt_id visible?
grep -n "receipt_id\|filing_status\|filed" web/app/\(app\)/app/requests/page.tsx | head -10
```

---

## STOP HERE — PASTE ALL OUTPUT ABOVE BEFORE PROCEEDING

After you paste all diagnostic output, I will provide specific fix instructions for each item.

---

## WHAT EACH FIX SHOULD ACCOMPLISH (for reference)

### Fix 1: Dashboard Cards — Theme Alignment + Icons

- All stat cards should use consistent colors from our theme (primary/accent)
- No mixed color systems (don't mix blue-500 with primary)
- Add relevant lucide-react icons to each card:
  - Total Requests → FileText
  - Pending/In Progress → Clock
  - Filed/Completed → CheckCircle2
  - Exempt → Shield
  - Draft → FilePen or Edit
- Cards should have subtle left border accent (like `border-l-4 border-l-primary`)

### Fix 2: Dashboard Stats Accuracy

- Stats must query from real data (even if it's demo/seed data)
- "Recent Activity" or "Recent Requests" table should show real recent items
- If the dashboard hardcodes any numbers, switch to API-driven data

### Fix 3: Requests Table — Sortable Columns

- Every column header should be clickable to sort asc/desc
- Show a sort indicator arrow (▲/▼) on the active sort column
- Default sort: most recent first (by created_at or updated_at desc)
- Columns to make sortable: Address, Status, Type, Date, Receipt ID (if shown)

### Fix 4: New Request Button

- Solid background using our primary/accent color — no gradient
- Slightly larger: `size="lg"` or custom padding `px-6 py-3`
- Keep it prominent at the top of the requests page

### Fix 5: Wizard Input Sizes

- All `<Input>` fields: increase height to `h-11` or `h-12` (from default h-9/h-10)
- Font size inside inputs: `text-base` (16px) not `text-sm` (14px)
- Border radius: `rounded-lg` (8px) for that bubbly iPhone feel
- `<Select>` triggers: same height and radius as inputs
- `<Textarea>`: same border radius, comfortable padding
- `<RadioGroup>` items: larger touch targets, `h-5 w-5` radio dots
- `<Checkbox>`: larger `h-5 w-5`
- Apply globally via the ui component files so it's consistent everywhere

### Fix 6: Wizard Centering

- The wizard content should be centered in the viewport, not hugging the sidebar
- Compare with the Profile/Settings page for reference
- The fix is likely in `WizardContainer.tsx` or the app layout
- May need `ml-0` or the layout wrapper to not offset the wizard content

### Fix 7: Ready-to-File → Review Page (CRITICAL)

This needs a proper review/certification page:

**Page:** `web/app/(app)/app/reports/[id]/review/page.tsx`

**Content:**
- Summary of the report (property, buyer, seller, payment — read from wizard_data)
- Certification checkboxes (minimum 3):
  1. "I certify that I have reviewed all information and it is accurate to the best of my knowledge"
  2. "I understand this filing will be submitted to FinCEN and cannot be altered after submission"
  3. "I am authorized to submit this filing on behalf of [company name]"
- All checkboxes must be checked before the Submit button is enabled
- Signature field: Text input where they type their full name
- Signature field must not be empty before Submit is enabled
- **Submit button** calls the existing `POST /reports/{id}/file` endpoint
- After successful filing, navigate to the appropriate confirmation page

**Navigation:**
- When a `ready_to_file` report is clicked from requests/queue → navigate to `/app/reports/{id}/review` NOT `/app/reports/{id}/wizard`
- The wizard should still be accessible but the default action for ready_to_file is Review

**Filing status should propagate to:**
- Client dashboard (filing summary card)
- Client requests table (status badge + receipt ID)
- Staff queue (filing status column)
- Admin reports (filing status + receipt ID)
- Executive dashboard (stats + recent filings)

---

## DO NOT

- ❌ Make ANY changes before pasting ALL diagnostic output
- ❌ Guess at color values — read them from the theme config
- ❌ Create the review page without understanding the filing endpoint first
- ❌ Change filing logic or status transitions
- ❌ Change backend determination logic
- ❌ Break mobile responsiveness
- ❌ Change data structures or API contracts
