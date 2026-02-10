# Admin Pages

> Staff/admin pages for operations management.

## Overview

| Page | Path | Lines | Purpose |
|------|------|-------|---------|
| Overview | `/app/admin/overview` | 352 | Dashboard stats |
| Reports | `/app/admin/reports` | 336 | All reports |
| Report Detail | `/app/admin/reports/[id]` | 525 | Full report view |
| Filings | `/app/admin/filings` | 324 | Filing management |
| Notifications | `/app/admin/notifications` | 422 | Email outbox |
| Users | `/app/admin/users` | 271 | User management |

---

## Admin Overview

**File:** `web/app/(app)/app/admin/overview/page.tsx` (352 lines)

### Features

- **Stats Cards**: Total reports, filings by status
- **Filing Queue**: Reports needing attention
- **Activity Feed**: Recent audit log entries

### Data Sources

```typescript
// Fetch all data in parallel
const [stats, filings, activity] = await Promise.all([
  getAdminStats(),
  getAdminFilings({ limit: 5 }),
  getAdminActivity(10)
])
```

### Stats Display

| Stat | Source |
|------|--------|
| Total Reports | `stats.total_reports` |
| Awaiting | `stats.reports_by_status.awaiting_parties` |
| Ready to File | `stats.reports_by_status.ready_to_file` |
| Filed | `stats.reports_by_status.filed` |
| Pending Filings | `stats.filings_by_status.queued` |
| Rejected | `stats.filings_by_status.rejected` |

### Activity Feed

```tsx
{activity.map(entry => (
  <div key={entry.id}>
    <span>{entry.action}</span>
    <span>{entry.created_at}</span>
  </div>
))}
```

---

## Admin Reports

**File:** `web/app/(app)/app/admin/reports/page.tsx` (336 lines)

### Features

- Full report listing for all users
- Filing status column
- Party completion status
- Quick actions (view, retry filing)

### Table Columns

| Column | Description |
|--------|-------------|
| Property | Address text |
| Status | Report status badge |
| Filing | Filing status (if applicable) |
| Parties | X/Y submitted |
| Closing | Closing date |
| Updated | Last update |
| Actions | View, actions dropdown |

### Filters

- Status filter (all, draft, filed, etc.)
- Filing status filter
- Date range (planned)

### Row Actions

```tsx
<DropdownMenu>
  <DropdownMenuItem onClick={() => viewReport(id)}>
    View Details
  </DropdownMenuItem>
  {canRetry && (
    <DropdownMenuItem onClick={() => retryFiling(id)}>
      Retry Filing
    </DropdownMenuItem>
  )}
</DropdownMenu>
```

---

## Admin Report Detail

**File:** `web/app/(app)/app/admin/reports/[id]/page.tsx` (525 lines)

### Features

- Complete report information
- Party details with submission status
- Filing submission history
- Audit log timeline

### Sections

```tsx
<Tabs>
  <Tab label="Overview">
    <PropertyInfo />
    <DeterminationResult />
  </Tab>
  <Tab label="Parties">
    <PartyList />
  </Tab>
  <Tab label="Filing">
    <FilingStatus />
    <RetryButton />
  </Tab>
  <Tab label="Audit Log">
    <AuditTimeline />
  </Tab>
</Tabs>
```

### Party Display

```tsx
<Card>
  <h3>{party.display_name}</h3>
  <Badge>{party.status}</Badge>
  <p>Role: {party.party_role}</p>
  <p>Type: {party.entity_type}</p>
  {party.status === 'submitted' && (
    <Accordion>
      <AccordionContent>
        {JSON.stringify(party.party_data, null, 2)}
      </AccordionContent>
    </Accordion>
  )}
</Card>
```

### Filing Actions

```tsx
{submission.status === 'rejected' && (
  <Button onClick={retryFiling}>
    Retry Filing
  </Button>
)}
```

---

## Admin Filings

**File:** `web/app/(app)/app/admin/filings/page.tsx` (324 lines)

### Features

- All filing submissions
- Status filtering
- Retry actions
- Receipt ID display

### Table Columns

| Column | Description |
|--------|-------------|
| Property | From linked report |
| Status | Filing status with color |
| Receipt | RRER-XXXX-XXXXXXXX |
| Attempts | Number of tries |
| Environment | staging/prod |
| Submitted | Timestamp |
| Actions | View, retry |

### Status Colors

| Status | Color |
|--------|-------|
| queued | Yellow |
| submitted | Blue |
| accepted | Green |
| rejected | Red |
| needs_review | Orange |

### Retry Logic

```typescript
const canRetry = (status: string) =>
  ['rejected', 'needs_review'].includes(status)

const handleRetry = async (reportId: string) => {
  await retryFiling(reportId)
  refreshFilings()
}
```

---

## Admin Notifications

**File:** `web/app/(app)/app/admin/notifications/page.tsx` (422 lines)

### Features

- Email outbox viewer
- Filter by notification type
- View full details

### Current State

Shell implementation - shows notification events from demo outbox.

### Table Columns

| Column | Description |
|--------|-------------|
| Type | party_invite, filing_receipt, etc. |
| To | Recipient email |
| Subject | Email subject |
| Preview | First 100 chars of body |
| Sent | Timestamp |
| Status | (Future: sent/pending/failed) |

### Type Badges

```tsx
const typeColors = {
  party_invite: 'blue',
  party_submitted: 'green',
  filing_receipt: 'emerald',
  internal_alert: 'amber'
}
```

---

## Admin Users

**File:** `web/app/(app)/app/admin/users/page.tsx` (271 lines)

### Current State

Mock data display. Real user management is post-demo.

### Mock Data

```typescript
const mockUsers = [
  {
    id: '1',
    name: 'Jane Smith',
    email: 'jane@titlecompany.com',
    role: 'client_admin',
    lastLogin: '2026-02-10'
  },
  // ...
]
```

### Planned Features

- User CRUD
- Role assignment
- Company assignment
- Invite flow
- Password reset

### Demo Notice

```tsx
<Alert>
  User management shows demo data.
  Real user management will be available in production.
</Alert>
```

---

## Common Patterns

### Admin Page Header

```tsx
<div className="space-y-6">
  <div>
    <h1 className="text-2xl font-bold">Admin: {title}</h1>
    <p className="text-muted-foreground">{description}</p>
  </div>
  <Card>
    {/* Content */}
  </Card>
</div>
```

### Data Table

```tsx
<Table>
  <TableHeader>
    <TableRow>
      {columns.map(col => <TableHead key={col}>{col}</TableHead>)}
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map(item => (
      <TableRow key={item.id}>
        {/* Cells */}
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Action Dropdown

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="sm">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>View</DropdownMenuItem>
    <DropdownMenuItem>Edit</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## API Functions Used

```typescript
// From lib/api.ts
getAdminStats()
getAdminReports(params)
getAdminReportDetail(id)
getAdminFilings(params)
getAdminActivity(limit)
retryFiling(reportId)
```

---

## Related Files

- **Layout:** `web/app/(app)/layout.tsx`
- **API Client:** `web/lib/api.ts`
- **Backend Routes:** `api/app/routes/admin.py`
