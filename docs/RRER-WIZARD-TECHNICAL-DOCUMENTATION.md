# FinClear RRER Wizard — Complete Technical Documentation

**Document Version:** 1.0  
**Last Updated:** February 2026  
**Audience:** Development Team, Operations Staff, QA

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Client Request Submission Flow](#2-client-request-submission-flow)
3. [FinCEN Filing Determination (Phase 1)](#3-fincen-filing-determination-phase-1)
4. [Data Collection & Party Management (Phase 2)](#4-data-collection--party-management-phase-2)
5. [Party Portal System](#5-party-portal-system)
6. [Email Notifications](#6-email-notifications)
7. [Filing Submission](#7-filing-submission)
8. [Status Lifecycle](#8-status-lifecycle)
9. [Data Models Reference](#9-data-models-reference)
10. [API Endpoints Reference](#10-api-endpoints-reference)

---

## 1. System Overview

The FinClear RRER (Real Estate Report) Wizard is a complete end-to-end system for FinCEN compliance reporting. It handles everything from initial client request through final filing submission.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT COMPANY PORTAL                               │
│  ┌─────────────────┐                                                        │
│  │ New Request Form│ → Early Determination → EXEMPT? → Certificate (done)   │
│  │ (Basic Info)    │                       ↓ REPORTABLE                     │
│  └─────────────────┘                       ↓                                │
└────────────────────────────────────────────┼────────────────────────────────┘
                                             ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FINCLEAR STAFF QUEUE                               │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │ Pending Requests│ →  │ Create Report   │ →  │ RRER Wizard     │         │
│  │ (Triage)        │    │ (Link to Request│    │ (Determination) │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
└────────────────────────────────────────────────┼────────────────────────────┘
                                                 ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PARTY DATA COLLECTION                                │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │ Add Parties     │ →  │ Send Portal     │ →  │ Monitor Progress│         │
│  │ (Name, Email)   │    │ Links (Email)   │    │ (Status Polling)│         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
└────────────────────────────────────────────────┼────────────────────────────┘
                                                 ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PARTY PORTAL (PUBLIC)                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │ Access via Link │ →  │ Complete Form   │ →  │ Certify & Submit│         │
│  │ (Secure Token)  │    │ (Save Progress) │    │ (Confirmation)  │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
└────────────────────────────────────────────────┼────────────────────────────┘
                                                 ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FILING & COMPLETION                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │ Review Data     │ →  │ Ready Check     │ →  │ File to FinCEN  │         │
│  │ (All Parties)   │    │ (Validation)    │    │ (SDTM/Mock)     │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Request Form | `web/app/(app)/app/requests/new/page.tsx` | Client submits basic transaction info |
| Staff Queue | `web/app/(app)/app/admin/requests/page.tsx` | Staff reviews and triages requests |
| RRER Wizard | `web/components/rrer-questionnaire.tsx` | Core wizard with determination + collection |
| Party Portal | `web/app/p/[token]/page.tsx` | Public portal for parties to complete info |
| Email Service | `api/app/services/email_service.py` | All email templates and sending |
| Notification Service | `api/app/services/notifications.py` | Outbox logging + delivery tracking |

---

## 2. Client Request Submission Flow

### Entry Point
Clients access the new request form at `/app/requests/new`.

### Form Fields Collected

```typescript
interface SubmissionRequest {
  // Transaction Basics
  escrow_number: string           // Client's internal reference
  file_number: string             // Optional file number
  expected_closing_date: Date     // Anticipated closing
  
  // Property Information
  property_address: {
    street: string
    city: string
    state: string
    zip: string
    county?: string
  }
  property_type: string           // single_family, condo, commercial, land, etc.
  
  // Buyer Information (for early determination)
  buyer_name: string
  buyer_type: string              // individual, entity, trust
  buyer_email: string
  buyer_phone?: string
  entity_subtype?: string         // llc, corporation, public_company, bank, etc.
  
  // Seller Information
  seller_name: string
  seller_email?: string
  
  // Financial Details
  purchase_price_cents: number
  financing_type: string          // cash, financed, partial_cash
  
  // Notes & Priority
  notes?: string
  priority: string                // urgent, normal, low
}
```

### Early Determination Logic

When a client submits a request, the system performs **automatic determination** before creating the record:

```python
# api/app/services/early_determination.py

def determine_reporting_requirement(
    financing_type: str,
    buyer_type: str,
    entity_subtype: Optional[str],
    property_type: Optional[str],
) -> Tuple[str, List[str]]:
    """
    Returns: (result, exemption_reasons)
    - result: "exempt", "reportable", or "needs_review"
    - exemption_reasons: list of codes like ["financing_involved", "buyer_is_individual"]
    """
```

**Exemption Rules (Simplified):**

| Condition | Result | Reason Code |
|-----------|--------|-------------|
| financing_type = "financed" | EXEMPT | `financing_involved` |
| buyer_type = "individual" | EXEMPT | `buyer_is_individual` |
| buyer_type = "entity" + entity_subtype = "public_company" | EXEMPT | `buyer_is_public_company` |
| buyer_type = "entity" + entity_subtype = "bank" | EXEMPT | `buyer_is_bank` |
| buyer_type = "entity" + entity_subtype = "nonprofit" | EXEMPT | `buyer_is_nonprofit` |

### Submission Outcomes

**If EXEMPT:**
1. Status set to `exempt`
2. Exemption certificate ID generated: `EXC-{timestamp}-{hash}`
3. Notification sent to client
4. **Process ends here** — no further staff action needed

**If REPORTABLE:**
1. Status set to `reportable`
2. Request appears in Staff Queue
3. Staff will create a Report and run full wizard

### Database Record Created

```python
submission = SubmissionRequest(
    company_id=company_id,
    requested_by_user_id=user_id,
    
    # Transaction data (from form)
    escrow_number=data.escrow_number,
    property_address=data.property_address,
    # ... etc
    
    # Determination fields
    determination_result=result,          # "exempt" or "reportable"
    exemption_reasons=reasons,            # ["financing_involved", ...]
    determination_timestamp=datetime.utcnow(),
    determination_method="auto_client_form",
    exemption_certificate_id=certificate_id,  # Only if exempt
    
    # Initial status
    status=initial_status,                # "exempt" or "reportable"
)
```

---

## 3. FinCEN Filing Determination (Phase 1)

When a request is REPORTABLE, staff creates a Report and enters the RRER Wizard.

### Wizard Phase 1: Determination

The determination phase walks through the FinCEN decision tree to definitively answer: **Is this transaction reportable?**

### Determination Steps

```typescript
type DeterminationStepId = 
  | "property"              // Step 1: Property type
  | "intent-to-build"       // Step 2: Intent to build (if commercial)
  | "financing"             // Step 3: Financing type
  | "lender-aml"            // Step 4: Lender AML program check
  | "buyer-type"            // Step 5: Buyer classification
  | "individual-exemptions" // Step 6a: Individual exemptions
  | "entity-exemptions"     // Step 6b: Entity exemptions (23 types)
  | "trust-exemptions"      // Step 6c: Trust exemptions (4 types)
  | "determination-result"  // Final: Result display
```

### Decision Tree Logic

```
START
  │
  ├─ Is property RESIDENTIAL?
  │   ├─ YES → Skip to FINANCING
  │   └─ NO (Commercial) → Check INTENT TO BUILD
  │       ├─ NO intent to build → EXEMPT (not covered property)
  │       └─ YES intent to build → Continue to FINANCING
  │
  ├─ Is transaction NON-FINANCED (all cash)?
  │   ├─ NO (has financing) → EXEMPT (not reportable)
  │   └─ YES (all cash) → Check LENDER AML
  │
  ├─ Does lender have AML program?
  │   ├─ YES → EXEMPT (lender handles reporting)
  │   └─ NO or N/A → Continue to BUYER TYPE
  │
  ├─ What is BUYER TYPE?
  │   ├─ INDIVIDUAL → Check individual exemptions
  │   ├─ ENTITY → Check 23 entity exemptions
  │   └─ TRUST → Check 4 trust exemptions
  │
  └─ EXEMPTION CHECK
      ├─ Exempt? → Record reason, EXEMPT
      └─ Not exempt? → REPORTABLE
```

### Entity Exemptions (23 Types)

The wizard checks all 23 entity exemptions defined in FinCEN regulations:

| Category | Exemption Types |
|----------|-----------------|
| Financial | Securities broker/dealer, SEC-registered investment company, Bank, Credit union |
| Insurance | Insurance company |
| Utilities | Electric/gas utility, Pipeline/telecommunications |
| Government | Federal/state/local agency, Indian tribe, Foreign government |
| Corporate | Public company (NYSE/NASDAQ), Subsidiary of public company |
| Real Estate | Licensed real estate professional |
| Tax | Tax-exempt entity (501(c)) |
| Other | Large operating company (>$5M revenue, >20 employees, US physical presence) |

### Trust Exemptions (4 Types)

| Type | Description |
|------|-------------|
| Statutory Trust | Created by state statute |
| Business Trust | Common law business trust |
| Testamentary Trust | Created by will |
| Revocable Living Trust | Grantor retains control |

### Determination Result

```typescript
interface DeterminationResult {
  outcome: "reportable" | "exempt"
  reason?: string
  exemptionType?: string
  determinationId: string           // Unique ID for audit trail
  timestamp: string
}
```

**On EXEMPT:**
- Status changes to `exempt`
- Exemption certificate can be generated
- No further wizard steps needed

**On REPORTABLE:**
- Status changes to `determination_complete`
- Proceeds to Phase 2: Collection
- Must collect party data and file

---

## 4. Data Collection & Party Management (Phase 2)

### Collection Steps

```typescript
type CollectionStepId = 
  | "transaction-property"   // Step 1: Closing date, price, property details
  | "party-setup"            // Step 2: Add parties, configure links
  | "monitor-progress"       // Step 3: Track party submissions
  | "review-submissions"     // Step 4: View all submitted data
  | "reporting-person"       // Step 5: FinClear internal info
  | "file-report"            // Step 6: Final certification and file
```

### Step 1: Transaction/Property Details

Staff enters or confirms:
- Actual closing date
- Final purchase price
- Full property address
- Property type verification

### Step 2: Party Setup

Staff adds parties to the report:

```typescript
interface PartySetupInput {
  party_role: "transferee" | "transferor" | "beneficial_owner"
  entity_type: "individual" | "entity" | "trust" | "llc" | "corporation"
  display_name: string      // "John Smith" or "ABC Holdings LLC"
  email: string             // Required for portal link
  phone?: string            // Optional
}
```

**Party Roles:**
- **Transferee (Buyer):** The purchaser of the property
- **Transferor (Seller):** The seller of the property
- **Beneficial Owner:** Individual with 25%+ ownership of entity buyer

### Party Link Creation

When "Send Portal Links" is clicked:

```python
# api/app/routes/reports.py - create_party_links

for party_in in party_links_in.parties:
    # 1. Create ReportParty record
    party = ReportParty(
        report_id=report.id,
        party_role=party_in.party_role,
        entity_type=party_in.entity_type,
        display_name=party_in.display_name,
        party_data=initial_party_data,  # Pre-populated for form
        status="pending",
    )
    db.add(party)
    db.flush()
    
    # 2. Create PartyLink with secure token
    link = PartyLink(
        report_party_id=party.id,
        token=secrets.token_urlsafe(32),  # 43-char secure token
        expires_at=datetime.utcnow() + timedelta(days=7),
        status="active",
    )
    db.add(link)
    db.flush()
    
    # 3. Build portal URL
    portal_url = f"https://fincenclear.com/p/{link.token}"
    
    # 4. Send invitation email
    send_party_invite_notification(
        db=db,
        report_id=report.id,
        party_id=party.id,
        party_token=link.token,
        to_email=party_in.email,
        party_name=party_in.display_name,
        party_role=party_in.party_role,
        property_address=property_address,
        portal_link=portal_url,
    )
```

### Step 3: Monitor Progress

The wizard provides real-time status tracking:

```typescript
interface PartyStatus {
  party_id: string
  display_name: string
  party_role: string
  entity_type: string
  status: "pending" | "link_sent" | "in_progress" | "submitted" | "verified"
  email: string
  link_url?: string
  submitted_at?: string
  last_activity?: string
}
```

**Status Indicators:**
- 🟡 **Pending:** Link not yet sent
- 🔵 **Link Sent:** Email delivered, awaiting action
- 🟠 **In Progress:** Party has started but not submitted
- ✅ **Submitted:** Party completed and certified
- ✓✓ **Verified:** Staff reviewed and approved

**Auto-Status Change:**
When ALL parties reach `submitted` status, the Report automatically changes to `ready_to_file`.

### Step 4: Review Submissions

Staff can view all submitted party data:
- Full name and address
- ID document information
- For entities: EIN, formation details
- For trusts: Trust details, trustee info
- For entity buyers: Beneficial owners list
- Certification status and timestamp

### Step 5: Reporting Person

FinClear staff information (required by FinCEN):
- Reporting person name
- Title/role
- Contact information
- Filing authorization

### Step 6: File Report

Final step with:
- Ready check validation
- Certification checkbox
- File button
- Result display (receipt ID or rejection)

---

## 5. Party Portal System

### Portal Access

Parties access the portal via unique URL:
```
https://fincenclear.com/p/{token}
```

Where `{token}` is a 43-character URL-safe token generated by `secrets.token_urlsafe(32)`.

### Portal Security

| Security Measure | Implementation |
|------------------|----------------|
| Token Uniqueness | UUID + crypto random = collision-resistant |
| Token Expiration | 7 days from creation |
| Token Revocation | Single-use or staff can regenerate |
| No Account Required | Token-based access, no password |
| HTTPS Only | All portal traffic encrypted |

### Portal Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PARTY PORTAL FLOW                                    │
│                                                                              │
│  ┌──────────────────┐                                                       │
│  │ 1. ACCESS LINK   │  Party clicks email link                              │
│  │    /p/{token}    │  Token validated, party data loaded                   │
│  └────────┬─────────┘                                                       │
│           ↓                                                                  │
│  ┌──────────────────┐                                                       │
│  │ 2. VIEW CONTEXT  │  Shows: property address, role, what's needed         │
│  │                  │  Pre-populated fields from staff entry                │
│  └────────┬─────────┘                                                       │
│           ↓                                                                  │
│  ┌──────────────────┐                                                       │
│  │ 3. COMPLETE FORM │  Dynamic form based on entity_type:                   │
│  │                  │  - Individual: name, DOB, SSN, address, ID            │
│  │                  │  - Entity: name, EIN, formation, beneficial owners    │
│  │                  │  - Trust: name, type, date, trustees                  │
│  └────────┬─────────┘                                                       │
│           ↓                                                                  │
│  ┌──────────────────┐                                                       │
│  │ 4. SAVE PROGRESS │  Can save and return later (within 7 days)            │
│  │    (Optional)    │  Data persisted to party_data JSON field              │
│  └────────┬─────────┘                                                       │
│           ↓                                                                  │
│  ┌──────────────────┐                                                       │
│  │ 5. CERTIFY       │  Acknowledgment of accuracy                           │
│  │    & SIGN        │  Digital signature capture                            │
│  └────────┬─────────┘                                                       │
│           ↓                                                                  │
│  ┌──────────────────┐                                                       │
│  │ 6. SUBMIT        │  Status → "submitted"                                 │
│  │                  │  Confirmation email sent                              │
│  │                  │  Confirmation ID displayed                            │
│  └────────┬─────────┘                                                       │
│           ↓                                                                  │
│  ┌──────────────────┐                                                       │
│  │ 7. CONFIRMATION  │  "Thank you" page with:                               │
│  │                  │  - Confirmation ID                                     │
│  │                  │  - Property address                                    │
│  │                  │  - "No further action needed"                         │
│  └──────────────────┘                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Form Fields by Entity Type

**Individual:**
```typescript
interface IndividualPartyData {
  first_name: string
  last_name: string
  middle_name?: string
  suffix?: string
  date_of_birth: string        // YYYY-MM-DD
  ssn_last_four?: string       // Optional, last 4 only
  citizenship: "us_citizen" | "us_resident" | "foreign_national"
  
  address: {
    street: string
    unit?: string
    city: string
    state: string
    zip: string
  }
  
  id_document?: {
    type: "drivers_license" | "passport" | "state_id"
    number: string
    issuing_state?: string
    issuing_country?: string
    expiration_date?: string
  }
  
  // Certification
  certified: boolean
  certification_signature: string
  certification_timestamp: string
}
```

**Entity (LLC, Corporation, Partnership):**
```typescript
interface EntityPartyData {
  entity_name: string
  entity_type: "llc" | "corporation" | "partnership" | "other"
  ein: string                  // XX-XXXXXXX format
  formation_state: string
  formation_date?: string
  
  principal_address: {
    street: string
    city: string
    state: string
    zip: string
  }
  
  // Required for transferee (buyer) entities
  beneficial_owners: BeneficialOwner[]
  
  certified: boolean
  certification_signature: string
  signer_name: string
  signer_title: string
}

interface BeneficialOwner {
  first_name: string
  last_name: string
  ownership_percentage: number  // 25%+ required
  date_of_birth: string
  address: Address
}
```

**Trust:**
```typescript
interface TrustPartyData {
  trust_name: string
  trust_type: "revocable" | "irrevocable" | "testamentary" | "statutory"
  trust_date: string           // Date trust was created
  
  trustee_name: string
  trustee_type: "individual" | "corporate"
  
  // If trustee is individual
  trustee_first_name?: string
  trustee_last_name?: string
  trustee_ssn_last_four?: string
  
  // If trustee is corporate
  trustee_entity_name?: string
  trustee_ein?: string
  
  certified: boolean
  certification_signature: string
}
```

### Party Submission Processing

```python
# api/app/routes/parties.py - submit_party_data

@router.post("/{token}/submit")
def submit_party_data(token: str, request: Request, db: Session):
    # 1. Validate token
    link = db.query(PartyLink).filter(PartyLink.token == token).first()
    if not link or not link.is_valid:
        raise HTTPException(404, "Link not found or expired")
    
    # 2. Get party and report
    party = link.party
    report = party.report
    
    # 3. Parse submitted data from request body
    body = await request.body()
    submitted_data = json.loads(body) if body else {}
    
    # 4. Update party record
    party.party_data = {**party.party_data, **submitted_data}
    party.status = "submitted"
    party.updated_at = datetime.utcnow()
    
    # 5. Generate confirmation ID
    confirmation_id = f"CONF-{party.id.hex[:8].upper()}"
    
    # 6. Send confirmation email
    send_party_confirmation_notification(
        db=db,
        report_id=report.id,
        party_id=party.id,
        to_email=party.party_data.get("email"),
        party_name=party.display_name,
        confirmation_id=confirmation_id,
        property_address=report.property_address_text,
    )
    
    # 7. Check if ALL parties now submitted
    all_parties = db.query(ReportParty).filter(
        ReportParty.report_id == report.id
    ).all()
    
    all_submitted = all(p.status in ("submitted", "verified") for p in all_parties)
    
    if all_submitted and len(all_parties) > 0:
        # 8. Auto-advance report status
        report.status = "ready_to_file"
        report.updated_at = datetime.utcnow()
        
        # 9. Create audit log
        db.add(AuditLog(
            report_id=report.id,
            actor_type="system",
            action="report.status_changed",
            details={
                "old_status": "collecting",
                "new_status": "ready_to_file",
                "reason": "all_parties_submitted",
            },
        ))
    
    db.commit()
    
    return {
        "status": "submitted",
        "confirmation_id": confirmation_id,
        "message": "Thank you! Your information has been received.",
    }
```

---

## 6. Email Notifications

### Notification Types

| Type | Trigger | Recipient | Template |
|------|---------|-----------|----------|
| `party_invite` | Party links created | Party | Invitation with portal link |
| `party_confirmation` | Party submits portal | Party | Submission confirmation |
| `party_submitted` | Party submits portal | Staff | Alert that party completed |
| `all_complete` | All parties submitted | Staff | Ready for review alert |
| `filing_receipt` | Report filed | Client, Staff | Filing confirmation |
| `internal_alert` | Various | Staff | Deadline warnings, etc. |

### Notification Outbox System

All emails are logged BEFORE sending:

```python
# api/app/services/notifications.py

def log_notification(
    db: Session,
    type: str,                    # party_invite, party_confirmation, etc.
    report_id: Optional[UUID],
    party_id: Optional[UUID],
    party_token: Optional[str],
    to_email: str,
    subject: str,
    body_preview: str,            # First 500 chars
    meta: dict,                   # Additional context
) -> NotificationEvent:
    """
    Creates outbox record with delivery_status='pending'
    """
```

### Email Templates

**Party Invitation Email:**
```
Subject: Action Required: Information Needed for Real Estate Transaction

Dear {party_name},

You are receiving this email because you are listed as the {role} 
in a real estate transaction.

Property: {property_address}

Please complete your information by visiting this secure link:
{portal_link}

⏰ This link expires in 7 days.

[Complete Your Information →]

---
Why am I receiving this?
The Financial Crimes Enforcement Network (FinCEN) requires reporting 
on certain real estate transactions.
```

**Submission Confirmation Email:**
```
Subject: Confirmed: Your Information Has Been Received

Dear {party_name},

We have successfully received your information for:
{property_address}

Your Confirmation ID: {confirmation_id}

Please save this confirmation ID for your records.
No further action is required from you.
```

### SendGrid Integration

```python
# api/app/services/email_service.py

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "clear@fincenclear.com")
SENDGRID_ENABLED = os.getenv("SENDGRID_ENABLED", "false").lower() == "true"

def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
) -> EmailResult:
    """
    Send via SendGrid API.
    If SENDGRID_ENABLED=false, logs but doesn't send (for dev/staging).
    """
```

---

## 7. Filing Submission

### Ready Check

Before filing, the system validates:

```python
def perform_ready_check(report: Report) -> tuple[bool, list]:
    errors = []
    
    # 1. Must be in correct status
    if report.status not in ("ready_to_file", "collecting"):
        errors.append("Report is not ready for filing")
    
    # 2. Must have at least one party
    parties = report.parties
    if not parties:
        errors.append("No parties attached to report")
    
    # 3. All parties must be submitted
    for party in parties:
        if party.status not in ("submitted", "verified"):
            errors.append(f"Party {party.display_name} has not submitted")
    
    # 4. Must have closing date
    if not report.closing_date:
        errors.append("Closing date is required")
    
    # 5. Must have property address
    if not report.property_address_text:
        errors.append("Property address is required")
    
    return len(errors) == 0, errors
```

### Filing Modes

**Staging/Development:**
- Mock filing with demo receipt ID
- Can simulate accept/reject outcomes
- No actual FinCEN submission

**Production:**
- SDTM (Secure Data Transfer Mode) to FinCEN
- Real XML generation and submission
- Tracks submission status through FinCEN response

### Filing Flow

```python
@router.post("/{report_id}/file")
def file_report(report_id: UUID, request: Request, db: Session):
    # 1. Get and validate report
    report = db.query(Report).filter(Report.id == report_id).first()
    
    # 2. Check submission record
    submission = get_or_create_submission(db, report_id)
    if submission.status == "accepted":
        raise HTTPException(400, "Already filed and accepted")
    
    # 3. Perform ready check
    is_ready, errors = perform_ready_check(report)
    if not is_ready:
        raise HTTPException(400, {"message": "Not ready", "errors": errors})
    
    # 4. Determine transport mode
    use_sdtm = (
        settings.ENVIRONMENT == "production"
        and settings.FINCEN_TRANSPORT == "sdtm"
        and settings.sdtm_configured
    )
    
    if use_sdtm:
        # Production: Real SDTM submission
        return perform_sdtm_submit(db, report_id, client_ip)
    else:
        # Staging: Mock filing
        receipt_id, submission = perform_mock_submit(db, report_id, client_ip)
        return {
            "ok": True,
            "status": "accepted",
            "receipt_id": receipt_id,
            "message": "Filed successfully (demo mode)",
        }
```

### Receipt ID Format

**Demo/Mock:**
```
RER-DEMO-{8-char-hash}
Example: RER-DEMO-A1B2C3D4
```

**Production (SDTM):**
```
31{14-digit-bsa-id}
Example: 31000012345678
```

### Post-Filing Actions

1. **Update Report Status:** `filed`
2. **Update Submission Record:** `status=accepted`, `receipt_id`, `filed_at`
3. **Create Billing Event:** Log the filing for invoicing
4. **Send Notifications:** Filing receipt to client and internal

---

## 8. Status Lifecycle

### SubmissionRequest Statuses

```
┌─────────────────────────────────────────────────────────────┐
│                  SUBMISSION REQUEST LIFECYCLE                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐                                                │
│  │ pending │ ← Initial state when client submits            │
│  └────┬────┘                                                │
│       │                                                      │
│       ├───────────────────┐                                 │
│       │                   │                                 │
│       ▼                   ▼                                 │
│  ┌─────────┐        ┌───────────┐                          │
│  │ exempt  │        │ reportable│ ← Needs full report       │
│  └─────────┘        └─────┬─────┘                          │
│  (TERMINAL)               │                                 │
│                           ▼                                 │
│                    ┌─────────────┐                          │
│                    │ in_progress │ ← Staff working on it    │
│                    └──────┬──────┘                          │
│                           │                                 │
│                           ▼                                 │
│                    ┌───────────┐                            │
│                    │ completed │ ← Report filed             │
│                    └───────────┘                            │
│                    (TERMINAL)                               │
│                                                              │
│  (Any state) ────► ┌───────────┐                           │
│                    │ cancelled │ ← Manually cancelled       │
│                    └───────────┘                            │
│                    (TERMINAL)                               │
└─────────────────────────────────────────────────────────────┘
```

### Report Statuses

```
┌─────────────────────────────────────────────────────────────┐
│                     REPORT LIFECYCLE                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────┐                                                  │
│  │ draft │ ← Created, wizard not started                    │
│  └───┬───┘                                                  │
│      │                                                       │
│      ▼ (Complete determination phase)                        │
│  ┌───────────────────────┐                                  │
│  │ determination_complete│ ← Wizard Phase 1 done            │
│  └───────────┬───────────┘                                  │
│              │                                               │
│              ├───────────────┐                              │
│              │               │                              │
│              ▼               ▼                              │
│  ┌────────────┐        ┌─────────┐                         │
│  │ collecting │        │  exempt │ ← Not reportable         │
│  └──────┬─────┘        └─────────┘                         │
│         │              (TERMINAL)                           │
│         │                                                    │
│         ▼ (All parties submitted)                           │
│  ┌───────────────┐                                          │
│  │ ready_to_file │ ← Can proceed to filing                  │
│  └───────┬───────┘                                          │
│          │                                                   │
│          ▼ (File to FinCEN)                                 │
│  ┌────────┐                                                 │
│  │ filed  │ ← Successfully submitted                        │
│  └────────┘                                                 │
│  (TERMINAL)                                                 │
└─────────────────────────────────────────────────────────────┘
```

### Party Statuses

```
┌─────────────────────────────────────────────────────────────┐
│                      PARTY LIFECYCLE                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐                                                │
│  │ pending │ ← Party created, no link sent                  │
│  └────┬────┘                                                │
│       │                                                      │
│       ▼ (Send portal link)                                  │
│  ┌───────────┐                                              │
│  │ link_sent │ ← Email sent, awaiting action                │
│  └─────┬─────┘                                              │
│        │                                                     │
│        ▼ (Party opens portal)                               │
│  ┌─────────────┐                                            │
│  │ in_progress │ ← Party started form                       │
│  └──────┬──────┘                                            │
│         │                                                    │
│         ▼ (Party submits)                                   │
│  ┌───────────┐                                              │
│  │ submitted │ ← Form completed and certified               │
│  └─────┬─────┘                                              │
│        │                                                     │
│        ▼ (Staff review - optional)                          │
│  ┌──────────┐                                               │
│  │ verified │ ← Staff approved                              │
│  └──────────┘                                               │
│  (TERMINAL)                                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Data Models Reference

### Core Models

| Model | Table | Purpose |
|-------|-------|---------|
| `SubmissionRequest` | `submission_requests` | Client's initial request |
| `Report` | `reports` | The actual FinCEN report |
| `ReportParty` | `report_parties` | Parties on a report |
| `PartyLink` | `party_links` | Portal access tokens |
| `FilingSubmission` | `filing_submissions` | Filing status tracking |
| `NotificationEvent` | `notification_events` | Email outbox/tracking |
| `AuditLog` | `audit_logs` | Action audit trail |

### Key Relationships

```
Company
  │
  ├── SubmissionRequest (many)
  │     │
  │     └── Report (one, optional)
  │           │
  │           ├── ReportParty (many)
  │           │     │
  │           │     └── PartyLink (many)
  │           │
  │           ├── FilingSubmission (one)
  │           │
  │           ├── AuditLog (many)
  │           │
  │           └── NotificationEvent (many)
  │
  └── User (many)
        │
        ├── SubmissionRequest.requested_by
        ├── SubmissionRequest.assigned_to
        └── Report.created_by_user
```

---

## 10. API Endpoints Reference

### Submission Requests

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/submission-requests` | Create new request |
| `GET` | `/submission-requests` | List requests |
| `GET` | `/submission-requests/{id}` | Get single request |
| `PATCH` | `/submission-requests/{id}` | Update request |
| `POST` | `/submission-requests/{id}/create-report` | Create report from request |
| `GET` | `/submission-requests/stats` | Get statistics |

### Reports

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/reports` | Create new report |
| `GET` | `/reports/{id}` | Get report details |
| `PATCH` | `/reports/{id}` | Update report |
| `POST` | `/reports/{id}/party-links` | Create party links |
| `GET` | `/reports/{id}/party-status` | Get party statuses |
| `GET` | `/reports/{id}/ready-check` | Validate for filing |
| `POST` | `/reports/{id}/file` | Submit to FinCEN |

### Parties (Portal)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/parties/{token}` | Get party data for portal |
| `PUT` | `/parties/{token}` | Save party progress |
| `POST` | `/parties/{token}/submit` | Submit party data |
| `POST` | `/parties/staff/resend-link/{id}` | Resend portal link |

### Admin/Staff

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/admin/requests` | All requests (all companies) |
| `GET` | `/admin/queue` | Staff work queue |
| `POST` | `/admin/requests/{id}/assign` | Assign to staff |
| `GET` | `/admin/stats` | Admin statistics |

---

## Appendix: Configuration Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# SendGrid Email
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=clear@fincenclear.com
SENDGRID_ENABLED=true

# Frontend URLs
FRONTEND_URL=https://fincenclear.com
NEXT_PUBLIC_API_URL=https://api.fincenclear.com

# FinCEN SDTM (Production)
FINCEN_TRANSPORT=sdtm
FINCEN_SDTM_ENDPOINT=https://sdtmapi.fincen.gov/...
FINCEN_SDTM_API_KEY=xxx

# Environment
ENVIRONMENT=staging  # staging, production
```

---

*Document generated February 2026. For the latest updates, check the codebase.*
