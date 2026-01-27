# CURSOR PROMPT: P0 - Create Submission Request API & Wire Frontend

## OBJECTIVE
The SubmissionRequest MODEL exists but has NO API ROUTES.
The client form and admin queue exist but use MOCK DATA.

Create the API routes and wire up the frontend to use real data.

---

## PART 1: Create Submission Request API Routes

### File to Create: `api/app/routes/submission_requests.py`

The model already exists at `api/app/models/submission_request.py` with these fields:
- id (UUID)
- company_id (FK)
- requested_by_user_id (FK)
- status (pending, processing, completed, cancelled)
- property_address (JSONB)
- purchase_price_cents (Integer)
- expected_closing_date (Date)
- escrow_number (String)
- financing_type (String)
- buyer_name, buyer_email, buyer_type
- seller_name, seller_email
- notes (Text)
- created_at, updated_at

### Endpoints to Implement:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from pydantic import BaseModel, EmailStr
from uuid import UUID

from app.database import get_db
from app.models.submission_request import SubmissionRequest

router = APIRouter(prefix="/submission-requests", tags=["submission-requests"])


# Schemas
class PropertyAddress(BaseModel):
    street: str
    city: str
    state: str
    zip: str
    county: Optional[str] = None

class SubmissionRequestCreate(BaseModel):
    property_address: PropertyAddress
    purchase_price_cents: int  # Store in cents to avoid float issues
    expected_closing_date: date
    escrow_number: Optional[str] = None
    financing_type: str  # "cash", "financed", "unknown"
    buyer_name: str
    buyer_email: EmailStr
    buyer_type: str  # "individual", "entity", "trust"
    seller_name: str
    seller_email: Optional[EmailStr] = None
    seller_type: Optional[str] = "individual"
    notes: Optional[str] = None

class SubmissionRequestResponse(BaseModel):
    id: str
    status: str
    property_address: dict
    purchase_price_cents: int
    expected_closing_date: date
    escrow_number: Optional[str]
    financing_type: str
    buyer_name: str
    buyer_email: str
    buyer_type: str
    seller_name: str
    seller_email: Optional[str]
    seller_type: Optional[str]
    notes: Optional[str]
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


# Endpoints

@router.post("", response_model=SubmissionRequestResponse)
def create_submission_request(
    data: SubmissionRequestCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new submission request from a title company client.
    This creates the initial request that PCT staff will process.
    """
    submission = SubmissionRequest(
        # For demo, hardcode company_id and user_id
        # In production, get from auth context
        company_id=None,  # Will be set from auth
        requested_by_user_id=None,  # Will be set from auth
        status="pending",
        property_address=data.property_address.model_dump(),
        purchase_price_cents=data.purchase_price_cents,
        expected_closing_date=data.expected_closing_date,
        escrow_number=data.escrow_number,
        financing_type=data.financing_type,
        buyer_name=data.buyer_name,
        buyer_email=data.buyer_email,
        buyer_type=data.buyer_type,
        seller_name=data.seller_name,
        seller_email=data.seller_email,
        notes=data.notes,
    )
    
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    return submission


@router.get("", response_model=List[SubmissionRequestResponse])
def list_submission_requests(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List submission requests.
    For admin/staff: returns all requests
    For client: returns only their company's requests (in production)
    """
    query = db.query(SubmissionRequest)
    
    if status:
        query = query.filter(SubmissionRequest.status == status)
    
    # Order by most recent first
    query = query.order_by(SubmissionRequest.created_at.desc())
    
    return query.all()


@router.get("/{request_id}", response_model=SubmissionRequestResponse)
def get_submission_request(
    request_id: str,
    db: Session = Depends(get_db)
):
    """Get a single submission request by ID."""
    submission = db.query(SubmissionRequest).filter(
        SubmissionRequest.id == request_id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission request not found")
    
    return submission


@router.patch("/{request_id}/status")
def update_submission_status(
    request_id: str,
    status: str,
    db: Session = Depends(get_db)
):
    """Update submission request status (for staff processing)."""
    submission = db.query(SubmissionRequest).filter(
        SubmissionRequest.id == request_id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission request not found")
    
    valid_statuses = ["pending", "processing", "completed", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    submission.status = status
    db.commit()
    
    return {"status": "updated", "new_status": status}


@router.post("/{request_id}/create-report")
def create_report_from_submission(
    request_id: str,
    db: Session = Depends(get_db)
):
    """
    Create a Report from a SubmissionRequest.
    This is called when staff clicks "Start Wizard" on a pending request.
    The report inherits key fields from the submission.
    """
    from app.models.report import Report
    from datetime import timedelta
    
    submission = db.query(SubmissionRequest).filter(
        SubmissionRequest.id == request_id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission request not found")
    
    if submission.status != "pending":
        raise HTTPException(status_code=400, detail="Can only create report from pending submissions")
    
    # Build property address text from JSONB
    addr = submission.property_address or {}
    property_address_text = f"{addr.get('street', '')}, {addr.get('city', '')}, {addr.get('state', '')} {addr.get('zip', '')}"
    
    # Calculate filing deadline (30 days from closing)
    filing_deadline = None
    if submission.expected_closing_date:
        filing_deadline = submission.expected_closing_date + timedelta(days=30)
    
    # Create report with pre-filled data
    report = Report(
        submission_request_id=submission.id,
        property_address_text=property_address_text.strip(),
        closing_date=submission.expected_closing_date,
        filing_deadline=filing_deadline,
        status="draft",
        wizard_step=1,
        wizard_data={
            # Pre-fill wizard collection data from submission
            "collection": {
                "purchasePrice": submission.purchase_price_cents / 100 if submission.purchase_price_cents else None,
                "escrowNumber": submission.escrow_number,
                "financingType": submission.financing_type,
                # Store initial party info for party-setup step
                "initialParties": {
                    "buyers": [{
                        "name": submission.buyer_name,
                        "email": submission.buyer_email,
                        "type": submission.buyer_type,
                    }],
                    "sellers": [{
                        "name": submission.seller_name,
                        "email": submission.seller_email,
                        "type": "individual",  # Default, can be changed
                    }]
                }
            }
        }
    )
    
    db.add(report)
    
    # Update submission status
    submission.status = "processing"
    
    db.commit()
    db.refresh(report)
    
    return {
        "report_id": str(report.id),
        "message": "Report created from submission",
        "redirect_url": f"/app/reports/{report.id}/wizard"
    }
```

### Register Router in Main App

**File:** `api/app/main.py`

Add to imports:
```python
from app.routes.submission_requests import router as submission_requests_router
```

Add to router registration:
```python
app.include_router(submission_requests_router)
```

---

## PART 2: Wire Client Form to Real API

### File: `web/app/(app)/app/requests/new/page.tsx`

Find the handleSubmit function and replace the mock implementation:

**FIND (around line 55-66):**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);

  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Generate mock request ID
  const mockId = `REQ-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  setRequestId(mockId);
  setIsSuccess(true);
  setIsSubmitting(false);
};
```

**REPLACE WITH:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  setError(null);

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/submission-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        property_address: {
          street: formData.propertyAddress,
          city: formData.propertyCity,
          state: formData.propertyState,
          zip: formData.propertyZip,
          county: formData.propertyCounty || null,
        },
        purchase_price_cents: Math.round(parseFloat(formData.purchasePrice) * 100),
        expected_closing_date: formData.closingDate,
        escrow_number: formData.escrowNumber || null,
        financing_type: formData.financingType,
        buyer_name: formData.buyerName,
        buyer_email: formData.buyerEmail,
        buyer_type: formData.buyerType,
        seller_name: formData.sellerName,
        seller_email: formData.sellerEmail || null,
        notes: formData.notes || null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to submit request');
    }

    const result = await response.json();
    setRequestId(result.id);
    setIsSuccess(true);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An error occurred');
  } finally {
    setIsSubmitting(false);
  }
};
```

**Also add error state if not present:**
```typescript
const [error, setError] = useState<string | null>(null);
```

**And display error in the form:**
```tsx
{error && (
  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
    {error}
  </div>
)}
```

---

## PART 3: Wire Admin Queue to Real API

### File: `web/app/(app)/app/admin/requests/page.tsx`

**FIND (around line 47-71) - the mock data array:**
```typescript
// Mock submission requests data (25 requests)
const mockSubmissionRequests: SubmissionRequest[] = [
  {
    id: "req-001",
    companyName: "Golden State Escrow",
    // ... lots of hardcoded data
  },
  // ... 24 more entries
];
```

**REPLACE WITH real API fetching:**
```typescript
import { useState, useEffect } from 'react';

// Remove the mockSubmissionRequests array entirely

// Inside the component:
const [requests, setRequests] = useState<SubmissionRequest[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  async function fetchRequests() {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/submission-requests`);
      if (!response.ok) throw new Error('Failed to fetch requests');
      const data = await response.json();
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }
  
  fetchRequests();
  
  // Refresh every 30 seconds
  const interval = setInterval(fetchRequests, 30000);
  return () => clearInterval(interval);
}, []);
```

**Update the table to use `requests` instead of `mockSubmissionRequests`:**
```typescript
// Change references from mockSubmissionRequests to requests
{requests.map((request) => (
  // ... table row
))}
```

**Add loading state:**
```tsx
{loading && (
  <div className="flex justify-center py-12">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
)}
```

**Add empty state:**
```tsx
{!loading && requests.length === 0 && (
  <div className="text-center py-12 text-muted-foreground">
    No submission requests yet.
  </div>
)}
```

### Add "Start Wizard" Button Handler

For each request row, the "Start Wizard" button should call the create-report endpoint:

```typescript
const handleStartWizard = async (requestId: string) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/submission-requests/${requestId}/create-report`,
      { method: 'POST' }
    );
    
    if (!response.ok) throw new Error('Failed to create report');
    
    const result = await response.json();
    
    // Navigate to the wizard
    router.push(result.redirect_url);
  } catch (err) {
    toast({
      title: "Error",
      description: "Failed to start wizard. Please try again.",
      variant: "destructive"
    });
  }
};
```

---

## PART 4: Update SubmissionRequest Interface (Frontend)

### File: `web/lib/types.ts` or wherever types are defined

Make sure the frontend SubmissionRequest type matches the API response:

```typescript
interface SubmissionRequest {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  property_address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    county?: string;
  };
  purchase_price_cents: number;
  expected_closing_date: string;
  escrow_number?: string;
  financing_type: string;
  buyer_name: string;
  buyer_email: string;
  buyer_type: 'individual' | 'entity' | 'trust';
  seller_name: string;
  seller_email?: string;
  seller_type?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}
```

---

## TESTING CHECKLIST

After implementation:

1. [ ] API starts without errors
2. [ ] `POST /submission-requests` creates a record in database
3. [ ] `GET /submission-requests` returns the list
4. [ ] `GET /submission-requests/{id}` returns single record
5. [ ] Client form submits successfully and shows real ID
6. [ ] Admin queue loads real data from API
7. [ ] "Start Wizard" creates report and navigates to wizard
8. [ ] Report has pre-filled data from submission
9. [ ] Submission status updates to "processing" after wizard started

---

## MIGRATION (if needed)

If the submission_request table doesn't exist in the database:

```bash
cd api
alembic revision --autogenerate -m "add_submission_request_table"
alembic upgrade head
```
