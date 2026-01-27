# CURSOR PROMPT: Final Gap Closure & Wiring

## OBJECTIVE

The wizard restructure created new UI steps, but they are NOT connected to the backend APIs. This prompt closes ALL remaining gaps so the demo flow works end-to-end.

**After this fix, the complete flow will work:**
```
Client Submit → Admin Queue → Wizard Determination → Party Setup → SEND LINKS → 
Party Portal → MONITOR PROGRESS → Review → FILE TO FINCEN → Success!
```

---

## CRITICAL GAPS TO FIX

| Gap | Location | Issue | API to Call |
|-----|----------|-------|-------------|
| 1 | party-setup step | "Send Links" button doesn't call API | `POST /reports/{id}/party-links` |
| 2 | monitor-progress step | May not be using party status polling | `GET /reports/{id}/parties` |
| 3 | file-report step | "Submit to FinCEN" button doesn't call API | `POST /reports/{id}/file` |

---

## FIX 1: Wire party-setup "Send Links" to API

### File: `web/components/rrer-questionnaire.tsx`

### Find the party-setup step's "Send Links" or "Send Links & Continue" button.

The button handler needs to:
1. Collect parties from `partySetup.sellers` and `partySetup.buyers` state
2. Transform them into the API format
3. Call the existing `createPartyLinks` function from `web/lib/api.ts`
4. Handle loading state
5. Show success/error toast
6. Move to `monitor-progress` step on success

### Implementation:

First, ensure you have the import:
```typescript
import { createPartyLinks } from "@/lib/api";
```

Add state for loading:
```typescript
const [sendingLinks, setSendingLinks] = useState(false);
```

Add the handler function:
```typescript
const handleSendPartyLinks = async () => {
  // Validate we have at least one seller and one buyer
  if (partySetup.sellers.length === 0) {
    toast({
      title: "Missing Seller",
      description: "Please add at least one seller.",
      variant: "destructive",
    });
    return;
  }
  
  if (partySetup.buyers.length === 0) {
    toast({
      title: "Missing Buyer", 
      description: "Please add at least one buyer.",
      variant: "destructive",
    });
    return;
  }

  // Validate all parties have name and email
  const allParties = [...partySetup.sellers, ...partySetup.buyers];
  const invalidParty = allParties.find(p => !p.name?.trim() || !p.email?.trim());
  if (invalidParty) {
    toast({
      title: "Missing Information",
      description: "All parties must have a name and email address.",
      variant: "destructive",
    });
    return;
  }

  setSendingLinks(true);
  
  try {
    // Transform to API format
    const parties = [
      ...partySetup.sellers.map(s => ({
        party_role: "transferor" as const,
        entity_type: s.type || "individual",
        display_name: s.name,
        email: s.email,
      })),
      ...partySetup.buyers.map(b => ({
        party_role: "transferee" as const,
        entity_type: b.type || "entity",
        display_name: b.name,
        email: b.email,
      })),
    ];

    // Call the API
    const result = await createPartyLinks(reportId, parties);
    
    // Store the generated links in state (if needed for display)
    if (result.links) {
      setPartyLinks(result.links);
    }
    
    // Show success
    toast({
      title: "Links Sent Successfully! 🎉",
      description: `Secure links sent to ${parties.length} parties via email.`,
    });
    
    // Refresh report to get updated status
    if (onReportUpdate) {
      // If there's a callback to refresh the report, call it
      onReportUpdate();
    }
    
    // Move to monitor-progress step
    setCollectionStep("monitor-progress");
    
  } catch (error) {
    console.error("Failed to send party links:", error);
    toast({
      title: "Failed to Send Links",
      description: error instanceof Error ? error.message : "Please try again.",
      variant: "destructive",
    });
  } finally {
    setSendingLinks(false);
  }
};
```

### Update the button in the party-setup step UI:

Find the "Send Links" button and update it:
```tsx
<Button 
  onClick={handleSendPartyLinks}
  disabled={sendingLinks || partySetup.sellers.length === 0 || partySetup.buyers.length === 0}
  className="bg-gradient-to-r from-primary to-teal-600"
>
  {sendingLinks ? (
    <>
      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      Sending Links...
    </>
  ) : (
    <>
      <Send className="h-4 w-4 mr-2" />
      Send Links & Continue
    </>
  )}
</Button>
```

---

## FIX 2: Wire monitor-progress to Party Status Polling

### File: `web/components/rrer-questionnaire.tsx`

### The monitor-progress step needs to display real-time party submission status.

The wizard page (`web/app/(app)/app/reports/[id]/wizard/page.tsx`) already has:
- `partyStatus` state
- `fetchPartyStatus` function
- 15-second polling when `report?.status === "collecting"`

**Option A:** If the questionnaire component receives `partyStatus` as a prop, use it directly.

**Option B:** If not, add polling within the questionnaire when on monitor-progress step.

### If partyStatus is NOT being passed as a prop, add it:

In the wizard page (`page.tsx`), pass partyStatus to the questionnaire:
```tsx
<RRERQuestionnaire
  initialData={initialData}
  onChange={handleQuestionnaireChange}
  saveStatus={saveStatus}
  reportId={reportId}
  partyStatus={partyStatus}           // ADD THIS
  onRefreshPartyStatus={fetchPartyStatus}  // ADD THIS
/>
```

Update the questionnaire props interface:
```typescript
interface RRERQuestionnaireProps {
  initialData?: {...};
  onChange?: (data: any) => void;
  saveStatus?: string;
  reportId?: string;
  partyStatus?: ReportPartiesResponse | null;  // ADD
  onRefreshPartyStatus?: () => void;            // ADD
}
```

### Ensure the monitor-progress step UI displays the data:

```tsx
{collectionStep === "monitor-progress" && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Users className="h-5 w-5" />
        Monitoring Party Submissions
      </CardTitle>
      <CardDescription>
        Track information submissions from all parties in real-time
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      
      {/* Progress Summary */}
      {partyStatus ? (
        <>
          <div className="text-center p-6 bg-muted/30 rounded-lg">
            <p className="text-4xl font-bold text-primary">
              {partyStatus.summary.submitted} of {partyStatus.summary.total}
            </p>
            <p className="text-muted-foreground mt-1">Parties Submitted</p>
            <Progress 
              value={(partyStatus.summary.submitted / partyStatus.summary.total) * 100} 
              className="mt-4 h-3"
            />
          </div>
          
          {/* All Complete Banner */}
          {partyStatus.summary.all_complete && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">All Parties Have Submitted!</p>
                <p className="text-sm text-green-600">You can now proceed to review the submissions.</p>
              </div>
            </div>
          )}
          
          {/* Party Cards */}
          <div className="space-y-3">
            {partyStatus.parties.map((party) => (
              <Card key={party.id} className={cn(
                "transition-colors",
                party.status === "submitted" && "border-green-200 bg-green-50/30"
              )}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        party.status === "submitted" ? "bg-green-100" : "bg-muted"
                      )}>
                        {party.entity_type === "individual" ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Building2 className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{party.display_name || "Unnamed Party"}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {party.party_role === "transferor" ? "Seller" : "Buyer"} • {party.entity_type}
                        </p>
                        <p className="text-xs text-muted-foreground">{party.email}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {party.status === "submitted" ? (
                        <Badge className="bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Submitted
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                      {party.submitted_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(party.submitted_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions for pending parties */}
                  {party.status === "pending" && party.link && (
                    <div className="mt-3 pt-3 border-t flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(party.link!);
                          toast({ title: "Link Copied!" });
                        }}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy Link
                      </Button>
                      <Button size="sm" variant="outline">
                        <Mail className="h-3 w-3 mr-1" />
                        Resend Email
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Auto-refresh indicator */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Auto-refreshing every 15 seconds
            {onRefreshPartyStatus && (
              <Button variant="link" size="sm" onClick={onRefreshPartyStatus} className="h-auto p-0 ml-2">
                Refresh Now
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          Loading party status...
        </div>
      )}
    </CardContent>
  </Card>
)}
```

### Update navigation logic - "Continue" disabled until all complete:

```typescript
const canProceedFromMonitor = partyStatus?.summary.all_complete === true;
```

In the navigation buttons for monitor-progress:
```tsx
<Button
  onClick={() => setCollectionStep("review-submissions")}
  disabled={!canProceedFromMonitor}
>
  Continue to Review
  <ArrowRight className="h-4 w-4 ml-2" />
</Button>
```

---

## FIX 3: Wire file-report "Submit to FinCEN" to API

### File: `web/components/rrer-questionnaire.tsx`

### The file-report step needs to call the filing API.

Add imports:
```typescript
import { readyCheck, fileReport } from "@/lib/api";
```

Add state:
```typescript
const [runningReadyCheck, setRunningReadyCheck] = useState(false);
const [readyCheckResult, setReadyCheckResult] = useState<{ ready: boolean; errors?: string[] } | null>(null);
const [filing, setFiling] = useState(false);
const [filingResult, setFilingResult] = useState<{
  status: string;
  receipt_id?: string;
  message?: string;
} | null>(null);
```

Add the ready check handler:
```typescript
const handleReadyCheck = async () => {
  setRunningReadyCheck(true);
  try {
    const result = await readyCheck(reportId);
    setReadyCheckResult(result);
    
    if (result.ready) {
      toast({
        title: "Ready to File ✓",
        description: "All checks passed. You can now submit to FinCEN.",
      });
    } else {
      toast({
        title: "Not Ready",
        description: `${result.errors?.length || 0} issue(s) found.`,
        variant: "destructive",
      });
    }
  } catch (error) {
    toast({
      title: "Check Failed",
      description: "Could not verify filing readiness.",
      variant: "destructive",
    });
  } finally {
    setRunningReadyCheck(false);
  }
};
```

Add the file handler:
```typescript
const handleFileToFinCEN = async () => {
  if (!fileCertified) {
    toast({
      title: "Certification Required",
      description: "Please check the certification box before filing.",
      variant: "destructive",
    });
    return;
  }

  setFiling(true);
  try {
    // Run ready check first if not already done
    if (!readyCheckResult?.ready) {
      const check = await readyCheck(reportId);
      setReadyCheckResult(check);
      if (!check.ready) {
        throw new Error("Report is not ready to file");
      }
    }
    
    // Submit to FinCEN
    const result = await fileReport(reportId);
    
    setFilingResult({
      status: result.status,
      receipt_id: result.receipt_id,
      message: result.message,
    });
    
    toast({
      title: "Report Filed Successfully! 🎉",
      description: `Receipt ID: ${result.receipt_id}`,
    });
    
    // Refresh report to get updated status
    if (onReportUpdate) {
      onReportUpdate();
    }
    
  } catch (error) {
    console.error("Filing failed:", error);
    toast({
      title: "Filing Failed",
      description: error instanceof Error ? error.message : "Please try again.",
      variant: "destructive",
    });
  } finally {
    setFiling(false);
  }
};
```

### Update the file-report step UI:

```tsx
{collectionStep === "file-report" && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <FileText className="h-5 w-5" />
        File Report to FinCEN
      </CardTitle>
      <CardDescription>
        Final review and submission
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      
      {/* Show success state if filed */}
      {filingResult?.status === "accepted" ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-green-800">Report Filed Successfully!</h3>
          <p className="text-muted-foreground mt-2">Your report has been submitted to FinCEN.</p>
          
          <Card className="mt-6 bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-sm text-muted-foreground">Receipt ID</p>
                  <p className="font-mono font-bold">{filingResult.receipt_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className="bg-green-600">Accepted</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Button 
            className="mt-6"
            onClick={() => window.location.href = "/app/reports"}
          >
            Back to Reports Dashboard
          </Button>
        </div>
      ) : (
        <>
          {/* Filing Summary */}
          <div className="p-4 bg-muted/30 rounded-lg space-y-2">
            <h4 className="font-semibold">Filing Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Property:</span>
                <p className="font-medium">{/* property address */}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Determination:</span>
                <Badge>Reportable</Badge>
              </div>
            </div>
          </div>
          
          {/* Pre-Filing Check */}
          <div className="space-y-3">
            <h4 className="font-semibold">Pre-Filing Check</h4>
            
            {readyCheckResult ? (
              <div className={cn(
                "p-4 rounded-lg border",
                readyCheckResult.ready 
                  ? "bg-green-50 border-green-200" 
                  : "bg-red-50 border-red-200"
              )}>
                {readyCheckResult.ready ? (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">All checks passed. Ready to file.</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 text-red-700 mb-2">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-medium">Issues found:</span>
                    </div>
                    <ul className="list-disc list-inside text-sm text-red-600">
                      {readyCheckResult.errors?.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <Button 
                variant="outline" 
                onClick={handleReadyCheck}
                disabled={runningReadyCheck}
              >
                {runningReadyCheck ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running Checks...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Run Pre-Filing Check
                  </>
                )}
              </Button>
            )}
          </div>
          
          {/* Final Certification */}
          <div className="p-4 border rounded-lg space-y-4">
            <h4 className="font-semibold">Final Certification</h4>
            <div className="flex items-start gap-3">
              <Checkbox
                id="file-cert"
                checked={fileCertified}
                onCheckedChange={(checked) => setFileCertified(checked as boolean)}
              />
              <label htmlFor="file-cert" className="text-sm leading-relaxed cursor-pointer">
                I certify that I have reviewed all information in this report, the information 
                is accurate to the best of my knowledge, and I am authorized to submit this 
                report to FinCEN on behalf of the reporting person.
              </label>
            </div>
          </div>
          
          {/* Submit Button */}
          <Button
            onClick={handleFileToFinCEN}
            disabled={filing || !fileCertified || (readyCheckResult && !readyCheckResult.ready)}
            className="w-full bg-gradient-to-r from-primary to-teal-600 py-6 text-lg"
          >
            {filing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Submitting to FinCEN...
              </>
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                Submit to FinCEN
              </>
            )}
          </Button>
        </>
      )}
    </CardContent>
  </Card>
)}
```

---

## VERIFICATION CHECKLIST

After implementing all fixes, verify:

### Party-Setup Step
- [ ] "Send Links" button shows loading state when clicked
- [ ] API call to `POST /reports/{id}/party-links` is made
- [ ] Success toast shows number of parties
- [ ] On success, automatically moves to monitor-progress step
- [ ] Error toast shows if API fails

### Monitor-Progress Step
- [ ] Shows total/submitted/pending counts
- [ ] Progress bar reflects completion percentage
- [ ] Each party shows as card with status badge
- [ ] Pending parties show "Copy Link" and "Resend" buttons
- [ ] Auto-refresh indicator visible
- [ ] "All Complete" banner shows when done
- [ ] "Continue" button disabled until all parties submitted

### File-Report Step
- [ ] "Run Pre-Filing Check" button works
- [ ] Ready check result displays (pass/fail)
- [ ] Certification checkbox required
- [ ] "Submit to FinCEN" button disabled until certified
- [ ] Filing shows loading state
- [ ] Success state shows receipt ID
- [ ] Error state shows message

---

## UPDATE KilledSharks.md

After implementing these fixes, add this entry to `docs/KilledSharks.md`:

```markdown
---

### 7. Wizard Step API Wiring ✅

**Problem:** The new wizard collection steps (party-setup, monitor-progress, file-report) had complete UI but were NOT connected to backend APIs. Buttons did nothing.

**Impact:**
- "Send Links" button didn't send links
- Party status wasn't being polled/displayed
- "Submit to FinCEN" button didn't file

**Solution:** Wired all new wizard steps to existing API functions.

| Step | Button | API Called | Status |
|------|--------|------------|--------|
| party-setup | "Send Links & Continue" | `createPartyLinks()` | ✅ Wired |
| monitor-progress | Auto-poll | `getReportParties()` | ✅ Wired |
| file-report | "Run Pre-Filing Check" | `readyCheck()` | ✅ Wired |
| file-report | "Submit to FinCEN" | `fileReport()` | ✅ Wired |

**Features Added:**
- Loading states on all buttons
- Success/error toasts
- Validation before API calls
- Auto-navigation after success
- Party status real-time display
- Ready check pass/fail display
- Filing success state with receipt ID

**Files Changed:**
- `web/components/rrer-questionnaire.tsx` (API integration)
- `web/app/(app)/app/reports/[id]/wizard/page.tsx` (pass partyStatus prop if needed)

**Test:** 
1. Add parties in party-setup → Click "Send Links" → Check DB for party_links
2. Watch monitor-progress → See status update when party submits
3. Click "Submit to FinCEN" → See receipt ID on success

**Status:** ✅ Killed

---

## Summary Update

| Category | Count |
|----------|-------|
| 🔴 Critical Fixes | 3 |
| 🟠 Major Features | 4 |
| 🔄 Documentation | 3 |

## Updated Remaining Gaps

| Gap | Priority | Status |
|-----|----------|--------|
| ~~Party portal missing 25+ FinCEN fields~~ | ~~P1~~ | ✅ **FIXED** |
| ~~No party data review screen~~ | ~~P1~~ | ✅ **FIXED** |
| ~~Wizard collects party data (should only do determination)~~ | ~~P2~~ | ✅ **FIXED** |
| ~~Wizard steps not calling APIs~~ | ~~P0~~ | ✅ **FIXED** |
| No purchase_price in Report model | P3 | Deferred (using wizard_data) |

## Testing Checklist Update

- [x] Party-setup "Send Links" calls API
- [x] Monitor-progress shows real-time party status
- [x] File-report "Submit to FinCEN" calls API
- [x] Loading states on all async actions
- [x] Error handling with toast notifications
- [x] Navigation flow complete end-to-end
```

---

## FINAL TESTING SEQUENCE

After all fixes are implemented:

1. **Start fresh:** Call `POST /demo/reset` to clear data

2. **Client flow:**
   - Login as client
   - Submit new request with property, buyer, seller info
   - Note the request ID

3. **Staff flow:**
   - Login as staff
   - See request in admin queue
   - Click "Start Wizard"
   - Run through determination (residential, cash, entity, no exemptions)
   - Get "Reportable" result

4. **Party setup:**
   - In party-setup step, verify seller/buyer pre-filled
   - Click "Send Links & Continue"
   - Verify toast shows success
   - Verify moved to monitor-progress step

5. **Party portal (in incognito):**
   - Open seller link → Fill individual form → Submit
   - Open buyer link → Fill entity form with 2 BOs → Submit

6. **Monitoring:**
   - Return to wizard monitor-progress
   - See status update (may need manual refresh)
   - When all complete, continue to review

7. **Review:**
   - Click "Review All Submissions" 
   - Verify all party data visible
   - Check certification box
   - Proceed to file

8. **Filing:**
   - Run pre-filing check → Should pass
   - Check certification box
   - Click "Submit to FinCEN"
   - Verify success with receipt ID

**If all steps pass, the demo is ready!** 🎉
