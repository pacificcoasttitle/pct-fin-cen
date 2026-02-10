# API Client

> `web/lib/api.ts` (482 lines)
> Frontend API client for all backend communication.

## Overview

The API client provides typed functions for all backend endpoints. It handles error responses and provides consistent request formatting.

## Configuration

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
```

## Error Handling

```typescript
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Usage in functions
async function apiCall() {
  const res = await fetch(url)
  if (!res.ok) {
    throw new ApiError(res.status, await res.text())
  }
  return res.json()
}
```

---

## Types

### Report Types

```typescript
export interface Report {
  id: string
  status: string
  property_address_text: string | null
  closing_date: string | null
  filing_deadline: string | null
  wizard_step: string | null
  wizard_data: Record<string, unknown>
  determination: Record<string, unknown> | null
  filing_status: string | null
  filed_at: string | null
  receipt_id: string | null
  filing_payload: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface ReportListItem {
  id: string
  status: string
  property_address_text: string | null
  closing_date: string | null
  created_at: string
  updated_at: string
}
```

### Party Types

```typescript
export interface PartyLink {
  party_id: string
  role: string
  entity_type: string
  token: string
  link_url: string
  expires_at: string
}

export interface PartyData {
  party_id: string
  role: string
  entity_type: string
  party_data: Record<string, unknown>
  status: string
  report_summary: {
    property_address: string
    closing_date: string
    title_company: string
  }
  is_submitted: boolean
}
```

### Admin Types

```typescript
export interface AdminStats {
  total_reports: number
  reports_by_status: Record<string, number>
  filings_by_status: Record<string, number>
  parties_pending: number
  parties_submitted: number
  recent_activity_count: number
}

export interface AdminReportItem {
  id: string
  status: string
  property_address_text: string | null
  closing_date: string | null
  filing_deadline: string | null
  party_count: number
  parties_submitted: number
  filing_status: string | null
  receipt_id: string | null
  created_at: string
  updated_at: string
}

export interface AdminFilingItem {
  id: string
  report_id: string
  property_address: string | null
  status: string
  receipt_id: string | null
  rejection_code: string | null
  rejection_message: string | null
  attempts: number
  environment: string
  created_at: string
  updated_at: string
}

export interface AdminActivityItem {
  id: string
  action: string
  actor_type: string
  report_id: string | null
  property_address: string | null
  details: Record<string, unknown>
  ip_address: string | null
  created_at: string
}
```

---

## Report Functions

### getReports()

```typescript
export async function getReports(): Promise<ReportListItem[]> {
  const res = await fetch(`${API_BASE}/reports`)
  if (!res.ok) throw new ApiError(res.status, await res.text())
  const data = await res.json()
  return data.reports
}
```

### createReport()

```typescript
export async function createReport(
  data?: Partial<{
    property_address_text: string
    closing_date: string
    wizard_data: Record<string, unknown>
  }>
): Promise<Report> {
  const res = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {})
  })
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}
```

### getReport()

```typescript
export async function getReport(id: string): Promise<Report> {
  const res = await fetch(`${API_BASE}/reports/${id}`)
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}
```

### saveWizard()

```typescript
export async function saveWizard(
  reportId: string,
  step: string,
  data: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`${API_BASE}/reports/${reportId}/wizard`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wizard_step: step,
      wizard_data: data
    })
  })
  if (!res.ok) throw new ApiError(res.status, await res.text())
}
```

### determine()

```typescript
export interface DeterminationResult {
  report_id: string
  is_reportable: boolean
  status: string
  determination: Record<string, unknown>
  reasoning: string[]
}

export async function determine(reportId: string): Promise<DeterminationResult> {
  const res = await fetch(`${API_BASE}/reports/${reportId}/determine`, {
    method: 'POST'
  })
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}
```

### createPartyLinks()

```typescript
export interface PartyLinkResponse {
  report_id: string
  links: PartyLink[]
}

export async function createPartyLinks(
  reportId: string,
  data?: {
    parties: Array<{
      party_role: string
      entity_type: string
      display_name: string
    }>
    expires_in_days?: number
  }
): Promise<PartyLinkResponse> {
  const res = await fetch(`${API_BASE}/reports/${reportId}/party-links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {})
  })
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}
```

### readyCheck()

```typescript
export interface ReadyCheckResult {
  is_ready: boolean
  missing: Array<{
    category: string
    field: string
    party_id: string | null
    message: string
  }>
}

export async function readyCheck(reportId: string): Promise<ReadyCheckResult> {
  const res = await fetch(`${API_BASE}/reports/${reportId}/ready-check`, {
    method: 'POST'
  })
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}
```

### fileReport()

```typescript
export interface FileResult {
  ok: boolean
  report_id: string
  status: string
  receipt_id: string | null
  message: string
  is_demo: boolean
}

export async function fileReport(reportId: string): Promise<FileResult> {
  const res = await fetch(`${API_BASE}/reports/${reportId}/file`, {
    method: 'POST'
  })
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}
```

---

## Party Portal Functions

### getParty()

```typescript
export async function getParty(token: string): Promise<PartyData> {
  const res = await fetch(`${API_BASE}/party/${token}`)
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}
```

### saveParty()

```typescript
export async function saveParty(
  token: string,
  data: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`${API_BASE}/party/${token}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ party_data: data })
  })
  if (!res.ok) throw new ApiError(res.status, await res.text())
}
```

### submitParty()

```typescript
export interface PartySubmitResult {
  party_id: string
  status: string
  submitted_at: string
  confirmation_id: string
  message: string
}

export async function submitParty(token: string): Promise<PartySubmitResult> {
  const res = await fetch(`${API_BASE}/party/${token}/submit`, {
    method: 'POST'
  })
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}
```

---

## Admin Functions

### getAdminStats()

```typescript
export async function getAdminStats(): Promise<AdminStats> {
  const res = await fetch(`${API_BASE}/admin/stats`)
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}
```

### getAdminReports()

```typescript
export async function getAdminReports(params?: {
  status?: string
  filing_status?: string
  limit?: number
  offset?: number
}): Promise<{ reports: AdminReportItem[]; total: number }> {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.filing_status) searchParams.set('filing_status', params.filing_status)
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.offset) searchParams.set('offset', String(params.offset))

  const res = await fetch(`${API_BASE}/admin/reports?${searchParams}`)
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}
```

### getAdminReportDetail()

```typescript
export interface AdminReportDetail extends Report {
  parties: Array<{
    id: string
    party_role: string
    entity_type: string
    display_name: string
    status: string
    party_data: Record<string, unknown>
  }>
  filing_submission: AdminFilingItem | null
  audit_logs: AdminActivityItem[]
}

export async function getAdminReportDetail(reportId: string): Promise<AdminReportDetail> {
  const res = await fetch(`${API_BASE}/admin/reports/${reportId}`)
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}
```

### getAdminFilings()

```typescript
export async function getAdminFilings(params?: {
  status?: string
  limit?: number
  offset?: number
}): Promise<{ filings: AdminFilingItem[]; total: number }> {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.offset) searchParams.set('offset', String(params.offset))

  const res = await fetch(`${API_BASE}/admin/filings?${searchParams}`)
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}
```

### getAdminActivity()

```typescript
export async function getAdminActivity(
  limit: number = 50
): Promise<{ activity: AdminActivityItem[] }> {
  const res = await fetch(`${API_BASE}/admin/activity?limit=${limit}`)
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}
```

### retryFiling()

```typescript
export async function retryFiling(reportId: string): Promise<FileResult> {
  const res = await fetch(`${API_BASE}/admin/reports/${reportId}/retry-filing`, {
    method: 'POST'
  })
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}
```

---

## Demo Functions

### setFilingOutcome()

```typescript
export interface SetFilingOutcomeRequest {
  outcome: 'accept' | 'reject' | 'needs_review'
  rejection_code?: string
  rejection_message?: string
}

export async function setFilingOutcome(
  reportId: string,
  request: SetFilingOutcomeRequest,
  secret: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/demo/reports/${reportId}/set-filing-outcome`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-DEMO-SECRET': secret
    },
    body: JSON.stringify(request)
  })
  if (!res.ok) throw new ApiError(res.status, await res.text())
}
```

---

## Usage Examples

### In Components

```typescript
// Fetch on mount
useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true)
      const reports = await getReports()
      setReports(reports)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Error ${err.status}: ${err.message}`)
      } else {
        setError('Unknown error')
      }
    } finally {
      setLoading(false)
    }
  }
  fetchData()
}, [])
```

### With Error Toast

```typescript
const handleSubmit = async () => {
  try {
    await fileReport(reportId)
    toast.success('Report filed successfully')
  } catch (err) {
    if (err instanceof ApiError) {
      toast.error(err.message)
    }
  }
}
```

---

## Related Files

- **Backend Routes:**
  - `api/app/routes/reports.py`
  - `api/app/routes/parties.py`
  - `api/app/routes/admin.py`
  - `api/app/routes/demo.py`
- **Types:** `web/lib/rrer-types.ts`
