# PCT FinCEN Solutions - Comprehensive Test Plan

## For January 29th Demo Readiness

> **Version:** 1.0  
> **Date:** January 27, 2026  
> **Purpose:** Verify complete end-to-end flow works before demo

---

## Test Environments

| Environment | API URL | Frontend URL |
|-------------|---------|--------------|
| Staging | https://pct-fin-cen-staging.onrender.com | https://pct-fin-cen-6wx3.vercel.app |
| Local | http://localhost:8000 | http://localhost:3000 |

---

## Pre-Test Setup

### 1. Reset Demo Data
```bash
# Call demo reset endpoint
curl -X POST https://pct-fin-cen-staging.onrender.com/demo/reset \
  -H "X-DEMO-SECRET: your-secret-here"
```

### 2. Test Accounts
| Role | Email | Password |
|------|-------|----------|
| Client Admin | admin@demotitle.com | demo123 |
| PCT Staff | staff@pctfincen.com | demo123 |
| PCT Admin | admin@pctfincen.com | demo123 |

### 3. Test Party Emails
Use your email with `+` aliases for testing:
- Buyer: `youremail+buyer@gmail.com`
- Seller: `youremail+seller@gmail.com`
- Beneficial Owner: `youremail+bo@gmail.com`

---

## Test Scenarios

### 🔴 SCENARIO 1: Client Creates Submission Request

**Actor:** Title Company Client (admin@demotitle.com)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1.1 | Login as client | Dashboard loads | ☐ |
| 1.2 | Click "New Request" | Form page loads | ☐ |
| 1.3 | Fill Property Info | Fields accept input | ☐ |
| | - Address: 123 Test Street | | |
| | - City: Los Angeles | | |
| | - State: CA | | |
| | - ZIP: 90210 | | |
| 1.4 | Fill Transaction Info | | ☐ |
| | - Purchase Price: $500,000 | | |
| | - Closing Date: Feb 15, 2026 | | |
| | - Escrow #: ESC-2026-001 | | |
| | - Financing: Cash (Non-Financed) | | |
| 1.5 | Fill Buyer Info | | ☐ |
| | - Name: ABC Holdings LLC | | |
| | - Email: youremail+buyer@gmail.com | | |
| | - Type: Entity | | |
| 1.6 | Fill Seller Info | | ☐ |
| | - Name: John Smith | | |
| | - Email: youremail+seller@gmail.com | | |
| 1.7 | Click "Submit Request" | Success message with ID | ☐ |
| 1.8 | Check confirmation shows real ID | Not "REQ-XXXX-MOCK" | ☐ |

**Database Check:**
```sql
SELECT * FROM submission_requests ORDER BY created_at DESC LIMIT 1;
```
☐ Record exists with correct data

---

### 🟡 SCENARIO 2: Staff Processes Request in Queue

**Actor:** PCT Staff (staff@pctfincen.com)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 2.1 | Login as staff | Dashboard loads | ☐ |
| 2.2 | Navigate to Admin > Requests | Queue page loads | ☐ |
| 2.3 | Verify submission appears | See request from 1.7 | ☐ |
| 2.4 | Check data is correct | Property, buyer, seller match | ☐ |
| 2.5 | Click "Start Wizard" | Wizard page loads | ☐ |
| 2.6 | Verify pre-filled data | Property address populated | ☐ |

**API Check:**
```bash
curl https://pct-fin-cen-staging.onrender.com/submission-requests
```
☐ Returns real data (not empty or mock)

---

### 🟢 SCENARIO 3: Determination Flow

**Actor:** PCT Staff (in wizard)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 3.1 | Step 1: Property Type | Select "Residential 1-4 Family" | ☐ |
| 3.2 | Click Next | Proceeds to financing | ☐ |
| 3.3 | Step 2: Financing | Select "Non-Financed (Cash)" | ☐ |
| 3.4 | Click Next | Proceeds to buyer type | ☐ |
| 3.5 | Step 3: Buyer Type | Select "Entity" | ☐ |
| 3.6 | Click Next | Proceeds to exemptions | ☐ |
| 3.7 | Step 4: Entity Exemptions | Select "None Apply" | ☐ |
| 3.8 | Click Next | Shows determination result | ☐ |
| 3.9 | Verify REPORTABLE | Green "Reportable" badge | ☐ |
| 3.10 | Click "Run Determination" | Backend confirms reportable | ☐ |

**Autosave Check:**
- ☐ Save indicator shows "Saving..." then "Saved"
- ☐ Refresh page - data persists

---

### 🔵 SCENARIO 4: Party Setup & Link Generation

**Actor:** PCT Staff (in wizard)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 4.1 | Navigate to Party Setup step | Form shows sellers/buyers sections | ☐ |
| 4.2 | Verify seller pre-filled | John Smith, email from submission | ☐ |
| 4.3 | Verify buyer pre-filled | ABC Holdings LLC, email from submission | ☐ |
| 4.4 | Add Beneficial Owner | Click "+ Add Beneficial Owner" | ☐ |
| | - Name: Robert Johnson | | |
| | - Email: youremail+bo@gmail.com | | |
| 4.5 | Click "Send Links" | Loading state shows | ☐ |
| 4.6 | Success message | "Links sent to 3 parties" | ☐ |
| 4.7 | Verify links displayed | URLs shown with copy buttons | ☐ |
| 4.8 | Check email received | Invitation email in inbox | ☐ |

**Database Check:**
```sql
SELECT * FROM party_links WHERE report_id = 'XXX';
```
☐ 3 party links created with tokens

---

### 🟣 SCENARIO 5: Party Portal - Individual Seller

**Actor:** Seller (via secure link)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 5.1 | Open seller link (incognito) | Landing page loads | ☐ |
| 5.2 | Verify property shown | "123 Test Street, Los Angeles" | ☐ |
| 5.3 | Verify role shown | "Seller" badge | ☐ |
| 5.4 | Click "Get Started" | Form loads | ☐ |
| 5.5 | Fill Personal Info | | ☐ |
| | - First Name: John | | |
| | - Last Name: Smith | | |
| | - DOB: 01/15/1975 | | |
| | - SSN: 123-45-6789 | | |
| | - Citizenship: US Citizen | | |
| 5.6 | Fill Address | | ☐ |
| | - Street: 456 New Address | | |
| | - City: San Diego | | |
| | - State: CA | | |
| | - ZIP: 92101 | | |
| 5.7 | Fill ID Info | | ☐ |
| | - ID Type: Driver's License | | |
| | - ID Number: D1234567 | | |
| | - Issuing State: California | | |
| 5.8 | Check certification box | Required for submit | ☐ |
| 5.9 | Click Submit | Success animation | ☐ |
| 5.10 | Verify confirmation ID | Shows "CONF-XXXX-XXXX" | ☐ |
| 5.11 | Try to resubmit | "Already submitted" message | ☐ |

---

### 🟤 SCENARIO 6: Party Portal - Entity Buyer

**Actor:** Buyer Contact (via secure link)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 6.1 | Open buyer link (incognito) | Landing page loads | ☐ |
| 6.2 | Verify shows "Buyer" role | Badge and context correct | ☐ |
| 6.3 | Click "Get Started" | Entity form loads | ☐ |
| 6.4 | Fill Entity Details | | ☐ |
| | - Legal Name: ABC Holdings LLC | | |
| | - Entity Type: LLC | | |
| | - EIN: 12-3456789 | | |
| | - Formation State: Delaware | | |
| | - Formation Date: 01/10/2020 | | |
| 6.5 | Fill Entity Address | | ☐ |
| | - Street: 789 Business Ave | | |
| | - City: New York | | |
| | - State: NY | | |
| | - ZIP: 10001 | | |
| 6.6 | Add Beneficial Owner 1 | | ☐ |
| | - Name: Robert Johnson | | |
| | - DOB: 03/22/1980 | | |
| | - SSN: 987-65-4321 | | |
| | - Ownership: 50% | | |
| | - Address: 123 Owner Lane, LA, CA | | |
| | - ID: CA Driver's License | | |
| 6.7 | Add Beneficial Owner 2 | Click "+ Add" | ☐ |
| | - Name: Sarah Williams | | |
| | - DOB: 07/08/1985 | | |
| | - SSN: 456-78-9012 | | |
| | - Ownership: 50% | | |
| 6.8 | Fill Payment Info | | ☐ |
| | - Source: Business Funds | | |
| | - Amount: $500,000 | | |
| | - Method: Wire Transfer | | |
| | - Bank: Chase Bank | | |
| | - Account (last 4): 4567 | | |
| 6.9 | Check certification | | ☐ |
| 6.10 | Click Submit | Success page | ☐ |
| 6.11 | Verify confirmation ID | Shows unique ID | ☐ |

---

### ⚫ SCENARIO 7: Staff Monitoring & Review

**Actor:** PCT Staff (back in wizard)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 7.1 | Return to wizard | Party status visible | ☐ |
| 7.2 | Check progress indicator | "2/3 Complete" (or 3/3) | ☐ |
| 7.3 | Verify seller shows submitted | Green checkmark | ☐ |
| 7.4 | Verify buyer shows submitted | Green checkmark | ☐ |
| 7.5 | Wait for auto-refresh | Status updates automatically | ☐ |
| 7.6 | When all complete | "All Parties Submitted" banner | ☐ |
| 7.7 | Click "Review Submissions" | Review page loads | ☐ |
| 7.8 | Verify seller data visible | Name, DOB, address shown | ☐ |
| 7.9 | Verify SSN is masked | Shows •••-••-6789 | ☐ |
| 7.10 | Verify buyer entity data | Company, EIN, address | ☐ |
| 7.11 | Verify beneficial owners | Both BOs displayed | ☐ |
| 7.12 | Verify payment info | Wire transfer details | ☐ |
| 7.13 | Check staff certification | Click checkbox | ☐ |
| 7.14 | Click "Proceed to File" | Navigate to file step | ☐ |

---

### ⬛ SCENARIO 8: Filing

**Actor:** PCT Staff

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 8.1 | View filing summary | Property, parties listed | ☐ |
| 8.2 | Verify deadline calculated | 30 days from closing | ☐ |
| 8.3 | Run Ready Check | "Ready to File" result | ☐ |
| 8.4 | Check final certification | Click checkbox | ☐ |
| 8.5 | Click "Submit to FinCEN" | Loading state | ☐ |
| 8.6 | Verify success | Green success card | ☐ |
| 8.7 | Note Receipt ID | "BSA-XXXX-XXXX" | ☐ |
| 8.8 | Verify report status | "Filed" badge | ☐ |
| 8.9 | Check admin dashboard | Filing appears in list | ☐ |

---

## Quick Diagnostic Commands

### Check API Health
```bash
curl https://pct-fin-cen-staging.onrender.com/health
# Expected: {"status": "healthy"}
```

### Check Submission Requests
```bash
curl https://pct-fin-cen-staging.onrender.com/submission-requests
# Expected: Array of submissions (not empty)
```

### Check Reports
```bash
curl https://pct-fin-cen-staging.onrender.com/reports
# Expected: Array of reports
```

### Check Party Status
```bash
curl https://pct-fin-cen-staging.onrender.com/reports/{REPORT_ID}/parties
# Expected: Party data with submission status
```

### Check Notification Outbox
```bash
curl https://pct-fin-cen-staging.onrender.com/demo/notifications \
  -H "X-DEMO-SECRET: your-secret"
# Expected: Email notifications logged
```

---

## Troubleshooting Guide

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Form submits but shows mock ID | API not wired | Check NEXT_PUBLIC_API_BASE_URL |
| Admin queue shows mock data | Fetch not implemented | Check admin requests page |
| Party links not sending | SendGrid disabled | Check SENDGRID_ENABLED env var |
| Wizard doesn't pre-fill | wizard_data not set | Check create-report endpoint |
| Party portal 404 | Invalid token | Generate new link |
| Filing fails ready check | Parties not submitted | Check party status |
| Review page empty | API returning no data | Check party_data field |

---

## Success Criteria for Demo

### Must Pass (Demo Blockers)
- [ ] Scenario 1: Client submission creates real record
- [ ] Scenario 2: Admin queue shows real data
- [ ] Scenario 3: Determination works end-to-end
- [ ] Scenario 4: Party links generate and (optionally) send
- [ ] Scenario 5: Seller portal submits successfully
- [ ] Scenario 6: Buyer portal with BOs submits
- [ ] Scenario 7: Staff can view submitted data
- [ ] Scenario 8: Filing completes successfully

### Nice to Have
- [ ] Email notifications actually send
- [ ] Auto-refresh shows real-time updates
- [ ] All edge cases handled gracefully

---

## Sign-Off

| Test Run | Date | Tester | Result | Notes |
|----------|------|--------|--------|-------|
| 1 | | | | |
| 2 | | | | |
| Final | | | | |

---

## Appendix: KilledSharks.md Reference

Track fixes in KilledSharks.md with this format:

```markdown
## [Shark Name]
- **Issue:** Description of the problem
- **Root Cause:** What was wrong
- **Fix:** What was changed
- **Files Modified:** List of files
- **Test:** How to verify it's fixed
- **Status:** ✅ Killed
```

Example:
```markdown
## Shark: Mock Submission Data
- **Issue:** Client form used setTimeout instead of real API
- **Root Cause:** No API route existed for /submission-requests
- **Fix:** Created routes/submission_requests.py, wired frontend
- **Files Modified:** 
  - api/app/routes/submission_requests.py (new)
  - api/app/main.py (router registration)
  - web/app/(app)/app/requests/new/page.tsx (API call)
- **Test:** Submit form, check database for new record
- **Status:** ✅ Killed
```
