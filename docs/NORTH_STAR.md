# PCT FinCEN Solutions - North Star Document

> **Last Updated:** January 27, 2026
> **Status:** ACTIVE - This is the single source of truth

---

## 🎯 What We're Building

A compliance platform where:
1. **Title Company Clients** submit real estate transactions
2. **PCT Staff** determines if FinCEN reporting is required
3. **Transaction Parties** (buyers/sellers) provide their own information via secure portal
4. **PCT Staff** reviews and files to FinCEN

---

## 📊 The Correct Flow (This is Canon)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: CLIENT SUBMISSION                                                 │
│  Actor: Title Company Client (admin@demotitle.com)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Client logs in → Dashboard → "New Request"                                 │
│                                                                             │
│  Client enters:                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PROPERTY INFO                                                        │   │
│  │ • Address, City, State, ZIP, County                                  │   │
│  │ • Property Type (1-4 family, condo, etc.)                           │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ TRANSACTION INFO                                                     │   │
│  │ • Purchase Price                                                     │   │
│  │ • Closing Date                                                       │   │
│  │ • Escrow/File Number                                                 │   │
│  │ • Financing Type (Cash, Financed, etc.)                             │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ BUYER INFO (Basic)                                                   │   │
│  │ • Buyer Name                                                         │   │
│  │ • Buyer Email                                                        │   │
│  │ • Buyer Type (Individual / Entity / Trust)                          │   │
│  │ • If Entity: Entity Name                                            │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ SELLER INFO (Basic)                                                  │   │
│  │ • Seller Name                                                        │   │
│  │ • Seller Email (optional)                                           │   │
│  │ • Seller Type (Individual / Entity / Trust)                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [Submit Request]                                                           │
│                                                                             │
│  Result: Creates SubmissionRequest with status="pending"                    │
│          Appears in PCT Staff queue                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: PCT STAFF DETERMINATION                                           │
│  Actor: PCT Staff (staff@pctfincen.com)                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Staff sees request in queue → Clicks "Start Wizard"                        │
│                                                                             │
│  WIZARD STEP 1: Review Property                                             │
│  • Confirm residential (1-4 family, condo, etc.)                           │
│  • If commercial/5+ units → NOT REPORTABLE (exit)                          │
│                                                                             │
│  WIZARD STEP 2: Financing Check                                             │
│  • Was this financed by institution with AML program?                       │
│  • If YES → NOT REPORTABLE (exit)                                          │
│  • If NO (cash deal) → Continue                                            │
│                                                                             │
│  WIZARD STEP 3: Buyer Type Check                                            │
│  • Individual buyer → NOT REPORTABLE (exit)                                │
│  • Entity buyer → Check exemptions                                         │
│  • Trust buyer → Check exemptions                                          │
│                                                                             │
│  WIZARD STEP 4a: Entity Exemption Check (if entity)                         │
│  • Is entity one of 23 exempt types?                                       │
│  • (SEC registered, bank, government, etc.)                                │
│  • If EXEMPT → NOT REPORTABLE (exit)                                       │
│                                                                             │
│  WIZARD STEP 4b: Trust Exemption Check (if trust)                           │
│  • Is trust one of 4 exempt types?                                         │
│  • (Statutory trust, widely held, etc.)                                    │
│  • If EXEMPT → NOT REPORTABLE (exit)                                       │
│                                                                             │
│  WIZARD STEP 5: Transaction Exemption Check                                 │
│  • Death/inheritance? Divorce? Bankruptcy? 1031?                           │
│  • If ANY apply → NOT REPORTABLE (exit)                                    │
│                                                                             │
│  WIZARD STEP 6: Determination Result                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ EXEMPT: "This transaction is NOT reportable"                         │   │
│  │ → Document reason, close request                                     │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ REPORTABLE: "This transaction REQUIRES FinCEN filing"                │   │
│  │ → Continue to Party Setup                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓ (if REPORTABLE)
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: PARTY SETUP & LINK GENERATION                                     │
│  Actor: PCT Staff                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WIZARD STEP 7: Identify Parties                                            │
│                                                                             │
│  Staff reviews/confirms parties from client submission:                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PARTIES TO CONTACT                                                   │   │
│  │                                                                      │   │
│  │ Seller(s):                                                           │   │
│  │ • John Smith (Individual) - john@email.com                          │   │
│  │   [Edit] [Remove]                                                   │   │
│  │                                                                      │   │
│  │ Buyer(s):                                                            │   │
│  │ • ABC Holdings LLC (Entity) - contact@abc.com                       │   │
│  │   [Edit] [Remove]                                                   │   │
│  │                                                                      │   │
│  │ [+ Add Party]                                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [Generate & Send Links]                                                    │
│                                                                             │
│  System:                                                                    │
│  • Creates Party records with unique tokens                                │
│  • Sends email to each party with their secure link                        │
│  • Updates report status to "collecting"                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: PARTY DATA COLLECTION                                             │
│  Actor: Transaction Parties (Buyers, Sellers, Beneficial Owners)            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Each party receives email → Clicks secure link → Party Portal              │
│                                                                             │
│  SELLER (Individual) fills out:                                             │
│  • Full legal name, DOB, SSN/ITIN                                          │
│  • Address after closing                                                    │
│  • Citizenship status                                                       │
│  • Certification checkbox                                                   │
│                                                                             │
│  SELLER (Entity) fills out:                                                 │
│  • Entity legal name, type, EIN                                            │
│  • Formation state/date                                                     │
│  • Principal address                                                        │
│  • Authorized signer info                                                   │
│                                                                             │
│  BUYER (Entity) fills out:                                                  │
│  • Entity legal name, type, EIN                                            │
│  • Formation state/date                                                     │
│  • Principal address                                                        │
│  • ALL Beneficial Owners (25%+ ownership OR substantial control):          │
│    - Full name, DOB, SSN                                                   │
│    - Residential address                                                    │
│    - ID type and number                                                     │
│    - Ownership percentage OR control type                                   │
│  • Signing individual info                                                  │
│                                                                             │
│  BUYER (Trust) fills out:                                                   │
│  • Trust name, type, date executed                                         │
│  • TIN/EIN                                                                  │
│  • Trustee(s) info                                                         │
│  • Settlor/Grantor info                                                    │
│  • Beneficiaries with vested interest                                      │
│                                                                             │
│  PAYMENT INFO (collected from buyer):                                       │
│  • Total consideration                                                      │
│  • Payment sources and methods                                             │
│  • Account details                                                          │
│  • Third-party payer info (if any)                                         │
│                                                                             │
│  [Submit] → Confirmation page with ID                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5: PCT STAFF MONITORING                                              │
│  Actor: PCT Staff                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Staff monitors party progress in-app:                                      │
│  • Queue shows "2/3 parties complete"                                      │
│  • Wizard shows per-party status                                           │
│  • Can resend links, send reminders                                        │
│  • Receives notifications when parties submit                              │
│                                                                             │
│  When ALL parties complete → Status changes to "ready_for_review"          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 6: REVIEW & FILE                                                     │
│  Actor: PCT Staff                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Staff reviews all submitted info:                                          │
│  • View organized summary of all party data                                │
│  • Flag any issues or missing info                                         │
│  • Request corrections if needed (sends party back to portal)              │
│  • Verify all certifications received                                      │
│                                                                             │
│  When satisfied:                                                            │
│  • Staff certification checkbox                                            │
│  • [File to FinCEN] button                                                 │
│                                                                             │
│  System:                                                                    │
│  • Generates filing package                                                │
│  • Submits to FinCEN (SDTM or manual)                                      │
│  • Records BSA ID when received                                            │
│  • Updates status to "filed"                                               │
│  • Creates billing event                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 7: CLIENT VISIBILITY                                                 │
│  Actor: Title Company Client                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Client can see in their dashboard:                                         │
│  • Request status (pending → processing → filed)                           │
│  • Filing confirmation and BSA ID                                          │
│  • Invoice for completed filing                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Data Model (Required Entities)

### SubmissionRequest (Client creates this)
```
id
company_id          → Client's company
created_by          → Client user who created it
status              → pending | processing | collecting | ready_for_review | filed | exempt
created_at
updated_at

# Property
property_address
property_city
property_state
property_zip
property_county
property_type

# Transaction
purchase_price
closing_date
escrow_number
financing_type

# Basic Party Info (from client)
buyer_name
buyer_email
buyer_type          → individual | entity | trust
buyer_entity_name   → if entity/trust
seller_name
seller_email
seller_type         → individual | entity | trust
```

### Report (PCT creates from SubmissionRequest)
```
id
submission_request_id
created_by          → PCT staff who created it
status              → determining | reportable | exempt | collecting | ready_for_review | filed
determination       → reportable | exempt | null
determination_reason
determination_at

# Wizard state
wizard_data         → JSON of wizard answers
wizard_step
```

### Party (Created when links generated)
```
id
report_id
role                → buyer | seller | beneficial_owner
type                → individual | entity | trust
name
email
token               → secure unique token
status              → pending | submitted
submitted_at
expires_at
```

### PartySubmission (Party fills this out via portal)
```
id
party_id
submitted_at

# Individual fields
first_name, middle_name, last_name, suffix
date_of_birth
ssn_itin
citizenship
id_type
id_number
id_jurisdiction

# Address
address_street
address_city
address_state
address_zip
address_country

# Entity fields (if entity)
entity_name
entity_type
entity_ein
formation_state
formation_date

# Trust fields (if trust)
trust_name
trust_type
trust_date
trust_tin

# Ownership (if beneficial owner)
ownership_percentage
control_type

# Payment info (if buyer)
payment_total
payment_sources     → JSON array
```

### BeneficialOwner (Collected via party portal from entity buyer)
```
id
party_submission_id
first_name, last_name, etc.
date_of_birth
ssn
address_*
id_type
id_number
ownership_percentage
control_type
```

---

## 🔌 API Endpoints (Required)

### Client Endpoints
```
POST   /submission-requests              → Client creates new request
GET    /submission-requests              → Client lists their requests
GET    /submission-requests/{id}         → Client views request details
```

### PCT Staff Endpoints
```
GET    /admin/queue                      → Staff queue of pending requests
POST   /reports                          → Create report from submission request
GET    /reports/{id}                     → Get report details
PUT    /reports/{id}/wizard              → Save wizard progress
POST   /reports/{id}/determine           → Run determination logic
POST   /reports/{id}/party-links         → Generate and send party links
GET    /reports/{id}/parties             → Get party statuses
POST   /reports/{id}/file                → File to FinCEN
```

### Party Portal Endpoints (Public, token-based)
```
GET    /p/{token}                        → Get party info and form requirements
POST   /p/{token}/submit                 → Submit party information
```

---

## ⚠️ Current vs Required State

### What EXISTS and WORKS ✅
- Demo authentication
- Wizard UI (but wrong flow)
- Party portal (but limited fields)
- Party link generation
- Party tracking in-app
- SendGrid email integration
- Notification outbox
- Mock filing

### What's BROKEN or MISSING ❌
- Client submission form doesn't hit API (mock)
- SubmissionRequest model may not exist
- Wizard collects party data (should NOT)
- Party portal doesn't collect full FinCEN fields
- No review screen for submitted party data
- Queue shows mock data, not real requests

### What Needs to CHANGE 🔄
1. Client "New Request" → POST to real API
2. Wizard stops at determination, pivots to party setup
3. Party portal collects ALL required fields per party type
4. Add Review screen to view party submissions
5. Wire everything end-to-end

---

## 🎯 Demo Requirements (Jan 29)

**Must work end-to-end:**
1. Client submits request → appears in queue
2. Staff runs determination → reportable
3. Staff sends party links → emails go out
4. Party fills portal → submits successfully
5. Staff sees completion → reviews data
6. Staff files → success confirmation

**Can be simplified:**
- Single buyer (entity with 2 beneficial owners)
- Single seller (individual)
- One property, one transaction
- Mock filing (not real SDTM)

---

## 📁 File Locations

```
/docs/
  NORTH_STAR.md          ← This file (source of truth)
  API_ENDPOINTS.md       ← Endpoint documentation
  DATA_MODELS.md         ← Database schema
  DEMO_SCRIPT.md         ← Jan 29 demo walkthrough

/api/
  /app/
    /models/             ← Database models
    /routes/             ← API endpoints
    /services/           ← Business logic
    /schemas/            ← Pydantic schemas

/web/
  /app/
    /(app)/app/          ← Authenticated pages
    /p/                  ← Party portal (public)
  /components/           ← Shared components
  /lib/                  ← Utilities, API helpers
```
