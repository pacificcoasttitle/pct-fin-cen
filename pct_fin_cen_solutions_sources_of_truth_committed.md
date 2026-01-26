# 📘 PCT_FinCEN_Solutions_Master_Plan.md

## Purpose
Authoritative north star describing **what we are building, why, and in what order**. This document changes slowly.

## Product Objective
PCT FinCEN Solutions is a full‑service FinCEN RRER compliance platform that:
- Determines reportability
- Collects required data from all parties
- Submits RRER filings via SDTM (BSA E‑Filing)
- Tracks acceptance, rejection, and acknowledgements
- Invoices Pacific Coast Title (initially) per successful filing

## Non‑Negotiable Principles
- Wizard + Party Portal are the core product
- No external dependency may block a closing
- All actions are auditable
- All integrations are adapter‑based and replaceable
- Demo ≠ Production, but they share seams

## System Architecture (High Level)
**Core**
- Wizard Engine (determine + collect)
- Party Portal (token‑based)
- Filing Engine (adapter‑based)
- Notification Engine (outbox → SendGrid)
- Admin Ops Console
- Billing / Invoicing Engine

**External**
- Auth (Clerk)
- Email (SendGrid)
- FinCEN BSA E‑Filing (SDTM via SFTP)
- Internal accounting (PDF invoices initially)

## Filing Strategy (Production)
- SDTM SFTP batch XML
- **One report per XML file (Day 1)**
- Async lifecycle: transmitted → messages received (accepted/rejected) → acknowledgement received (BSA IDs)

## Accounting Model
- PCT FinCEN Solutions invoices Pacific Coast Title
- Bill on RRER acceptance (MESSAGES.XML)
- Monthly PDF invoice
- Intercompany journal entry
- Stripe later (external clients)

## Phased Delivery (Locked)
- Phase 5: Demo Hardening
- Phase 6: Auth + Company Scoping
- Phase 7: SendGrid Notifications
- Phase 8: SDTM Filing Adapter
- Phase 9: Billing + Invoicing
- Phase 10: Security & Compliance Hardening

---

# ✅ PCT_FinCEN_Solutions_Accomplished_Log.md

## Purpose
Immutable ledger of what is **already real, tested, and decided**. This document only grows.

## Status as of Day 4 Snapshot (Pre‑Today)
### Backend (API)
- Demo environment support (`ENVIRONMENT=staging`)
- Secure demo endpoints: `POST /demo/reset`, `POST /demo/create-report`
- Demo endpoint security: `X-DEMO-SECRET`, env gating, 404 on failure
- Demo seed service (FK‑safe resets, deterministic reports)
- JSONB compatibility layer (Postgres + SQLite)
- Demo endpoints fully tested (10/10 passing)

### Frontend (Web)
- Demo tools page wired to demo endpoints
- Secret‑protected demo actions
- Wizard flow functional (autosave, determine, generate party links)
- Party portal submission functional
- Ready‑check logic present
- Mock file action implemented (demo‑safe)

### Architecture Decisions (Locked)
- Adapter‑based filing model
- Outbox‑first notification design
- Read‑only admin shells for demo
- Party portal remains public, token‑based
- No external auth/email dependencies for demo

## Additions Today
- Demo auth plan finalized (env‑based login)
- Admin Ops Console design finalized
- Submission lifecycle defined (accepted/rejected/retry)
- SDTM SFTP approach confirmed
- MESSAGES.XML schema mapped
- Accounting model confirmed (PCT as sole client)
- One‑report‑per‑batch confirmed

---

# 🔜 PCT_FinCEN_Solutions_Next_Steps.md

## Purpose
Execution playbook: **what we do next, in what order, and why**. This document changes frequently.

## Immediate (Post‑Demo, Week 1)
### 1. Production Authentication
- Replace demo auth with Clerk
- Introduce companies table
- Assign all users to Pacific Coast Title
- Implement admin/manager/user roles

### 2. Notification Engine → SendGrid
- Keep Outbox as source of truth
- Add SendGrid worker
- Delivery status + retries
- Admin resend capability

## Short Term (Weeks 2–4)
### 3. SDTM Filing Adapter
- SFTP transmit job
- Poll `/acks`
- Parse MESSAGES.XML
- Store acceptance/rejection detail
- Expose in Admin Ops

### 4. Billing & Invoicing
- Create billable_events on acceptance
- Monthly invoice PDF generation
- Admin billing view
- Export for accounting

## Medium Term (Weeks 5–8)
### 5. Compliance Hardening
- Field‑level encryption
- Signed uploads
- Retention enforcement
- Rate limiting
- Immutable audit trail

## Explicitly Not Yet
- External clients
- Stripe billing
- Multi‑org RBAC complexity
- White‑labeling
- BOI standalone filing

