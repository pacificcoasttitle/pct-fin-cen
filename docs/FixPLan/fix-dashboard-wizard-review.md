# Fix Instructions — Based on Diagnostic Output

## Fix 1: Dashboard Stat Cards — Icons + Left Border Accent

### File: `web/app/(app)/app/dashboard/page.tsx`

Find the 4 stat cards (Active, Awaiting Parties, Filed, Exempt). Each card needs:
- A left border accent using the card's color
- An icon from lucide-react
- Remove any hardcoded teal/cyan colors, use theme-consistent colors

Replace each card with this pattern:

```tsx
// Card 1: Active
<Card className="border-l-4 border-l-blue-500">
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
    <Clock className="h-5 w-5 text-blue-500" />
  </CardHeader>
  <CardContent>
    <p className="text-3xl font-bold">{stats.pending + stats.in_progress}</p>
    <p className="text-xs text-muted-foreground mt-1">Pending review</p>
  </CardContent>
</Card>

// Card 2: Awaiting Parties
<Card className="border-l-4 border-l-amber-500">
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">Awaiting Parties</CardTitle>
    <Users className="h-5 w-5 text-amber-500" />
  </CardHeader>
  <CardContent>
    <p className="text-3xl font-bold">{stats.in_progress}</p>
    <p className="text-xs text-muted-foreground mt-1">Collecting party data</p>
  </CardContent>
</Card>

// Card 3: Filed
<Card className="border-l-4 border-l-green-500">
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">Filed</CardTitle>
    <CheckCircle2 className="h-5 w-5 text-green-500" />
  </CardHeader>
  <CardContent>
    <p className="text-3xl font-bold">{stats.completed}</p>
    <p className="text-xs text-muted-foreground mt-1">Submitted to FinCEN</p>
  </CardContent>
</Card>

// Card 4: Exempt
<Card className="border-l-4 border-l-purple-500">
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">Exempt</CardTitle>
    <Shield className="h-5 w-5 text-purple-500" />
  </CardHeader>
  <CardContent>
    <p className="text-3xl font-bold">{stats.exempt}</p>
    <p className="text-xs text-muted-foreground mt-1">No filing required</p>
  </CardContent>
</Card>
```

Add imports: `import { Clock, Users, CheckCircle2, Shield } from "lucide-react";`

---

## Fix 2: New Request Button — Solid Primary, No Gradient, Larger

### Files: `web/app/(app)/app/dashboard/page.tsx` AND `web/app/(app)/app/requests/page.tsx`

Find EVERY instance of:
```tsx
className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
```

Replace with:
```tsx
size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
```

This gives us: solid primary color, larger button, no gradient, theme-consistent.

Also find any other `teal-500`, `teal-600`, `cyan-600` references in these two files and replace:
- `text-teal-600` → `text-primary`
- `hover:text-teal-700` → `hover:text-primary/80`

---

## Fix 3: Requests Table — Sortable Columns

### File: `web/app/(app)/app/requests/page.tsx`

Add sort state at the top of the component:

```tsx
const [sortField, setSortField] = useState<string>("created_at");
const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
```

Add a sort handler:

```tsx
const handleSort = (field: string) => {
  if (sortField === field) {
    setSortDirection(prev => prev === "asc" ? "desc" : "asc");
  } else {
    setSortField(field);
    setSortDirection("asc");
  }
};
```

Add a sort function for the displayed data:

```tsx
const sortedRequests = useMemo(() => {
  if (!filteredRequests) return [];
  return [...filteredRequests].sort((a, b) => {
    let aVal: any, bVal: any;
    
    switch (sortField) {
      case "address":
        aVal = a.property_address || a.wizard_data?.collection?.propertyAddress?.street || "";
        bVal = b.property_address || b.wizard_data?.collection?.propertyAddress?.street || "";
        break;
      case "status":
        aVal = a.status || "";
        bVal = b.status || "";
        break;
      case "created_at":
        aVal = a.created_at || "";
        bVal = b.created_at || "";
        break;
      case "filing_status":
        aVal = a.filing_status || "";
        bVal = b.filing_status || "";
        break;
      default:
        aVal = a[sortField] || "";
        bVal = b[sortField] || "";
    }
    
    if (typeof aVal === "string") {
      const cmp = aVal.localeCompare(bVal);
      return sortDirection === "asc" ? cmp : -cmp;
    }
    return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
  });
}, [filteredRequests, sortField, sortDirection]);
```

Make sure to import `useMemo` from React.

Then use `sortedRequests` in the table body instead of `filteredRequests`.

Make each table header clickable:

```tsx
// Helper component for sortable headers
const SortHeader = ({ field, label }: { field: string; label: string }) => (
  <th
    className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground select-none"
    onClick={() => handleSort(field)}
  >
    <div className="flex items-center gap-1">
      {label}
      {sortField === field ? (
        sortDirection === "asc" ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-30" />
      )}
    </div>
  </th>
);
```

Add imports: `import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";`

Replace each `<th>` in the table header with `<SortHeader>`:

```tsx
<thead>
  <tr className="border-b">
    <SortHeader field="address" label="Property" />
    <SortHeader field="status" label="Status" />
    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Parties</th>
    <SortHeader field="filing_status" label="Filing" />
    <SortHeader field="created_at" label="Created" />
    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
  </tr>
</thead>
```

(Parties and Actions columns don't need sorting.)

---

## Fix 4: UI Component Sizes — Textarea, Radio, Checkbox

### File: `web/components/ui/textarea.tsx`

Find `rounded-md` and replace with `rounded-xl` to match Input and Select.

### File: `web/components/ui/radio-group.tsx`

Find `size-4` on the RadioGroupItem and replace with `size-5`.

### File: `web/components/ui/checkbox.tsx`

Find `size-4` on the Checkbox and replace with `size-5`.

These are global changes — they'll apply everywhere including the wizard.

---

## Fix 5: Ready-to-File Navigation — Go to Review, Not Wizard (CRITICAL)

### File: `web/app/(app)/app/requests/page.tsx`

Find where clicking a `ready_to_file` report navigates (around line 235). It currently goes to:
```tsx
router.push(`/app/reports/${id}/wizard?step=file-report`)
```

Change it to:
```tsx
router.push(`/app/reports/${id}/review`)
```

### File: `web/app/(app)/app/dashboard/page.tsx`

Find where recent activity items are clicked (around line 236). If `ready_to_file` reports go to `/wizard`, change those to `/review` as well. Add logic:

```tsx
onClick={() => {
  if (report.status === "ready_to_file") {
    router.push(`/app/reports/${report.id}/review`);
  } else if (report.status === "exempt") {
    router.push(`/app/reports/${report.id}/certificate`);
  } else {
    router.push(`/app/reports/${report.id}/wizard`);
  }
}}
```

---

## Fix 6: Review Page — Fix "Proceed to File" + fetchData Bug (CRITICAL)

### File: `web/app/(app)/app/reports/[id]/review/page.tsx`

**Bug A (line ~834):** "Proceed to File" navigates to wizard instead of submitting the filing.

Find the "Proceed to File" button and its onClick handler. Replace the navigation with an actual filing call:

```tsx
const handleSubmitFiling = async () => {
  setIsSubmitting(true);
  try {
    const result = await fileReport(reportId);
    
    if (result.ok) {
      // Filing submitted successfully
      router.push(`/app/requests`);
      // Or show success state on this page
    } else {
      setError(result.message || "Filing submission failed");
    }
  } catch (err: any) {
    setError(err.message || "Failed to submit filing");
  } finally {
    setIsSubmitting(false);
  }
};
```

Make sure `fileReport` is imported from `@/lib/api`. Check if it exists:

```bash
grep -n "fileReport\|file_report\|\/file" web/lib/api.ts | head -10
```

If it doesn't exist, create it:

```typescript
export async function fileReport(reportId: string): Promise<{ ok: boolean; status: string; receipt_id?: string; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/reports/${reportId}/file`, {
    method: "POST",
    headers: getHeaders(),
  });
  return response.json();
}
```

**Bug B (line ~824):** `fetchData()` is undefined — should be whatever the refresh function is called.

Find `onSuccess={() => fetchData()}` and replace with the correct function name. Look at the component — there should be a function that reloads the report/parties data. It's likely called `handleRefresh` or `loadData` or similar. Find it:

```bash
grep -n "function.*fetch\|function.*load\|function.*refresh\|const.*fetch\|const.*load\|const.*refresh" web/app/\(app\)/app/reports/\[id\]/review/page.tsx | head -10
```

Replace `fetchData()` with the actual function name.

---

## Fix 7: Review Page — Add Signature Field + Enhanced Certifications

### File: `web/app/(app)/app/reports/[id]/review/page.tsx`

The review page already has a certification checkbox. Enhance it:

**Add two more certification checkboxes:**

```tsx
const [certifications, setCertifications] = useState({
  reviewed: false,
  understand: false,
  authorized: false,
});
const [signatureName, setSignatureName] = useState("");
```

Render them:

```tsx
<div className="space-y-4 border rounded-lg p-6 bg-muted/30">
  <h3 className="font-semibold text-base">Certification & Signature</h3>
  
  <div className="space-y-3">
    <label className="flex items-start gap-3 cursor-pointer">
      <Checkbox
        checked={certifications.reviewed}
        onCheckedChange={(c) => setCertifications(prev => ({ ...prev, reviewed: !!c }))}
      />
      <span className="text-sm leading-tight">
        I certify that I have reviewed all information in this report and it is accurate to the best of my knowledge.
      </span>
    </label>
    
    <label className="flex items-start gap-3 cursor-pointer">
      <Checkbox
        checked={certifications.understand}
        onCheckedChange={(c) => setCertifications(prev => ({ ...prev, understand: !!c }))}
      />
      <span className="text-sm leading-tight">
        I understand this filing will be submitted to FinCEN and cannot be altered after submission.
      </span>
    </label>
    
    <label className="flex items-start gap-3 cursor-pointer">
      <Checkbox
        checked={certifications.authorized}
        onCheckedChange={(c) => setCertifications(prev => ({ ...prev, authorized: !!c }))}
      />
      <span className="text-sm leading-tight">
        I am authorized to submit this filing on behalf of my organization.
      </span>
    </label>
  </div>
  
  {/* Signature Field */}
  <div className="pt-4 border-t space-y-2">
    <Label htmlFor="signature" className="text-sm font-medium">
      Electronic Signature — Type Your Full Name
    </Label>
    <Input
      id="signature"
      value={signatureName}
      onChange={(e) => setSignatureName(e.target.value)}
      placeholder="e.g., Jennifer Walsh"
      className="font-serif text-lg italic"
    />
    {signatureName && (
      <p className="text-xs text-muted-foreground">
        Signed electronically on {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>
    )}
  </div>
</div>
```

**Submit button — enabled only when all certifications checked AND signature filled:**

```tsx
const canSubmit = certifications.reviewed && certifications.understand && certifications.authorized && signatureName.trim().length > 0;

<Button
  size="lg"
  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
  disabled={!canSubmit || isSubmitting}
  onClick={handleSubmitFiling}
>
  {isSubmitting ? (
    <>
      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      Submitting to FinCEN...
    </>
  ) : (
    <>
      <Send className="h-4 w-4 mr-2" />
      Submit Filing to FinCEN
    </>
  )}
</Button>
```

Add imports: `import { Send, Loader2 } from "lucide-react";`

The existing single certification checkbox can be removed or replaced by the three above.

---

## Summary — Order of Operations

| Priority | Fix | Files |
|----------|-----|-------|
| 1 | Review page bugs (#6) — fetchData + Proceed to File | `review/page.tsx` |
| 2 | Review page enhancements (#7) — certifications + signature | `review/page.tsx` |
| 3 | Ready-to-file navigation (#5) | `requests/page.tsx`, `dashboard/page.tsx` |
| 4 | Dashboard cards (#1) | `dashboard/page.tsx` |
| 5 | New Request button (#2) | `dashboard/page.tsx`, `requests/page.tsx` |
| 6 | Sortable columns (#3) | `requests/page.tsx` |
| 7 | UI component sizes (#4) | `textarea.tsx`, `radio-group.tsx`, `checkbox.tsx` |

## DO NOT

- ❌ Change the filing endpoint logic in `reports.py`
- ❌ Change the `perform_ready_check` function
- ❌ Change status transitions or filing lifecycle
- ❌ Remove existing certification_data JSONB functionality
- ❌ Change the wizard determination flow
- ❌ Break mobile responsiveness
- ❌ Remove the tab navigation on the requests page
