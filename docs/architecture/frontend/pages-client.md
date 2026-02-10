# Client Pages

> User-facing pages for report management.

## Overview

| Page | Path | Lines | Purpose |
|------|------|-------|---------|
| Dashboard | `/app/dashboard` | 371 | Stats and recent reports |
| Reports List | `/app/reports` | 288 | All reports with filters |
| New Report | `/app/reports/new` | 44 | Create and redirect |
| Wizard | `/app/reports/[id]/wizard` | 560 | Main questionnaire |
| Settings | `/app/settings` | 248 | User preferences |
| Demo Tools | `/app/demo-tools` | 274 | Staging utilities |

---

## Dashboard

**File:** `web/app/(app)/app/dashboard/page.tsx` (371 lines)

### Features

- **Stats Cards**: Total reports, awaiting parties, ready to file, filed
- **Continue Draft**: Quick access to most recent draft
- **Reports Table**: Recent reports with status, dates, actions
- **Filters**: Search by address, filter by status

### Data Fetching

```typescript
useEffect(() => {
  const fetchReports = async () => {
    const data = await getReports()
    setReports(data)
  }
  fetchReports()
}, [])
```

### Status Categories

| Category | Statuses | Color |
|----------|----------|-------|
| Draft | `draft`, `determination_complete` | Slate |
| Awaiting | `awaiting_parties`, `collecting` | Amber |
| Ready | `ready_to_file` | Green |
| Filed | `filed` | Emerald |
| Exempt | `exempt` | Purple |

### Key Components

```tsx
<Card> // Stats cards
<Table> // Reports table
<Badge> // Status badges
<Button> // Action buttons
<Input> // Search field
<Select> // Status filter
```

---

## Reports List

**File:** `web/app/(app)/app/reports/page.tsx` (288 lines)

### Features

- Full report listing (not limited like dashboard)
- Status filtering
- Search by property address
- Pagination (planned)

### Differences from Dashboard

- Shows all reports, not just recent
- More detailed status breakdown
- Focus on report management

---

## New Report

**File:** `web/app/(app)/app/reports/new/page.tsx` (44 lines)

### Flow

```
User clicks "New Report"
         │
         ▼
POST /reports (create empty report)
         │
         ▼
Redirect to /app/reports/{id}/wizard
         │
         ▼
Wizard starts at first step
```

### Implementation

```typescript
useEffect(() => {
  const createReport = async () => {
    const report = await createReport()
    router.push(`/app/reports/${report.id}/wizard`)
  }
  createReport()
}, [])
```

---

## Wizard

**File:** `web/app/(app)/app/reports/[id]/wizard/page.tsx` (560 lines)

### Purpose

Wrapper page that loads report data and renders the main questionnaire component.

### Data Flow

```
1. Extract report ID from URL params
2. Fetch report data: GET /reports/{id}
3. Pass to RrerQuestionnaire component
4. Handle auto-save callbacks
5. Handle navigation
```

### Props to Questionnaire

```typescript
<RrerQuestionnaire
  reportId={params.id}
  initialData={report.wizard_data}
  initialStep={report.wizard_step}
  onSave={handleSave}
  onComplete={handleComplete}
/>
```

### Error States

- Loading spinner while fetching
- Error message if fetch fails
- Retry button

### See Also

- [Wizard Component](./components-wizard.md) for full questionnaire documentation

---

## Settings

**File:** `web/app/(app)/app/settings/page.tsx` (248 lines)

### Current State

Read-only in demo mode. Shows placeholder settings:

- Profile information
- Notification preferences
- Theme selection
- Password change (disabled)

### Demo Notice

```tsx
<Alert>
  Settings are read-only during the demo period.
</Alert>
```

### Planned Features (Post-Demo)

- Real profile editing
- Company settings (admin only)
- Notification preferences
- API key management

---

## Demo Tools

**File:** `web/app/(app)/app/demo-tools/page.tsx` (274 lines)

### Purpose

Staging-only utilities for testing and demos.

### Features

| Action | Description | Endpoint |
|--------|-------------|----------|
| Reset Data | Delete all and re-seed | POST /demo/reset |
| Create Report | Create single test report | POST /demo/create-report |
| View Notifications | See email outbox | GET /demo/notifications |

### Security

```typescript
// Requires secret from environment
const DEMO_SECRET = process.env.NEXT_PUBLIC_DEMO_SECRET

// All calls include header
headers: {
  'X-DEMO-SECRET': DEMO_SECRET
}
```

### UI Components

```tsx
<Card title="Reset Demo Data">
  <Button onClick={handleReset}>Reset All Data</Button>
</Card>

<Card title="Create Test Report">
  <Button onClick={handleCreate}>Create Report</Button>
</Card>

<Card title="Notification Log">
  <Table>{notifications}</Table>
</Card>
```

---

## Common Patterns

### Loading State

```tsx
if (loading) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  )
}
```

### Error State

```tsx
if (error) {
  return (
    <div className="flex flex-col items-center justify-center">
      <AlertTriangle className="h-12 w-12 text-red-500" />
      <h2>Failed to load</h2>
      <p>{error}</p>
      <Button onClick={retry}>Retry</Button>
    </div>
  )
}
```

### Page Header

```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold">Page Title</h1>
    <p className="text-slate-500">Description</p>
  </div>
  <Button>Primary Action</Button>
</div>
```

---

## Related Files

- **Layout:** `web/app/(app)/layout.tsx`
- **API Client:** `web/lib/api.ts`
- **Types:** `web/lib/rrer-types.ts`
- **Components:** `web/components/ui/`
