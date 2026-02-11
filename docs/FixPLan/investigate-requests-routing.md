# Microscopic Investigation: Requests Page Routing, Actions, & Address Display

## Problem

The All Requests page has 5 tabs (Active, Ready to File, Filed, Exempt, Drafts) — each with contextual action buttons. But pressing ANY action button navigates to Step 0 of the wizard (Transaction Reference). The routing is not context-aware.

Additionally, many rows show "Pending" for the address column instead of the actual property address.

## INVESTIGATE EVERYTHING — Change NOTHING

---

### I1: Full Action Button Mapping

Show me EVERY action button/link in the requests table and where it navigates for each tab/status.

```bash
# 1. Show ALL onClick, router.push, href, and Link references in the requests page
grep -n "router.push\|onClick\|href=\|Link " web/app/\(app\)/app/requests/page.tsx | head -40

# 2. Show the full Actions column rendering — find the contextual button/dropdown
# Look for the last <td> or Actions column in each row
grep -B 2 -A 15 "Actions\|action\|dropdown\|DropdownMenu\|contextual" web/app/\(app\)/app/requests/page.tsx | head -60

# 3. Show any status-based routing logic
grep -B 3 -A 10 "status.*===\|status.*==\|ready_to_file\|exempt\|filed\|draft\|collecting\|awaiting" web/app/\(app\)/app/requests/page.tsx | head -80

# 4. Show the full row click handler if rows are clickable
grep -B 2 -A 10 "onClick.*row\|tr.*onClick\|handleRowClick\|handleClick" web/app/\(app\)/app/requests/page.tsx | head -30
```

### I2: What SHOULD Each Tab's Action Do?

For each tab, tell me what the current action does vs what it should do:

```bash
# Show the full table body rendering — I need to see how each row renders its action based on status
sed -n '/<tbody/,/<\/tbody>/p' web/app/\(app\)/app/requests/page.tsx 2>/dev/null || echo "No tbody tags found"

# If the table doesn't use tbody tags, show the map/loop that renders rows
grep -B 5 -A 30 "\.map\|\.filter.*map\|requests.*map\|filteredRequest" web/app/\(app\)/app/requests/page.tsx | head -80
```

### I3: Address Column — Why "Pending"?

```bash
# 1. Show how the address is rendered in each row
grep -B 2 -A 10 "address\|Address\|propertyAddress\|property_address\|Pending" web/app/\(app\)/app/requests/page.tsx | head -40

# 2. What field is the address pulled from?
grep -n "street\|city\|state\|zip\|property_address\|propertyAddress\|wizard_data" web/app/\(app\)/app/requests/page.tsx | head -20

# 3. Show the data model — what does the API return for each request?
grep -B 2 -A 20 "interface.*Request\|type.*Request\|SubmissionRequest\|Report.*{" web/lib/api.ts | head -40

# 4. Is address stored on the request object or nested in wizard_data?
grep -n "property_address\|propertyAddress\|address" web/lib/rrer-types.ts | head -10

# 5. What does the API actually return? Show the list endpoint
grep -n "submission-request\|submission_request\|get.*request" api/app/routes/ -r --include="*.py" | head -10

# 6. Show the schema for what's returned
grep -B 2 -A 20 "class.*SubmissionRequest\|class.*Request.*Response\|class.*Request.*Schema" api/app/schemas/ -r --include="*.py" | head -40

# 7. Does the list endpoint include wizard_data or just top-level fields?
grep -n "wizard_data\|property_address\|address" api/app/schemas/ -r --include="*.py" | head -10
```

### I4: Draft Behavior — Is Progress Saved?

```bash
# 1. When does auto-save trigger?
grep -n "autoSave\|auto_save\|useAutoSave\|debounce\|saveNow" web/components/wizard/hooks/useAutoSave.ts | head -15

# 2. What wizard_step is saved?
grep -n "wizard_step\|currentStep\|step_index" web/components/wizard/hooks/useAutoSave.ts | head -10

# 3. When the wizard loads, does it restore the last step?
grep -n "wizard_step\|initialStep\|savedStep\|resume\|restore" web/components/wizard/WizardContainer.tsx | head -15
grep -n "wizard_step\|initialStep\|savedStep\|resume\|restore" web/components/wizard/hooks/useWizardNavigation.ts | head -15

# 4. What status is a draft report in?
grep -n "draft\|Draft" api/app/services/demo_seed.py | head -10

# 5. When a user navigates away from the wizard mid-flow, what happens?
grep -n "beforeunload\|onBeforeUnload\|unmount\|cleanup\|useEffect.*return" web/components/wizard/WizardContainer.tsx | head -10
grep -n "beforeunload\|onBeforeUnload\|unmount\|cleanup\|useEffect.*return" web/components/wizard/hooks/useAutoSave.ts | head -10
```

### I5: Current Route Map — Full Picture

```bash
# 1. What routes exist under reports/[id]/?
find web/app -path "*reports*\[id\]*" -name "page.tsx" | sort

# 2. Show the wizard page — does it handle step query params?
head -30 web/app/\(app\)/app/reports/\[id\]/wizard/page.tsx

# 3. Does the review page exist and load correctly?
head -30 web/app/\(app\)/app/reports/\[id\]/review/page.tsx

# 4. Does the certificate page exist?
head -10 web/app/\(app\)/app/reports/\[id\]/certificate/page.tsx

# 5. Is there a filing confirmation or success page?
find web/app -path "*confirm*" -o -path "*success*" -o -path "*complete*" | head -5
```

### I6: Tab Filtering Logic

```bash
# Show how each tab filters requests
grep -B 2 -A 10 "Active\|Ready.*File\|Filed\|Exempt\|Draft\|tab\|filter\|activeTab" web/app/\(app\)/app/requests/page.tsx | head -60

# Show the status-to-tab mapping
grep -n "pending\|in_progress\|collecting\|awaiting\|ready_to_file\|filed\|exempt\|draft\|completed\|cancelled" web/app/\(app\)/app/requests/page.tsx | head -30
```

---

## EXPECTED ROUTING (for reference — DO NOT implement yet)

| Tab | Report Statuses | Action Button Label | Should Navigate To |
|-----|----------------|--------------------|--------------------|
| **Active** | `collecting`, `awaiting_parties`, `determination_complete` | "Continue" or "View Progress" | `/app/reports/{id}/wizard` (resume where they left off) |
| **Ready to File** | `ready_to_file` | "Review & File" | `/app/reports/{id}/review` |
| **Filed** | `filed` | "View Details" | `/app/reports/{id}/review` (read-only) or a detail page |
| **Exempt** | `exempt` | "View Certificate" | `/app/reports/{id}/certificate` |
| **Drafts** | `draft` | "Continue" | `/app/reports/{id}/wizard` (resume from saved step) |

Each action button should be labeled differently and route differently based on the report's status. Currently they ALL go to `/wizard` step 0.

## EXPECTED ADDRESS DISPLAY

The address should come from `wizard_data.collection.propertyAddress` or `report.property_address`. If the address hasn't been entered yet (e.g., a fresh draft), show "Address not entered" or "New Report" — NOT "Pending".

"Pending" as an address display is misleading — it looks like a status, not a missing address.

---

## DO NOT

- ❌ Make any changes — investigation only
- ❌ Skip any diagnostic command
- ❌ Summarize output — paste it in full
- ❌ Assume anything about the routing — show me the actual code

Paste ALL output. I will provide exact fix instructions after reviewing.
