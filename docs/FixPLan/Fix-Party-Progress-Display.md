# 🔧 Fix Missing Party Progress in Requests Table

## Problem

The "Active" tab in `/app/requests` shows requests that are collecting info / awaiting parties, but it does NOT show how many parties have submitted (e.g., "2/3 parties").

This is critical for escrow officers to know at a glance which requests need follow-up.

---

## What to Fix

### Step 1: Check the API Response

First, verify the API is returning party counts:

```bash
# Check if the requests endpoint returns party data
grep -n "parties_submitted\|parties_total" api/app/routes/requests.py
```

If missing, add to the API response:

```python
# In the list_requests endpoint, for each report:
parties = db.query(ReportParty).filter(ReportParty.report_id == report.id).all()
parties_total = len(parties)
parties_submitted = len([p for p in parties if p.status == "submitted"])

# Include in response:
{
    "id": str(report.id),
    "property_address": "...",
    # ... other fields ...
    "parties_submitted": parties_submitted,
    "parties_total": parties_total,
}
```

---

### Step 2: Update the Request Interface

In `web/app/(app)/app/requests/page.tsx`, ensure the interface includes:

```typescript
interface Request {
  id: string;
  property_address: string;
  escrow_number: string;
  status: string;
  // ... other fields ...
  
  // Party progress - ADD THESE IF MISSING
  parties_submitted: number;
  parties_total: number;
}
```

---

### Step 3: Add Party Progress Column to Active Tab

Find where the table is rendered for the "Active" tab and add a Parties column:

```tsx
// In the table header
<TableHead>Parties</TableHead>

// In the table row
<TableCell>
  {request.parties_total > 0 ? (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <Users className="w-4 h-4 text-gray-400" />
        <span className={cn(
          "font-medium",
          request.parties_submitted === request.parties_total 
            ? "text-green-600" 
            : "text-amber-600"
        )}>
          {request.parties_submitted}/{request.parties_total}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full",
            request.parties_submitted === request.parties_total 
              ? "bg-green-500" 
              : "bg-amber-500"
          )}
          style={{ 
            width: `${(request.parties_submitted / request.parties_total) * 100}%` 
          }}
        />
      </div>
      
      {/* Checkmark if complete */}
      {request.parties_submitted === request.parties_total && (
        <CheckCircle className="w-4 h-4 text-green-500" />
      )}
    </div>
  ) : (
    <span className="text-gray-400">—</span>
  )}
</TableCell>
```

---

### Step 4: Show Party Progress on Other Tabs Too

The "Ready to File" tab should show all parties complete:

```tsx
// For Ready to File tab, show confirmation
<TableCell>
  <div className="flex items-center gap-2 text-green-600">
    <CheckCircle className="w-4 h-4" />
    <span>{request.parties_total} of {request.parties_total}</span>
  </div>
</TableCell>
```

---

### Step 5: Import Required Icons

Make sure these are imported:

```typescript
import { Users, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
```

---

## Visual Result

After fix, the Active tab should look like:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Property          │ Escrow #  │ Parties      │ Updated    │ Action │
├───────────────────┼───────────┼──────────────┼────────────┼────────┤
│ 123 Main St       │ ESC-001   │ 👥 2/3 ▓▓░   │ 2 hrs ago  │ Track  │
│ 456 Oak Ave       │ ESC-002   │ 👥 1/2 ▓░░   │ 1 day ago  │ Track  │
│ 789 Pine Rd       │ ESC-003   │ 👥 3/3 ✓     │ 3 hrs ago  │ Review │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Verification

After implementing:

1. Go to `/app/requests` 
2. Click "Active" tab
3. Should see party counts (e.g., "2/3") with progress bar
4. Requests with all parties submitted should show green checkmark
