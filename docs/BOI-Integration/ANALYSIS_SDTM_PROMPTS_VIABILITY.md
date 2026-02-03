# SDTM Prompts Viability Analysis

**Analysis Date:** February 2, 2026  
**Days to Deadline:** 27 days (March 1, 2026)  
**Goal:** Bridge the gap between mock filing and real FinCEN SDTM integration

---

## Executive Summary

| Prompt | Focus | Estimated Effort | Viability | Priority |
|--------|-------|------------------|-----------|----------|
| **SDTM-Prompt-1** | Core SFTP transport + XML builder | 5-7 days | ✅ **HIGH** | 🔴 P0 - Must Do |
| **SDTM-Prompt-2** | Documentation & debug playbook | 1-2 days | ✅ **HIGH** | 🟡 P1 - Should Do |
| **SDTM-Prompt-3** | Admin debug UI | 2-3 days | ✅ **MEDIUM** | 🟢 P2 - Nice to Have |

**Total Estimated Effort:** 8-12 days  
**Available Time:** 27 days  
**Assessment:** ✅ **VIABLE** with proper sequencing

---

## SDTM-Prompt-1: Core Implementation

### What It Delivers

1. **FBARX XML Builder** (`fbarx_builder.py`)
   - Converts Report + parties data → FinCEN XML
   - Proper schema compliance (FBARX 2.0)
   - Deterministic SeqNum assignment
   - Required parties: transmitter(35), contact(37), filer(15), FI(41)

2. **SDTM SFTP Client** (`sdtm_client.py`)
   - Upload to `/submissions` directory
   - Download from `/acks` directory
   - Methods: `upload()`, `list_acks()`, `download()`

3. **Response Processor** (`response_processor.py`)
   - Parse `.MESSAGES.XML` (status within hours)
   - Parse `.ACKED` (BSA IDs in 2-3 business days)
   - Extract errors, warnings, receipt IDs

4. **Feature Flag Integration**
   - `FINCEN_TRANSPORT=mock|sdtm`
   - `FINCEN_ENV=sandbox|production`
   - Preserves existing demo/staging behavior

### Viability Assessment

| Requirement | Current State | Gap | Effort |
|-------------|---------------|-----|--------|
| Filing endpoint | ✅ `POST /reports/{id}/file` exists | None | 0 |
| FilingSubmission model | ✅ All fields present | Need `messages_snapshot`, `acked_snapshot` | 2 hrs |
| XML generation | ❌ None | Build from scratch | 2-3 days |
| SFTP client | ❌ No paramiko | Add library + build | 1 day |
| Response parsing | ❌ None | Build parser | 1-2 days |
| Background polling | ❌ None | Add cron/scheduler | 1 day |

### Dependencies to Add
```
paramiko>=3.4.0  # SFTP client
lxml>=5.0.0      # XML generation/parsing (optional, can use stdlib)
```

### Critical Questions

1. **Do we have SDTM credentials?**
   - Need: `SDTM_USERNAME`, `SDTM_PASSWORD`
   - Sandbox host: `sdtmtest.fincen.gov` (port 2222)
   - Production host: `sdtm.fincen.gov` (port 2222)

2. **Do we have a transmitter control number (TCC)?**
   - Required for XML header
   - Must register with FinCEN's BSA E-Filing system

3. **Is FBARX the correct schema for RRER?**
   - ⚠️ **IMPORTANT**: FBARX is for Foreign Bank Account Reports
   - RRER (Real Estate Report) uses a different schema
   - Need to verify correct schema for residential real estate transactions

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Wrong XML schema (FBARX vs RRER) | 🔴 High - filings rejected | Verify with FinCEN documentation |
| No SDTM credentials | 🔴 High - can't test | Request credentials ASAP |
| SFTP firewall issues | 🟡 Medium - deployment blocked | Test from Render environment |
| XML validation failures | 🟡 Medium - rejections | Build comprehensive validation |

### Recommendation

✅ **EXECUTE** - This is the critical path. However:
1. **First**: Verify RRER schema requirements (FBARX may be wrong)
2. **Second**: Secure SDTM sandbox credentials
3. **Third**: Implement with feature flag for safe rollout

---

## SDTM-Prompt-2: Documentation & Debug Playbook

### What It Delivers

1. **Operational documentation** in KilledSharks-2.md
2. **Environment variable reference**
3. **Filing lifecycle documentation**
4. **Debug playbook** with:
   - Upload verification steps
   - MESSAGES.XML interpretation
   - ACKED processing
   - Common failure modes
   - Artifact locations

### Viability Assessment

| Deliverable | Effort | Value |
|-------------|--------|-------|
| Environment vars doc | 30 min | 🟢 High - prevents config errors |
| Lifecycle documentation | 1 hr | 🟢 High - team clarity |
| Debug playbook | 2-3 hrs | 🟢 High - reduces support burden |
| Sandbox checklist | 1 hr | 🟢 High - safe production rollout |

### Dependencies

- Requires SDTM-Prompt-1 to be implemented first
- Should be written as code is built (not after)

### Recommendation

✅ **EXECUTE** - Critical for operations. Write incrementally as Prompt-1 is implemented.

---

## SDTM-Prompt-3: Admin Debug UI

### What It Delivers

1. **Backend API endpoints:**
   - `GET /admin/fincen/filings` - List all filings
   - `GET /admin/fincen/filings/{id}` - Full details
   - `POST /admin/fincen/filings/{id}/repoll` - Re-check SDTM
   - `GET /admin/fincen/filings/{id}/download/{type}` - Download artifacts

2. **Frontend admin screen:**
   - Table view of all filings
   - Detail view with tabs (XML, MESSAGES, ACKED)
   - Re-poll action button
   - Download buttons

### Viability Assessment

| Deliverable | Effort | Value |
|-------------|--------|-------|
| List endpoint | 1 hr | 🟡 Medium - we have `/admin/filings` already |
| Detail endpoint | 2 hrs | 🟢 High - debugging |
| Repoll endpoint | 1 hr | 🟢 High - recovery |
| Download endpoint | 1 hr | 🟡 Medium - debugging |
| Frontend list | 2 hrs | 🟡 Medium - we have similar |
| Frontend detail | 4 hrs | 🟢 High - debugging |

### Dependencies

- Requires SDTM-Prompt-1 to be implemented first
- Uses `SdtmClient` and `ResponseProcessor` from Prompt-1

### Current State

We already have:
- `/app/admin/filings` page with filing list
- FilingSubmission model with status tracking
- Basic filtering and search

We're missing:
- Full artifact storage (XML, MESSAGES, ACKED)
- Re-poll functionality
- Download endpoints

### Recommendation

🟡 **DEFER** - Can be built after launch if needed. Existing `/admin/filings` page provides basic visibility. Focus on core filing first.

---

## Critical Path Analysis

### ⚠️ Schema Clarification Needed

The prompts reference **FBARX** (Foreign Bank Account Report) schema, but we're building for **RRER** (Real Estate Reporting). These are different:

| Aspect | FBARX | RRER |
|--------|-------|------|
| Purpose | Foreign bank account reporting | Real estate transaction reporting |
| Form | FinCEN Form 114 | FinCEN RRER |
| Schema | FBARX XML 2.0 | RRER XML schema |
| Parties | Account holders, FIs | Transferees, transferors, reporting persons |

**Action Required:** Verify the correct XML schema for RRER before implementation.

### Recommended Execution Sequence

```
Day 1-2: Pre-Implementation
├── Verify RRER XML schema requirements
├── Secure SDTM sandbox credentials
├── Test SFTP connectivity from Render
└── Add paramiko to requirements.txt

Day 3-5: SDTM-Prompt-1 Phase A (XML Builder)
├── Create fincen/ service directory structure
├── Implement XML builder with RRER schema
├── Unit tests for XML generation
└── Validate against FinCEN schema

Day 6-7: SDTM-Prompt-1 Phase B (SFTP Client)
├── Implement SDTM client
├── Test upload to sandbox
├── Test acks listing
└── Integration test

Day 8-9: SDTM-Prompt-1 Phase C (Response Processing)
├── Implement MESSAGES.XML parser
├── Implement ACKED parser
├── Wire into filing lifecycle
└── Update FilingSubmission model

Day 10: SDTM-Prompt-1 Phase D (Integration)
├── Wire transport selection (mock/sdtm)
├── Add background polling
├── End-to-end test in sandbox
└── Feature flag validation

Day 11-12: SDTM-Prompt-2 (Documentation)
├── Write environment variable docs
├── Write debug playbook
├── Write sandbox checklist
└── Update KilledSharks-2.md

Day 13+ (Post-Launch): SDTM-Prompt-3 (Admin UI)
├── Implement admin endpoints
├── Build debug UI
└── Add download/repoll features
```

---

## Pre-Implementation Checklist

Before executing SDTM-Prompt-1, we need:

### 🔴 Blockers (Must Have)

- [ ] **RRER XML Schema** - Get official FinCEN RRER XML specification
- [ ] **SDTM Sandbox Credentials** - Username/password for `sdtmtest.fincen.gov`
- [ ] **Transmitter Control Code (TCC)** - Required for XML header
- [ ] **Confirm Render → SDTM connectivity** - Port 2222 outbound

### 🟡 Should Have

- [ ] Sample RRER XML file from FinCEN
- [ ] Sample MESSAGES.XML response
- [ ] Sample ACKED response
- [ ] FinCEN technical contact for questions

### 🟢 Nice to Have

- [ ] FinCEN E-Filing system sandbox account
- [ ] XML schema validation tool
- [ ] Test report data that matches RRER requirements

---

## Execution Recommendation

### Option A: Full Prompt Execution (Recommended if blockers cleared)

If we have:
- ✅ RRER XML schema
- ✅ SDTM credentials
- ✅ TCC number

**Execute in order:**
1. SDTM-Prompt-1 (5-7 days)
2. SDTM-Prompt-2 (1-2 days)
3. SDTM-Prompt-3 (optional, post-launch)

### Option B: Staged Execution (If missing blockers)

If blockers not cleared:
1. **Day 1-3:** Resolve blockers (get credentials, verify schema)
2. **Day 4-10:** Execute Prompt-1
3. **Day 11-12:** Execute Prompt-2
4. **Day 13-27:** Testing, bug fixes, production validation

### Option C: Schema-First Investigation

If RRER schema is uncertain:
1. **Day 1-2:** Web search for FinCEN RRER XML requirements
2. **Day 2-3:** Contact FinCEN or find official documentation
3. **Day 4+:** Proceed with correct schema

---

## Questions for Decision

1. **Do we have SDTM credentials?** If not, who can request them?

2. **Is FBARX the correct schema?** The prompts mention FBARX but we're building RRER.

3. **Do we have a Transmitter Control Code (TCC)?** Required for all BSA E-Filings.

4. **What's the fallback if SDTM isn't ready by March 1?**
   - Option: Extend mock mode with manual filing process
   - Option: Partner with a filing service that has SDTM access

---

## Web Research Findings

Based on web research, the **SDTM (Secure Direct Transfer Mode)** is confirmed as the correct transmission method:

- SDTM enables automated, system-to-system batch file transfers
- Uses SFTP to `sdtm.fincen.gov` (prod) or `sdtmtest.fincen.gov` (sandbox)
- Requires Transmitter Control Code (TCC) for authentication
- Port 2222 for SFTP connections

**⚠️ SCHEMA CLARIFICATION NEEDED:**
- The prompts reference **FBARX** (Foreign Bank Account Report) schema
- RRER (Real Estate Report) is a NEW form type effective March 1, 2026
- FinCEN may use a different XML schema for RRER
- **Action:** Contact FinCEN or check BSA E-Filing documentation for RRER-specific schema

---

## Conclusion

The three SDTM prompts provide a **comprehensive roadmap** for real FinCEN integration:

| Prompt | Verdict | Timing |
|--------|---------|--------|
| **Prompt-1** | ✅ Execute | Days 3-10 |
| **Prompt-2** | ✅ Execute | Days 11-12 |
| **Prompt-3** | 🟡 Defer | Post-launch |

**Critical Success Factor:** Verify RRER schema requirements before starting. The prompts reference FBARX which may not be correct for residential real estate reporting.

**Estimated Total Time:** 10-12 days of focused implementation  
**Buffer Available:** 15+ days before deadline  
**Risk Level:** MEDIUM (schema uncertainty)

---

## Immediate Action Items

### Today (Before Execution)

1. **Schema Verification**
   - Check FinCEN BSA E-Filing documentation for RRER XML schema
   - Determine if RRER uses same schema structure as FBARX or a new format
   - Download sample XML and schema XSD files if available

2. **Credentials Check**
   - Confirm we have (or can quickly obtain) SDTM sandbox credentials
   - Verify Transmitter Control Code (TCC) status
   
3. **Network Verification**
   - Test outbound SFTP from Render to port 2222
   - Ensure no firewall blocks

### If Blockers Are Cleared → Execute Prompt-1

If all blockers are cleared, we can proceed with SDTM-Prompt-1 implementation immediately.
