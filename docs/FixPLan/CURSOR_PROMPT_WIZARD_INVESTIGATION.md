# CURSOR PROMPT: Wizard Investigation & Master Tech Spec

## MISSION

**INVESTIGATION ONLY - DO NOT MODIFY ANY CODE**

Analyze the FinClear wizard system and produce a comprehensive **Wizard Master Tech Spec** document. This document will become the single source of truth for understanding all aspects of the wizard: how it works, status lifecycles, data flow, party portal connections, and all touchpoints.

---

## OUTPUT REQUIRED

Create file: `docs/WIZARD_MASTER_TECH_SPEC.md`

This document must contain ALL sections below, fully populated with actual findings from the codebase.

---

## INVESTIGATION AREAS

### 1. COMPONENT ARCHITECTURE

**Files to examine:**
- `web/components/rrer-questionnaire.tsx`
- `web/app/(app)/app/reports/[id]/wizard/page.tsx`
- `web/components/party-portal/*.tsx`

**Document:**
```markdown
## 1. Component Architecture

### 1.1 Wizard Component Tree
[Draw the component hierarchy]

### 1.2 Key Components
| Component | File Path | Purpose |
|-----------|-----------|---------|
| ... | ... | ... |

### 1.3 Props & Interfaces
[List all major interfaces/types used]
```

---

### 2. STATE MANAGEMENT

**Files to examine:**
- `web/components/rrer-questionnaire.tsx` (look for useState, useEffect, state objects)
- `web/lib/rrer-types.ts`
- `web/lib/api.ts` (wizard-related API calls)

**Document:**
```markdown
## 2. State Management

### 2.1 Wizard State Structure
[Show the complete wizard_data shape]

```typescript
// Actual structure from codebase
interface WizardData {
  determination: { ... },
  collection: { ... },
  // etc.
}
```

### 2.2 State Persistence
- How is state saved? (API call? Which endpoint?)
- How is state loaded on page refresh?
- Auto-save mechanism (debounce timing, trigger events)

### 2.3 State Transitions
[Document when state changes and what triggers it]
```

---

### 3. WIZARD PHASES & STEPS

**Files to examine:**
- `web/components/rrer-questionnaire.tsx` (step definitions, phase logic)

**Document:**
```markdown
## 3. Wizard Phases & Steps

### 3.1 Phase Overview
| Phase | Steps | Purpose |
|-------|-------|---------|
| Determination | 1-N | Decide if reportable |
| Collection | N-M | Gather transaction data |
| Party Setup | ... | Configure parties |
| Review | ... | Final check |

### 3.2 Step Definitions
[List every step ID, its display name, what fields it collects]

### 3.3 Conditional Step Logic
[Document which steps appear/hide based on answers]

### 3.4 Navigation Logic
- How does "Next" work?
- How does "Back" work?
- Can user jump to arbitrary step?
```

---

### 4. STATUS LIFECYCLE

**Files to examine:**
- `api/app/models/report.py` (Report status enum)
- `api/app/models/submission_request.py` (SubmissionRequest status enum)
- `api/app/models/report_party.py` (Party status)
- `api/app/models/party_link.py` (PartyLink status)
- `api/app/routes/reports.py` (where statuses are changed)
- `api/app/routes/submission_requests.py`

**Document:**
```markdown
## 4. Status Lifecycle

### 4.1 Report Status Flow
```
[status] → [trigger] → [status] → [trigger] → [status]
```

| Status | Meaning | Set When | Set By |
|--------|---------|----------|--------|
| draft | ... | ... | ... |
| determination_complete | ... | ... | ... |
| collecting | ... | ... | ... |
| ready_to_file | ... | ... | ... |
| filed | ... | ... | ... |
| exempt | ... | ... | ... |

### 4.2 SubmissionRequest Status Flow
[Same format as above]

### 4.3 Party Status Flow
[Same format]

### 4.4 PartyLink Status Flow
[Same format]

### 4.5 Status Sync Rules
[How does Report status sync with SubmissionRequest status?]
```

---

### 5. DATA HYDRATION & FLOW

**Files to examine:**
- `api/app/routes/submission_requests.py` (create-report endpoint)
- `api/app/routes/reports.py` (party-links endpoint)
- `api/app/routes/parties.py` (party portal data)

**Document:**
```markdown
## 5. Data Hydration & Flow

### 5.1 Submission → Wizard
[What fields from SubmissionRequest populate wizard_data?]

| SubmissionRequest Field | Wizard Field | Transform |
|------------------------|--------------|-----------|
| property_address | wizard_data.collection.propertyAddress | direct |
| purchase_price | wizard_data.collection.purchasePrice | direct |
| ... | ... | ... |

### 5.2 Wizard → Party Creation
[What wizard_data fields populate party records?]

| Wizard Field | Party Field | Notes |
|--------------|-------------|-------|
| ... | ... | ... |

### 5.3 Party → Party Portal Form
[What data does the party portal receive and pre-fill?]

| Party Record Field | Portal Form Field | Pre-filled? |
|-------------------|-------------------|-------------|
| ... | ... | ... |

### 5.4 Data Flow Diagram
```
SubmissionRequest
    ↓ (create-report)
Report.wizard_data
    ↓ (party-links)
ReportParty.party_data
    ↓ (GET /party/{token})
Party Portal Form
    ↓ (POST /party/{token}/submit)
ReportParty.party_data (updated)
```
```

---

### 6. API ENDPOINTS

**Files to examine:**
- `api/app/routes/reports.py`
- `api/app/routes/parties.py`
- `api/app/routes/submission_requests.py`
- `api/app/schemas/report.py`
- `api/app/schemas/party.py`

**Document:**
```markdown
## 6. API Endpoints

### 6.1 Wizard Endpoints

| Method | Endpoint | Purpose | Request Schema | Response Schema |
|--------|----------|---------|----------------|-----------------|
| PUT | /reports/{id}/wizard | Save wizard state | WizardDataUpdate | ReportResponse |
| POST | /reports/{id}/determine | Run determination | - | DeterminationResult |
| POST | /reports/{id}/party-links | Generate party links | PartyLinkRequest[] | PartyLinkResponse[] |
| POST | /reports/{id}/ready-check | Check filing readiness | - | ReadyCheckResult |
| POST | /reports/{id}/file | Submit to FinCEN | - | FilingResult |

### 6.2 Party Portal Endpoints

| Method | Endpoint | Purpose | Request Schema | Response Schema |
|--------|----------|---------|----------------|-----------------|
| GET | /party/{token} | Load party data | - | PartyPortalData |
| POST | /party/{token}/save | Autosave | PartyDataUpdate | - |
| POST | /party/{token}/submit | Final submit | PartyDataUpdate | SubmitResult |

### 6.3 Schema Details
[Include actual Pydantic schema definitions for key objects]
```

---

### 7. PARTY PORTAL CONNECTION

**Files to examine:**
- `web/app/p/[token]/page.tsx`
- `web/components/party-portal/BuyerEntityForm.tsx`
- `web/components/party-portal/BuyerTrustForm.tsx`
- `web/components/party-portal/SellerIndividualForm.tsx`
- `web/components/party-portal/SellerEntityForm.tsx`
- (all files in party-portal folder)

**Document:**
```markdown
## 7. Party Portal Connection

### 7.1 Portal Entry Point
- URL pattern: /p/{token}
- Token validation logic
- Expiration handling

### 7.2 Form Selection Logic
[How does the system decide which form to show?]

| party_role | entity_type | Form Component |
|------------|-------------|----------------|
| buyer | entity | BuyerEntityForm |
| buyer | trust | BuyerTrustForm |
| seller | individual | SellerIndividualForm |
| ... | ... | ... |

### 7.3 Pre-filled Fields
[List every field that comes pre-filled from wizard]

### 7.4 Required Fields by Form
[List required fields for each form type]

### 7.5 Beneficial Owner Collection
[How does entity buyer form collect beneficial owners?]

### 7.6 Document Upload Integration
[How does DocumentUpload component integrate?]
```

---

### 8. DETERMINATION LOGIC

**Files to examine:**
- `api/app/routes/reports.py` (determine endpoint)
- `api/app/services/determination.py` (if exists)
- `web/components/rrer-questionnaire.tsx` (frontend determination)

**Document:**
```markdown
## 8. Determination Logic

### 8.1 Determination Rules
[Document the complete decision tree]

```
Is residential? 
  NO → NOT REPORTABLE (reason: non_residential)
  YES ↓
Is financed by AML lender?
  YES → NOT REPORTABLE (reason: financed_transaction)
  NO ↓
Buyer type?
  Individual → NOT REPORTABLE (reason: individual_buyer)
  Entity → Check entity exemptions
  Trust → Check trust exemptions
...
```

### 8.2 Exemption Types
[List all 23 entity exemptions and 4 trust exemptions]

### 8.3 Determination Result Schema
```typescript
interface DeterminationResult {
  is_reportable: boolean;
  exemption_reason?: string;
  exemption_details?: string;
  ...
}
```
```

---

### 9. FILE INVENTORY

**Document:**
```markdown
## 9. File Inventory

### 9.1 Frontend Files
| File | Purpose | Key Exports |
|------|---------|-------------|
| web/components/rrer-questionnaire.tsx | Main wizard component | RRERQuestionnaire |
| web/app/(app)/app/reports/[id]/wizard/page.tsx | Wizard page wrapper | WizardPage |
| ... | ... | ... |

### 9.2 Backend Files
| File | Purpose | Key Functions |
|------|---------|---------------|
| api/app/routes/reports.py | Report API | save_wizard, determine, party_links |
| api/app/models/report.py | Report model | Report class, status enum |
| ... | ... | ... |

### 9.3 Shared Types
| File | Purpose | Key Types |
|------|---------|-----------|
| web/lib/rrer-types.ts | Wizard types | WizardData, DeterminationStep |
| web/lib/api.ts | API client | fetchReport, saveWizard |
| ... | ... | ... |
```

---

### 10. CURRENT GAPS & OBSERVATIONS

**Document:**
```markdown
## 10. Current Gaps & Observations

### 10.1 Missing Functionality
[List anything that appears incomplete]

### 10.2 Hardcoded Values
[List any hardcoded values that should be configurable]

### 10.3 Potential Issues
[Document any code smells or concerns]

### 10.4 Integration Points for SiteX
[Identify where SiteX/address lookup should plug in]

- Property address field location: [file:line]
- Where to trigger lookup: [describe]
- What fields SiteX could populate: [list]
```

---

## EXECUTION INSTRUCTIONS

1. **Read each file listed** in the investigation areas
2. **Extract actual code** - don't guess, quote real implementations
3. **Follow imports** - if a component imports something, trace it
4. **Document unknowns** - if something is unclear, note it as "UNCLEAR: [question]"
5. **Be thorough** - this document will be used as the master reference

---

## OUTPUT FORMAT

Create `docs/WIZARD_MASTER_TECH_SPEC.md` with:
- Clear markdown formatting
- Code blocks for actual code snippets
- Tables for structured data
- Diagrams using ASCII or mermaid syntax where helpful
- A table of contents at the top

---

## COMPLETION CHECKLIST

Before finishing, verify:
- [ ] All 10 sections are populated
- [ ] No placeholder text like "TBD" or "..."
- [ ] All file paths are verified to exist
- [ ] Code snippets are actual code from the repo
- [ ] Status flows are complete and accurate
- [ ] Data flow is traced end-to-end
- [ ] Party portal forms are all documented

---

**DO NOT MODIFY ANY CODE - INVESTIGATION ONLY**
