# 🦈 SHARK CRUSHER — All Platform Gaps

Execute these in order. Each section is a standalone fix.

---

# SHARK 1: SOC 2 Claim (5 minutes)

## Problem
Landing page claims "SOC 2 Security" — we're not certified yet.

## Find & Replace

```bash
# Find the claim
grep -rn "SOC 2\|SOC2" web/app/page.tsx web/components/ --include="*.tsx"
```

## Fix

Find any of these:
```tsx
"SOC 2 Security"
"SOC 2 Certified"
"SOC2"
```

Replace with:
```tsx
"Enterprise Security"
```

Or if it's in a stats section like:
```tsx
<Stat number="SOC 2" label="Security Certified" />
```

Change to:
```tsx
<Stat number="256-bit" label="Encryption" />
```

## Verify
```bash
# Should return 0 results
grep -rn "SOC 2\|SOC2" web/ --include="*.tsx" --include="*.ts"
```

---

# SHARK 2: Exempt Determination Not Persisted (2 hours)

## Problem
When wizard determines "exempt," certificate data lives only in React state. Page refresh = data gone. Backend doesn't save certificate ID, exemption reasons, or timestamp.

## Step 1: Check if fields exist on Report model

```bash
# Check Report model
grep -n "exemption\|certificate" api/app/models/report.py
```

## Step 2: Add fields if missing

**File:** `api/app/models/report.py`

Add these fields to the Report model if not present:

```python
from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.dialects.postgresql import JSONB

class Report(Base):
    # ... existing fields ...
    
    # Determination fields
    determination_result = Column(String(50), nullable=True)  # "exempt" or "reportable"
    determination_completed_at = Column(DateTime, nullable=True)
    exemption_certificate_id = Column(String(100), nullable=True)
    exemption_reasons = Column(JSONB, nullable=True)  # ["financing_involved", "buyer_is_individual"]
```

## Step 3: Create migration (if fields added)

```bash
cd api
alembic revision --autogenerate -m "add_exemption_fields_to_report"
alembic upgrade head
```

## Step 4: Create/Update determination endpoint

**File:** `api/app/routes/reports.py`

Add or update:

```python
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import hashlib

class DeterminationRequest(BaseModel):
    result: str  # "exempt" or "reportable"
    exemption_reasons: Optional[List[str]] = []

def generate_certificate_id(report_id: str) -> str:
    """Generate unique certificate ID: RRER-XXXXXX-YYYYYY"""
    seed = f"{report_id}-{datetime.utcnow().isoformat()}"
    hash_value = hashlib.sha256(seed.encode()).hexdigest()[:12].upper()
    return f"RRER-{hash_value[:6]}-{hash_value[6:12]}"

@router.post("/reports/{report_id}/determine")
async def save_determination(
    report_id: UUID,
    data: DeterminationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save determination result (exempt or reportable)."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(404, "Report not found")
    
    # Update wizard_data
    wizard_data = report.wizard_data or {}
    wizard_data["determination"] = {
        "result": data.result,
        "exemptionReasons": data.exemption_reasons,
        "completedAt": datetime.utcnow().isoformat(),
        "method": "wizard",
    }
    report.wizard_data = wizard_data
    
    # Update dedicated fields
    report.determination_result = data.result
    report.determination_completed_at = datetime.utcnow()
    
    if data.result == "exempt":
        report.status = "exempt"
        report.exemption_certificate_id = generate_certificate_id(str(report_id))
        report.exemption_reasons = data.exemption_reasons
    else:
        report.status = "determination_complete"
    
    db.commit()
    db.refresh(report)
    
    # Log audit
    log_audit(db, report_id, current_user, "determination_saved", {
        "result": data.result,
        "exemption_reasons": data.exemption_reasons,
    })
    
    return {
        "status": report.status,
        "determination_result": report.determination_result,
        "certificate_id": report.exemption_certificate_id,
        "exemption_reasons": report.exemption_reasons,
    }
```

## Step 5: Update frontend to call the endpoint

**File:** `web/components/rrer-questionnaire.tsx`

Find where determination completes (likely in a `handleDeterminationComplete` or similar function):

```tsx
// Add this function
const saveDetermination = async (result: "exempt" | "reportable", reasons: string[]) => {
  try {
    const res = await fetch(`/api/reports/${reportId}/determine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        result,
        exemption_reasons: reasons,
      }),
    });
    
    if (!res.ok) throw new Error("Failed to save determination");
    
    const data = await res.json();
    
    // Store certificate ID for use in certificate component
    if (data.certificate_id) {
      setCertificateId(data.certificate_id);
    }
    
    return data;
  } catch (error) {
    console.error("Error saving determination:", error);
    throw error;
  }
};

// Call it when determination is complete
// Find where you set determinationResult and add:
await saveDetermination(result, exemptionReasons);
```

## Step 6: Update ExemptionCertificate to use persisted data

When loading the certificate, fetch from API instead of relying on React state:

```tsx
// If certificate is opened from a saved report:
const { data: report } = useSWR(`/api/reports/${reportId}`);

// Use persisted data:
<ExemptionCertificate
  certificateNumber={report.exemption_certificate_id}
  exemptionReasons={report.exemption_reasons}
  determinationDate={new Date(report.determination_completed_at)}
  // ... other props from report.wizard_data.collection
/>
```

## Verify

1. Complete wizard → determine exempt
2. Refresh page
3. Certificate data should still be there
4. Check database: `SELECT exemption_certificate_id, exemption_reasons FROM reports WHERE id = 'xxx'`

---

# SHARK 3: Party Portal No Autosave (1 hour)

## Problem
Wizard has autosave. Party portal doesn't. Browser crash = lost data.

## Step 1: Find the party portal form

```bash
# Find party portal page
cat web/app/p/\[token\]/page.tsx | head -100

# Find form components
ls web/components/party-portal/
```

## Step 2: Check if useDebounce hook exists

```bash
grep -rn "useDebounce" web/hooks/ web/lib/
```

If not, create it:

**File:** `web/hooks/useDebounce.ts`

```typescript
import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

## Step 3: Add autosave to party portal

**File:** `web/app/p/[token]/page.tsx` (or the main form component)

```tsx
import { useDebounce } from "@/hooks/useDebounce";
import { useState, useEffect, useRef } from "react";

// Inside the component:
const [formData, setFormData] = useState(initialData);
const [lastSaved, setLastSaved] = useState<Date | null>(null);
const [isSaving, setIsSaving] = useState(false);
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

// Track initial data to detect changes
const initialDataRef = useRef(initialData);

// Debounce form data
const debouncedData = useDebounce(formData, 1500);

// Autosave effect
useEffect(() => {
  // Don't save if no changes or same as initial
  if (!debouncedData) return;
  if (JSON.stringify(debouncedData) === JSON.stringify(initialDataRef.current)) return;
  
  const saveProgress = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/parties/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ party_data: debouncedData }),
      });
      
      if (res.ok) {
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        initialDataRef.current = debouncedData; // Update baseline
      }
    } catch (error) {
      console.error("Autosave failed:", error);
    } finally {
      setIsSaving(false);
    }
  };
  
  saveProgress();
}, [debouncedData, token]);

// Track unsaved changes
useEffect(() => {
  if (JSON.stringify(formData) !== JSON.stringify(initialDataRef.current)) {
    setHasUnsavedChanges(true);
  }
}, [formData]);

// Warn before leaving with unsaved changes
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = "";
    }
  };
  
  window.addEventListener("beforeunload", handleBeforeUnload);
  return () => window.removeEventListener("beforeunload", handleBeforeUnload);
}, [hasUnsavedChanges]);
```

## Step 4: Add save indicator UI

```tsx
// Add this near the top of the form or in a sticky header:

<div className="flex items-center gap-2 text-sm text-gray-500">
  {isSaving ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>Saving...</span>
    </>
  ) : lastSaved ? (
    <>
      <Check className="w-4 h-4 text-green-500" />
      <span>Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}</span>
    </>
  ) : hasUnsavedChanges ? (
    <>
      <AlertCircle className="w-4 h-4 text-amber-500" />
      <span>Unsaved changes</span>
    </>
  ) : null}
</div>
```

## Verify

1. Open party portal link
2. Fill in some fields
3. Wait 2 seconds — should see "Saved" indicator
4. Close browser, reopen link
5. Data should be there

---

# SHARK 4: Client Can't Resend Party Links (30 minutes)

## Problem
Backend has resend endpoint but only staff can use it. Clients need to resend when parties say "I lost the email."

## Step 1: Check existing endpoint

```bash
grep -rn "resend.*link\|resend-link" api/app/routes/
```

## Step 2: Create client-accessible endpoint

**File:** `api/app/routes/parties.py`

Add this endpoint:

```python
@router.post("/reports/{report_id}/parties/{party_id}/resend-link")
async def resend_party_link(
    report_id: UUID,
    party_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Resend party portal link. Accessible by staff or report owner."""
    
    # Get report and verify access
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(404, "Report not found")
    
    # Check permissions
    if current_user.role in ["client_admin", "client_user"]:
        if report.company_id != current_user.company_id:
            raise HTTPException(403, "You can only manage your own reports")
    elif current_user.role not in ["pct_staff", "pct_admin", "coo"]:
        raise HTTPException(403, "Insufficient permissions")
    
    # Get party
    party = db.query(ReportParty).filter(
        ReportParty.id == party_id,
        ReportParty.report_id == report_id
    ).first()
    if not party:
        raise HTTPException(404, "Party not found on this report")
    
    # Get or create active link
    link = db.query(PartyLink).filter(
        PartyLink.party_id == party_id,
        PartyLink.is_active == True
    ).first()
    
    if not link:
        # Create new link
        link = PartyLink(
            id=uuid.uuid4(),
            party_id=party_id,
            token=secrets.token_urlsafe(32),
            is_active=True,
            created_at=datetime.utcnow(),
        )
        db.add(link)
    
    # Update last sent timestamp
    link.last_sent_at = datetime.utcnow()
    link.send_count = (link.send_count or 0) + 1
    
    db.commit()
    
    # Send email
    send_party_portal_email(
        to_email=party.email,
        party_name=party.display_name,
        party_role=party.party_role,
        portal_url=f"{settings.FRONTEND_URL}/p/{link.token}",
        property_address=get_property_address(report),
    )
    
    # Log audit
    log_audit(db, report_id, current_user, "party_link_resent", {
        "party_id": str(party_id),
        "party_email": party.email,
    })
    
    return {
        "message": "Portal link resent successfully",
        "sent_to": party.email,
    }
```

## Step 3: Add button to frontend

**File:** `web/components/rrer-questionnaire.tsx` (in the parties section)

Or wherever parties are listed:

```tsx
// Add to imports
import { RefreshCw } from "lucide-react";

// Add resend function
const resendPartyLink = async (partyId: string) => {
  try {
    setResendingId(partyId);
    const res = await fetch(`/api/reports/${reportId}/parties/${partyId}/resend-link`, {
      method: "POST",
    });
    
    if (!res.ok) throw new Error("Failed to resend");
    
    const data = await res.json();
    toast.success(`Link resent to ${data.sent_to}`);
  } catch (error) {
    toast.error("Failed to resend link");
  } finally {
    setResendingId(null);
  }
};

// Add button next to each party
<Button
  variant="ghost"
  size="sm"
  onClick={() => resendPartyLink(party.id)}
  disabled={resendingId === party.id}
>
  {resendingId === party.id ? (
    <Loader2 className="w-4 h-4 animate-spin" />
  ) : (
    <RefreshCw className="w-4 h-4" />
  )}
  <span className="ml-1">Resend</span>
</Button>
```

## Step 4: Add to party card component (if separate)

```tsx
// If you have a PartyCard or PartyListItem component:

interface PartyCardProps {
  party: Party;
  onResendLink?: (partyId: string) => void;
  isResending?: boolean;
}

export function PartyCard({ party, onResendLink, isResending }: PartyCardProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div>
        <p className="font-medium">{party.display_name}</p>
        <p className="text-sm text-gray-500">{party.email}</p>
        <Badge>{party.status}</Badge>
      </div>
      
      <div className="flex gap-2">
        {party.status !== "submitted" && onResendLink && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onResendLink(party.id)}
            disabled={isResending}
          >
            <RefreshCw className={cn("w-4 h-4 mr-1", isResending && "animate-spin")} />
            Resend Link
          </Button>
        )}
      </div>
    </div>
  );
}
```

## Verify

1. Log in as client_user
2. Go to a report with parties
3. Click "Resend Link" on a party
4. Should see success toast
5. Party should receive new email

---

# SHARK 5: Request Corrections Placeholder (4 hours)

## Problem
Staff can't request corrections from parties who submitted bad data.
```tsx
alert("Request Corrections feature coming soon")
```

## Step 1: Add status and fields to party model

**File:** `api/app/models/report_party.py`

```python
# Add to ReportParty model if not present:
correction_requested_at = Column(DateTime, nullable=True)
correction_message = Column(Text, nullable=True)
correction_requested_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
```

## Step 2: Create migration

```bash
cd api
alembic revision --autogenerate -m "add_correction_fields_to_party"
alembic upgrade head
```

## Step 3: Add backend endpoint

**File:** `api/app/routes/parties.py`

```python
class CorrectionRequest(BaseModel):
    message: str
    fields: Optional[List[str]] = []  # Optional: specific fields to fix

@router.post("/parties/{party_id}/request-corrections")
async def request_corrections(
    party_id: UUID,
    data: CorrectionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Request corrections from a party who already submitted."""
    require_role(current_user, ["pct_staff", "pct_admin"])
    
    party = db.query(ReportParty).filter(ReportParty.id == party_id).first()
    if not party:
        raise HTTPException(404, "Party not found")
    
    if party.status != "submitted":
        raise HTTPException(400, "Can only request corrections for submitted parties")
    
    # Update party
    party.status = "corrections_requested"
    party.correction_requested_at = datetime.utcnow()
    party.correction_message = data.message
    party.correction_requested_by = current_user.id
    
    db.commit()
    
    # Get portal link
    link = db.query(PartyLink).filter(
        PartyLink.party_id == party_id,
        PartyLink.is_active == True
    ).first()
    
    if not link:
        raise HTTPException(400, "No active portal link for this party")
    
    # Send email
    report = party.report
    send_correction_request_email(
        to_email=party.email,
        party_name=party.display_name,
        message=data.message,
        portal_url=f"{settings.FRONTEND_URL}/p/{link.token}",
        property_address=get_property_address(report),
    )
    
    # Log audit
    log_audit(db, report.id, current_user, "corrections_requested", {
        "party_id": str(party_id),
        "message": data.message,
    })
    
    return {"status": "corrections_requested"}
```

## Step 4: Add email template

**File:** `api/app/services/email_service.py`

```python
def send_correction_request_email(
    to_email: str,
    party_name: str,
    message: str,
    portal_url: str,
    property_address: str,
):
    """Send email requesting corrections from a party."""
    
    subject = f"Action Required: Corrections Needed — {property_address}"
    
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Corrections Requested</h2>
        
        <p>Hi {party_name},</p>
        
        <p>The title company has reviewed your submission for the property at 
        <strong>{property_address}</strong> and needs you to make some corrections.</p>
        
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; font-weight: 600;">Requested Changes:</p>
            <p style="margin: 8px 0 0 0;">{message}</p>
        </div>
        
        <p>Please click the button below to access your form and make the necessary corrections:</p>
        
        <a href="{portal_url}" 
           style="display: inline-block; background: #2563eb; color: white; 
                  padding: 12px 24px; text-decoration: none; border-radius: 8px;
                  font-weight: 600; margin: 16px 0;">
            Make Corrections
        </a>
        
        <p style="color: #666; font-size: 14px;">
            If you have questions, please contact the title company directly.
        </p>
    </div>
    """
    
    send_email(to_email, subject, html)
```

## Step 5: Update party portal to show correction banner

**File:** `web/app/p/[token]/page.tsx`

```tsx
// At the top of the form, if corrections requested:

{party.status === "corrections_requested" && (
  <Alert variant="destructive" className="mb-6">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Corrections Requested</AlertTitle>
    <AlertDescription>
      <p className="mt-2">{party.correction_message}</p>
      <p className="mt-2 text-sm">
        Please review and update your information below, then submit again.
      </p>
    </AlertDescription>
  </Alert>
)}
```

## Step 6: Create frontend dialog for staff

**File:** `web/components/RequestCorrectionsDialog.tsx`

```tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  partyId: string;
  partyName: string;
  onSuccess?: () => void;
}

export function RequestCorrectionsDialog({ partyId, partyName, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message describing what needs to be corrected");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/parties/${partyId}/request-corrections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) throw new Error("Failed to request corrections");

      toast.success(`Correction request sent to ${partyName}`);
      setOpen(false);
      setMessage("");
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to send correction request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <AlertTriangle className="w-4 h-4 mr-1" />
          Request Corrections
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Corrections from {partyName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>What needs to be corrected?</Label>
            <Textarea
              placeholder="Please describe what information needs to be corrected or updated..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
          
          <p className="text-sm text-gray-500">
            The party will receive an email with your message and a link to update their submission.
          </p>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Send Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

## Step 7: Replace placeholder in review page

Find the placeholder:
```bash
grep -rn "Request Corrections feature coming soon" web/
```

Replace with:
```tsx
import { RequestCorrectionsDialog } from "@/components/RequestCorrectionsDialog";

// Replace alert() with:
<RequestCorrectionsDialog
  partyId={party.id}
  partyName={party.display_name}
  onSuccess={refreshParties}
/>
```

## Verify

1. Log in as staff
2. Find a report with a submitted party
3. Click "Request Corrections"
4. Enter message, submit
5. Party should receive email
6. Party opens portal link, sees correction banner
7. Party resubmits

---

# SHARK 6: Filing Deadline Reminders (3 hours)

## Problem
No alerts when 30-day filing deadline approaches.

## Step 1: Create reminder script

**File:** `api/app/scripts/check_filing_deadlines.py`

```python
#!/usr/bin/env python3
"""
Check for approaching filing deadlines and send reminders.
Run daily via cron: 0 9 * * * python -m app.scripts.check_filing_deadlines
"""

import sys
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

# Add parent to path for imports
sys.path.insert(0, "/app")

from app.database import SessionLocal
from app.models.report import Report
from app.models.user import User
from app.services.email_service import send_email
from app.services.notifications import log_notification_event
from app.config import settings


REMINDER_DAYS = [7, 3, 1]  # Send reminders at 7, 3, and 1 day before deadline


def get_property_address(report: Report) -> str:
    """Extract property address from wizard_data."""
    try:
        addr = report.wizard_data.get("collection", {}).get("propertyAddress", {})
        return f"{addr.get('street', '')}, {addr.get('city', '')} {addr.get('state', '')}"
    except:
        return "Unknown Property"


def send_deadline_reminder(
    report: Report,
    days_until: int,
    recipient_email: str,
    recipient_name: str,
):
    """Send deadline reminder email."""
    property_address = get_property_address(report)
    deadline_date = report.filing_deadline.strftime("%B %d, %Y") if report.filing_deadline else "Unknown"
    
    urgency = "⚠️" if days_until <= 3 else "📅"
    
    subject = f"{urgency} Filing Deadline in {days_until} day{'s' if days_until != 1 else ''} — {property_address}"
    
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: {'#dc2626' if days_until <= 3 else '#f59e0b'};">
            Filing Deadline Approaching
        </h2>
        
        <p>Hi {recipient_name},</p>
        
        <p>Your FinCEN Real Estate Report for <strong>{property_address}</strong> 
           is due in <strong>{days_until} day{'s' if days_until != 1 else ''}</strong>.</p>
        
        <div style="background: {'#fef2f2' if days_until <= 3 else '#fffbeb'}; 
                    border-left: 4px solid {'#dc2626' if days_until <= 3 else '#f59e0b'}; 
                    padding: 16px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Filing Deadline:</strong> {deadline_date}</p>
            <p style="margin: 8px 0 0 0;"><strong>Current Status:</strong> {report.status}</p>
        </div>
        
        <a href="{settings.FRONTEND_URL}/app/reports/{report.id}/wizard" 
           style="display: inline-block; background: #2563eb; color: white; 
                  padding: 12px 24px; text-decoration: none; border-radius: 8px;
                  font-weight: 600; margin: 16px 0;">
            Complete Filing Now
        </a>
        
        <p style="color: #666; font-size: 14px;">
            FinCEN requires reports to be filed within 30 days of closing. 
            Late filings may result in penalties.
        </p>
    </div>
    """
    
    send_email(recipient_email, subject, html)


def check_deadlines(db: Session):
    """Check all reports for approaching deadlines."""
    today = datetime.utcnow().date()
    reminders_sent = 0
    
    for days in REMINDER_DAYS:
        target_date = today + timedelta(days=days)
        
        # Find reports with deadline on target date that aren't filed
        reports = db.query(Report).filter(
            Report.status.in_(["collecting", "ready_to_file", "determination_complete"]),
            Report.filing_deadline == target_date,
        ).all()
        
        for report in reports:
            # Check if we already sent this reminder
            reminder_key = f"deadline_reminder_{days}d"
            existing = db.execute(
                "SELECT 1 FROM notification_events WHERE report_id = :rid AND event_type = :etype AND DATE(created_at) = :today",
                {"rid": str(report.id), "etype": reminder_key, "today": today}
            ).first()
            
            if existing:
                continue  # Already sent today
            
            # Get recipient (report initiator or company admin)
            recipient = None
            if report.initiated_by_user_id:
                recipient = db.query(User).filter(User.id == report.initiated_by_user_id).first()
            
            if not recipient and report.company_id:
                # Get company admin
                recipient = db.query(User).filter(
                    User.company_id == report.company_id,
                    User.role == "client_admin"
                ).first()
            
            if not recipient:
                print(f"No recipient found for report {report.id}")
                continue
            
            # Send reminder
            try:
                send_deadline_reminder(
                    report=report,
                    days_until=days,
                    recipient_email=recipient.email,
                    recipient_name=recipient.name,
                )
                
                # Log the notification
                log_notification_event(db, report.id, reminder_key, {
                    "days_until_deadline": days,
                    "recipient_email": recipient.email,
                })
                
                reminders_sent += 1
                print(f"Sent {days}-day reminder for report {report.id} to {recipient.email}")
                
            except Exception as e:
                print(f"Failed to send reminder for report {report.id}: {e}")
    
    return reminders_sent


def main():
    print(f"Checking filing deadlines at {datetime.utcnow().isoformat()}")
    
    db = SessionLocal()
    try:
        count = check_deadlines(db)
        print(f"Sent {count} deadline reminders")
    finally:
        db.close()


if __name__ == "__main__":
    main()
```

## Step 2: Add Render cron job

In Render dashboard, add a cron job:
- **Name:** Filing Deadline Reminders
- **Schedule:** `0 9 * * *` (9 AM daily)
- **Command:** `python -m app.scripts.check_filing_deadlines`

Or add to `render.yaml`:
```yaml
services:
  - type: cron
    name: filing-deadline-reminders
    schedule: "0 9 * * *"
    buildCommand: pip install -r requirements.txt
    startCommand: python -m app.scripts.check_filing_deadlines
```

## Step 3: Ensure filing_deadline is set on reports

**File:** `api/app/routes/reports.py`

When report is created or closing date is set:

```python
from datetime import timedelta

# When closing date is saved:
if wizard_data.get("collection", {}).get("closingDate"):
    closing_date = datetime.strptime(
        wizard_data["collection"]["closingDate"], 
        "%Y-%m-%d"
    ).date()
    report.filing_deadline = closing_date + timedelta(days=30)
```

## Verify

1. Create a report with closing date 3 days from now
2. Run script manually: `python -m app.scripts.check_filing_deadlines`
3. Should receive reminder email
4. Check notification_events table for logged event

---

# SHARK 7: Admin Requests Placeholder Data (1 hour)

## Problem
```tsx
companyName: "Client Company", // Placeholder
avgProcessingHours: 4.2, // TODO: Calculate from actual data
```

## Step 1: Find the placeholder

```bash
grep -rn "Client Company\|avgProcessingHours\|TODO.*Calculate" web/app/\(app\)/app/admin/
```

## Step 2: Create/update stats endpoint

**File:** `api/app/routes/admin.py`

```python
from sqlalchemy import func, extract

@router.get("/admin/requests/stats")
async def get_request_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get statistics for admin requests page."""
    require_role(current_user, ["pct_staff", "pct_admin", "coo"])
    
    # Average processing time (creation to filing, in hours)
    avg_processing = db.query(
        func.avg(
            extract('epoch', Report.filed_at - Report.created_at) / 3600
        )
    ).filter(
        Report.filed_at.isnot(None)
    ).scalar()
    
    # Requests by status
    status_counts = dict(
        db.query(
            SubmissionRequest.status,
            func.count(SubmissionRequest.id)
        ).group_by(SubmissionRequest.status).all()
    )
    
    # Requests by company
    company_counts = db.query(
        Company.name,
        func.count(SubmissionRequest.id)
    ).join(
        SubmissionRequest, SubmissionRequest.company_id == Company.id
    ).group_by(Company.name).order_by(func.count(SubmissionRequest.id).desc()).limit(10).all()
    
    # Recent activity
    recent_count = db.query(func.count(SubmissionRequest.id)).filter(
        SubmissionRequest.created_at >= datetime.utcnow() - timedelta(days=7)
    ).scalar()
    
    return {
        "avg_processing_hours": round(avg_processing or 0, 1),
        "status_counts": status_counts,
        "top_companies": [{"name": c[0], "count": c[1]} for c in company_counts],
        "requests_last_7_days": recent_count or 0,
        "total_requests": db.query(func.count(SubmissionRequest.id)).scalar(),
    }
```

## Step 3: Update frontend to use real data

**File:** `web/app/(app)/app/admin/requests/page.tsx`

```tsx
// Add data fetching
const [stats, setStats] = useState<{
  avg_processing_hours: number;
  status_counts: Record<string, number>;
  top_companies: { name: string; count: number }[];
  requests_last_7_days: number;
  total_requests: number;
} | null>(null);

useEffect(() => {
  fetch("/api/admin/requests/stats")
    .then(res => res.json())
    .then(setStats)
    .catch(console.error);
}, []);

// Use in UI
<Stat 
  label="Avg. Processing Time" 
  value={stats ? `${stats.avg_processing_hours} hrs` : "Loading..."} 
/>

<Stat 
  label="Requests (7 days)" 
  value={stats?.requests_last_7_days ?? "—"} 
/>
```

## Verify

1. Log in as admin
2. Go to admin requests page
3. Stats should show real numbers, not placeholders

---

# Summary Checklist

| Shark | Priority | Effort | Status |
|-------|----------|--------|--------|
| SOC 2 Claim | P0 | 5 min | ⬜ |
| Exempt Not Persisted | P1 | 2 hrs | ⬜ |
| Party Portal Autosave | P1 | 1 hr | ⬜ |
| Client Resend Links | P1 | 30 min | ⬜ |
| Request Corrections | P2 | 4 hrs | ⬜ |
| Deadline Reminders | P2 | 3 hrs | ⬜ |
| Admin Placeholder Data | P2 | 1 hr | ⬜ |

**Total: ~11.5 hours**

Execute in order. Check off as you complete each one.
