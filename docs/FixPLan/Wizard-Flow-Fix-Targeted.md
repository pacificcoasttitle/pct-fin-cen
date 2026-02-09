# 🧙‍♂️ Wizard Flow Fix — Targeted Implementation

## Context

The wizard already works correctly:
- ✅ Exempt flow properly gated (Phase 2/3 disabled)
- ✅ `handleSendPartyLinks` calls backend → SendGrid sends emails
- ✅ Party monitoring with polling exists

**The problems are purely UX:**
1. No confirmation after sending links — auto-advances immediately
2. No gate before review — can advance even if parties haven't submitted
3. Reporting person not pre-filled with escrow officer info

---

## Existing Structure (DO NOT CHANGE)

```
State Variables:
- phase: "determination" | "collection" | "summary"
- collectionStep: CollectionStepId

Collection Steps (in order):
- "transaction-property"
- "party-setup"
- "monitor-progress"
- "review-submissions"
- "reporting-person"
- "file-report"
```

---

# FIX 1: Links Sent Confirmation Screen

## 1.1 Create Component

**File:** `web/components/wizard/LinksSentConfirmation.tsx`

```tsx
"use client";

import { CheckCircle, Mail, Clock, ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

interface Party {
  name: string;
  email: string;
  type: string;
}

interface LinksSentConfirmationProps {
  sellers: Party[];
  buyers: Party[];
  propertyAddress: string;
  onViewStatus: () => void;
}

export function LinksSentConfirmation({
  sellers,
  buyers,
  propertyAddress,
  onViewStatus,
}: LinksSentConfirmationProps) {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Party Links Sent Successfully!
        </h1>
        <p className="text-gray-600">
          Secure portal links have been emailed for{" "}
          <span className="font-medium">{propertyAddress}</span>
        </p>
      </div>

      {/* Parties List */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold">Emails Sent To:</h2>
          </div>

          {buyers.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-500 mb-2">BUYERS</p>
              {buyers.map((party, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{party.name}</p>
                    <p className="text-sm text-gray-500">{party.email}</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    ✓ Link Sent
                  </span>
                </div>
              ))}
            </div>
          )}

          {sellers.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">SELLERS</p>
              {sellers.map((party, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{party.name}</p>
                    <p className="text-sm text-gray-500">{party.email}</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    ✓ Link Sent
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* What Happens Next */}
      <Card className="mb-6 border-amber-200 bg-amber-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-amber-900">What Happens Next</h2>
          </div>
          <ol className="space-y-3 text-sm text-amber-900">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>Each party receives an email with a secure link to their portal</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>They fill out their required information (typically 5-10 minutes each)</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span><strong>You'll receive an email</strong> when all parties have submitted</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <span>Return here to review their submissions and file with FinCEN</span>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1"
          asChild
        >
          <Link href="/app/dashboard">
            <Home className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        
        <Button
          className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
          onClick={onViewStatus}
        >
          View Party Status
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Reassurance */}
      <p className="text-center text-sm text-gray-500 mt-6">
        You can safely close this page. We'll email you when all parties complete their submissions.
      </p>
    </div>
  );
}
```

## 1.2 Update rrer-questionnaire.tsx

### Add Import

```tsx
// Add to imports at top of file
import { LinksSentConfirmation } from "@/components/wizard/LinksSentConfirmation";
```

### Add State Variable

Find the state declarations (around line 100-200) and add:

```tsx
const [showLinksSentConfirmation, setShowLinksSentConfirmation] = useState(false);
```

### Update handleSendPartyLinks

Find `handleSendPartyLinks` (around line 514-595). Change the end of the function:

**BEFORE (line ~583):**
```tsx
    // Auto-advance to monitor-progress
    setCollectionStep("monitor-progress")
```

**AFTER:**
```tsx
    // Show confirmation screen instead of auto-advancing
    setShowLinksSentConfirmation(true);
```

### Add Confirmation Screen Render

Find where `collectionStep === "party-setup"` renders (around line 2100-2300). Add this check at the START of that section:

```tsx
{/* Links Sent Confirmation - shows after successful send */}
{collectionStep === "party-setup" && showLinksSentConfirmation && (
  <LinksSentConfirmation
    sellers={partySetup.sellers}
    buyers={partySetup.buyers}
    propertyAddress={`${collection.propertyAddress.street}, ${collection.propertyAddress.city}`}
    onViewStatus={() => {
      setShowLinksSentConfirmation(false);
      setCollectionStep("monitor-progress");
    }}
  />
)}

{/* Normal party-setup content - only show if NOT showing confirmation */}
{collectionStep === "party-setup" && !showLinksSentConfirmation && (
  // ... existing party-setup JSX ...
)}
```

**Note:** You'll need to wrap the existing party-setup content in the second conditional.

---

# FIX 2: Gate Review Step Until Parties Submit

## 2.1 Find the Monitor Progress Section

Find where `collectionStep === "monitor-progress"` renders (around line 2600-2800).

## 2.2 Add Gate Check

Find the "Next" or "Continue to Review" button in that section. It likely looks like:

```tsx
<Button onClick={() => setCollectionStep("review-submissions")}>
  Continue to Review
</Button>
```

**Replace with:**

```tsx
{/* Gate: Only allow proceeding if all parties submitted */}
{partyStatuses && partyStatuses.every(p => p.status === "submitted") ? (
  <Button 
    onClick={() => setCollectionStep("review-submissions")}
    className="bg-gradient-to-r from-green-500 to-emerald-600"
  >
    <CheckCircle className="w-4 h-4 mr-2" />
    All Parties Ready — Continue to Review
  </Button>
) : (
  <div className="text-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
    <p className="text-amber-800 text-sm">
      <strong>Waiting for parties to submit.</strong><br />
      You'll receive an email when everyone has completed their forms.<br />
      You can safely close this page and return later.
    </p>
  </div>
)}
```

## 2.3 Make Sure partyStatuses Exists

Check if there's already a state variable for party statuses. It might be called:
- `partyStatuses`
- `partyStatus`
- `parties`
- `partyLinks`

If not, add this state and fetch:

```tsx
const [partyStatuses, setPartyStatuses] = useState<PartyStatus[]>([]);

// In useEffect or wherever party data is fetched:
const fetchPartyStatuses = async () => {
  const response = await fetch(`/api/reports/${reportId}/parties`);
  const data = await response.json();
  setPartyStatuses(data.parties);
};
```

---

# FIX 3: Pre-fill Reporting Person

## 3.1 Get User Context

Find where the component gets the current user. Look for:
- `useAuth()` hook
- `user` prop
- `currentUser` from context

If not available, add it:

```tsx
// Add import
import { useAuth } from "@/lib/auth-context"; // or wherever your auth hook is

// Inside component
const { user } = useAuth();
```

## 3.2 Update Initial State

Find where `reportingPerson` state is initialized. It likely uses `createEmptyReportingPerson()`.

**BEFORE:**
```tsx
const [reportingPerson, setReportingPerson] = useState<ReportingPerson>(
  createEmptyReportingPerson()
);
```

**AFTER:**
```tsx
const [reportingPerson, setReportingPerson] = useState<ReportingPerson>(() => {
  // Pre-fill with logged-in user's info if available
  const empty = createEmptyReportingPerson();
  
  if (user) {
    return {
      ...empty,
      companyName: user.company_name || user.companyName || "",
      contactName: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
    };
  }
  
  return empty;
});
```

## 3.3 Alternative: Pre-fill from Report

If the report already has company info attached:

```tsx
const [reportingPerson, setReportingPerson] = useState<ReportingPerson>(() => {
  const empty = createEmptyReportingPerson();
  
  // Try to get from report's company
  if (report?.company) {
    return {
      ...empty,
      companyName: report.company.name || "",
      // ... other fields if available
    };
  }
  
  // Or from wizard_data if previously saved
  if (report?.wizard_data?.collection?.reportingPerson) {
    return report.wizard_data.collection.reportingPerson;
  }
  
  return empty;
});
```

---

# FIX 4: Dashboard "Awaiting Parties" Section

## 4.1 Client Dashboard

**File:** `web/app/(app)/app/dashboard/page.tsx`

Find where reports are displayed. Add a section for awaiting parties:

```tsx
// Filter reports awaiting parties
const awaitingParties = reports?.filter(r => r.status === "awaiting_parties") || [];

// Add this section (before or after existing report lists)
{awaitingParties.length > 0 && (
  <Card className="border-amber-200 bg-amber-50 mb-6">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-lg">
        <Clock className="w-5 h-5 text-amber-600" />
        Awaiting Party Responses ({awaitingParties.length})
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {awaitingParties.map(report => (
          <Link
            key={report.id}
            href={`/app/reports/${report.id}/wizard`}
            className="block p-3 bg-white rounded-lg border hover:border-amber-400 transition"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{report.property_address || "Property"}</p>
                <p className="text-sm text-gray-500">
                  {report.parties_submitted || 0}/{report.parties_total || 0} parties submitted
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </div>
          </Link>
        ))}
      </div>
    </CardContent>
  </Card>
)}
```

---

# FIX 5: Update Report Status After Sending Links

## 5.1 Backend Update

**File:** `api/app/routes/reports.py` (or wherever party links are created)

Find the endpoint that handles `POST /reports/{reportId}/party-links`.

After successfully creating and sending links, update the report status:

```python
# After sending all links successfully:
report.status = "awaiting_parties"
db.commit()
```

## 5.2 Backend: Auto-Ready When All Submit

**File:** `api/app/routes/parties.py`

Find where party submission is handled (the portal submit endpoint). After marking a party as submitted, check if all are done:

```python
# After party.status = "submitted"
party.status = "submitted"
party.submitted_at = datetime.utcnow()

# Check if all parties for this report are now submitted
all_parties = db.query(ReportParty).filter(
    ReportParty.report_id == party.report_id
).all()

if all(p.status == "submitted" for p in all_parties):
    # Update report status
    report = db.query(Report).filter(Report.id == party.report_id).first()
    report.status = "ready_to_file"
    
    # Send notification email to escrow officer
    # (Add this if you have email service wired)
    
db.commit()
```

---

# Verification Checklist

After implementing, test:

- [ ] **Send links** → Shows confirmation screen with party list
- [ ] **Confirmation screen** → "Back to Dashboard" works
- [ ] **Confirmation screen** → "View Status" advances to monitor-progress
- [ ] **Monitor progress** → "Continue" button disabled until all parties submit
- [ ] **Monitor progress** → Shows waiting message when parties pending
- [ ] **Reporting person** → Pre-filled with logged-in user info
- [ ] **Dashboard** → Shows "Awaiting Parties" card for relevant reports
- [ ] **Exempt flow** → Unchanged, still terminates at certificate

---

# Summary of Changes

| File | Change |
|------|--------|
| `web/components/wizard/LinksSentConfirmation.tsx` | NEW — confirmation component |
| `web/components/rrer-questionnaire.tsx` | Add state, show confirmation, gate review |
| `web/app/(app)/app/dashboard/page.tsx` | Add awaiting parties section |
| `api/app/routes/reports.py` | Set status to awaiting_parties after send |
| `api/app/routes/parties.py` | Auto-update to ready_to_file when all submit |

**Total effort:** ~2-3 hours
