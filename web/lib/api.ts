/**
 * API Client for PCT FinCEN Backend
 * Uses NEXT_PUBLIC_API_BASE_URL environment variable
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Types
export interface Report {
  id: string;
  status: string;
  property_address_text: string | null;
  closing_date: string | null;
  filing_deadline: string | null;
  wizard_step: number;
  wizard_data: Record<string, unknown>;
  determination: DeterminationResult | null;
  filing_status: string | null;
  filed_at: string | null;
  receipt_id: string | null;
  filing_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ReportListItem {
  id: string;
  status: string;
  property_address_text: string | null;
  closing_date: string | null;
  filing_status: string | null;
  filed_at: string | null;
  receipt_id: string | null;
  updated_at: string;
}

export interface DeterminationResult {
  reportable: boolean;
  reason_code: string;
  reason_text: string;
  required_sections: string[];
  required_certifications: string[];
  path_trace: string[];
  certificate_id?: string;
  exemption_reasons?: string[];
}

export interface PartyLink {
  party_id: string;
  party_role: string;
  token: string;
  url: string;
  expires_at: string;
  status: string;
}

export interface PartyLinkResponse {
  report_id: string;
  links: PartyLink[];
}

export interface PartyData {
  party_id: string;
  report_id?: string;
  party_role: string;
  entity_type: string;
  display_name: string | null;
  email: string | null;
  party_data: Record<string, unknown>;
  status: string;
  report_summary: {
    property_address: string | null;
    closing_date: string | null;
    purchase_price: number | null;
    title_company?: string;
  };
  link_expires_at: string;
  is_submitted: boolean;
  // Company branding
  company_name?: string | null;
  company_logo?: string | null;
  contact_email?: string | null;
}

export interface MissingItem {
  field: string;
  message: string;
}

export interface ReadyCheckResult {
  ready: boolean;
  missing: MissingItem[];
  summary: {
    total_parties: number;
    submitted_parties: number;
    has_determination: boolean;
    determination_reportable: boolean | null;
  };
}

export interface FileResult {
  ok: boolean;
  report_id: string;
  status: string;  // accepted, rejected, needs_review
  receipt_id?: string;
  filed_at?: string;
  rejection_code?: string;
  rejection_message?: string;
  message: string;
  is_demo: boolean;
}

// Admin Types
export interface AdminStats {
  total_reports: number;
  pending_parties: number;
  ready_to_file: number;
  filings_accepted: number;
  filings_rejected: number;
  filings_needs_review: number;
}

export interface AdminReportItem {
  id: string;
  property_address_text: string | null;
  status: string;
  filing_status: string | null;
  receipt_id: string | null;
  filed_at: string | null;
  parties_total: number;
  parties_submitted: number;
  closing_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminFilingItem {
  id: string;
  report_id: string;
  property_address: string | null;
  status: string;
  receipt_id: string | null;
  rejection_code: string | null;
  rejection_message: string | null;
  demo_outcome: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
}

export interface AdminActivityItem {
  id: string;
  report_id: string | null;
  report: { id: string; property_address: string | null } | null;
  action: string;
  actor_type: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AdminReportDetail {
  report: {
    id: string;
    property_address_text: string | null;
    closing_date: string | null;
    filing_deadline: string | null;
    status: string;
    wizard_step: number;
    determination: Record<string, unknown> | null;
    filing_status: string | null;
    filed_at: string | null;
    receipt_id: string | null;
    created_at: string;
    updated_at: string;
  };
  parties: {
    id: string;
    party_role: string;
    entity_type: string;
    display_name: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  }[];
  submission: {
    id: string;
    report_id: string;
    status: string;
    receipt_id: string | null;
    rejection_code: string | null;
    rejection_message: string | null;
    demo_outcome: string | null;
    demo_rejection_code: string | null;
    demo_rejection_message: string | null;
    attempts: number;
    created_at: string;
    updated_at: string;
  } | null;
  audit_log: {
    id: string;
    action: string;
    actor_type: string;
    details: Record<string, unknown>;
    created_at: string;
  }[];
}

export interface SetFilingOutcomeRequest {
  outcome: 'accept' | 'reject' | 'needs_review';
  code?: string;
  message?: string;
}

// API Error class
export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

// Helper function for API calls
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(response.status, errorData.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================
// REPORTS API
// ============================================

/**
 * Get all reports
 */
export async function getReports(): Promise<ReportListItem[]> {
  const data = await apiFetch<{ reports: ReportListItem[] }>('/reports');
  return data.reports;
}

/**
 * Party summary for report list views
 */
export interface PartySummary {
  total: number;
  submitted: number;
  pending: number;
  all_complete: boolean;
}

/**
 * Report with party summary for list views
 */
export interface ReportWithParties {
  id: string;
  status: string;
  property_address_text: string | null;
  closing_date: string | null;
  filing_deadline: string | null;
  wizard_step: number;
  filing_status: string | null;
  receipt_id: string | null;
  escrow_number: string | null;
  company_id: string | null;
  determination: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  party_summary: PartySummary | null;
}

/**
 * Get reports with party summaries (for queue/dashboard views)
 */
export async function getReportsWithParties(options?: {
  status?: string;
  statuses?: string;
  limit?: number;
  offset?: number;
}): Promise<{ reports: ReportWithParties[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.statuses) params.set('statuses', options.statuses);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  
  const queryString = params.toString();
  const url = `/reports/queue/with-parties${queryString ? `?${queryString}` : ''}`;
  
  // The API returns flat party fields; map them into a nested party_summary object
  const raw = await apiFetch<{ reports: Array<Record<string, unknown>>; total: number }>(url);
  
  const reports: ReportWithParties[] = (raw.reports || []).map((r) => ({
    id: String(r.id ?? ''),
    status: String(r.status ?? ''),
    property_address_text: (r.property_address_text as string) ?? null,
    closing_date: (r.closing_date as string) ?? null,
    filing_deadline: (r.filing_deadline as string) ?? null,
    wizard_step: Number(r.wizard_step ?? 0),
    filing_status: (r.filing_status as string) ?? null,
    receipt_id: (r.receipt_id as string) ?? null,
    escrow_number: (r.escrow_number as string) ?? null,
    company_id: (r.company_id as string) ?? null,
    determination: (r.determination as Record<string, unknown>) ?? null,
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
    party_summary: {
      total: Number(r.parties_total ?? 0),
      submitted: Number(r.parties_submitted ?? 0),
      pending: Number(r.parties_pending ?? 0),
      all_complete: Boolean(r.all_parties_complete ?? false),
    },
  }));
  
  return { reports, total: raw.total };
}

/**
 * Create a new report
 */
export async function createReport(data?: {
  property_address_text?: string;
  closing_date?: string;
  wizard_data?: Record<string, unknown>;
}): Promise<Report> {
  return apiFetch<Report>('/reports', {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
}

/**
 * Get a single report by ID
 */
export async function getReport(id: string): Promise<Report> {
  return apiFetch<Report>(`/reports/${id}`);
}

/**
 * Save wizard progress (autosave)
 */
export async function saveWizard(
  reportId: string,
  wizard_step: number,
  wizard_data: Record<string, unknown>
): Promise<Report> {
  return apiFetch<Report>(`/reports/${reportId}/wizard`, {
    method: 'PUT',
    body: JSON.stringify({ wizard_step, wizard_data }),
  });
}

/**
 * Run determination on a report
 */
export async function determine(reportId: string): Promise<DeterminationResult> {
  const data = await apiFetch<{ determination: DeterminationResult }>(`/reports/${reportId}/determine`, {
    method: 'POST',
  });
  return data.determination;
}

/**
 * Create party links for a report
 */
export async function createPartyLinks(reportId: string, parties?: {
  party_role: string;
  entity_type?: string;
  display_name?: string;
  email?: string;
}[]): Promise<PartyLinkResponse> {
  return apiFetch<PartyLinkResponse>(`/reports/${reportId}/party-links`, {
    method: 'POST',
    body: JSON.stringify({ parties }),
  });
}

/**
 * Run ready check on a report
 */
export async function readyCheck(reportId: string): Promise<ReadyCheckResult> {
  return apiFetch<ReadyCheckResult>(`/reports/${reportId}/ready-check`, {
    method: 'POST',
  });
}

/**
 * Download exemption certificate as PDF
 */
export async function downloadCertificatePdf(reportId: string): Promise<Blob> {
  const url = `${API_BASE_URL}/reports/${reportId}/certificate/pdf`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to download certificate' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.blob();
}

// Party status types
export interface PartyStatusItem {
  id: string;
  party_role: string;
  entity_type: string;
  display_name: string | null;
  email: string | null;
  status: string;
  submitted_at: string | null;
  token: string | null;
  link: string | null;
  link_expires_at: string | null;
  created_at: string;
  // Enhanced summary fields
  completion_percentage?: number;
  beneficial_owners_count?: number | null;
  trustees_count?: number | null;
  payment_sources_count?: number | null;
  payment_sources_total?: number | null;
  documents_count?: number;
  has_validation_errors?: boolean;
  validation_error_count?: number;
}

export interface PartySummary {
  total: number;
  submitted: number;
  pending: number;
  all_complete: boolean;
}

export interface ReportPartiesResponse {
  report_id: string;
  property_address: string | null;
  parties: PartyStatusItem[];
  summary: PartySummary;
}

/**
 * Get party status for a report
 */
export async function getReportParties(reportId: string): Promise<ReportPartiesResponse> {
  return apiFetch<ReportPartiesResponse>(`/reports/${reportId}/parties`);
}

/**
 * File a report (mock)
 */
export async function fileReport(reportId: string): Promise<FileResult> {
  return apiFetch<FileResult>(`/reports/${reportId}/file`, {
    method: 'POST',
  });
}

/**
 * Resend party link email
 */
export async function resendPartyLink(reportId: string, partyId: string): Promise<void> {
  await apiFetch(`/reports/${reportId}/parties/${partyId}/resend-link`, {
    method: 'POST',
  });
}

/**
 * Bulk resend portal links to all unsubmitted parties on a report
 */
export async function resendAllPartyLinks(reportId: string): Promise<{ message: string; emails_sent: number; parties_skipped: number }> {
  return apiFetch(`/reports/${reportId}/resend-party-links`, {
    method: 'POST',
  });
}

// ============================================
// PARTY PORTAL API
// ============================================

/**
 * Get party data by token
 */
export async function getParty(token: string): Promise<PartyData> {
  return apiFetch<PartyData>(`/party/${token}`);
}

/**
 * Save party data (autosave)
 */
export async function saveParty(
  token: string,
  party_data: Record<string, unknown>
): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>(`/party/${token}/save`, {
    method: 'POST',
    body: JSON.stringify({ party_data }),
  });
}

/**
 * Submit party data
 */
export async function submitParty(token: string): Promise<{
  party_id: string;
  status: string;
  submitted_at: string;
  confirmation_id: string;
  message: string;
}> {
  return apiFetch<{
    party_id: string;
    status: string;
    submitted_at: string;
    confirmation_id: string;
    message: string;
  }>(`/party/${token}/submit`, {
    method: 'POST',
  });
}

// ============================================
// ADMIN API
// ============================================

/**
 * Get admin dashboard statistics
 */
export async function getAdminStats(): Promise<AdminStats> {
  return apiFetch<AdminStats>('/admin/stats');
}

/**
 * Get admin reports list
 */
export async function getAdminReports(params?: {
  status?: string;
  filing_status?: string;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: AdminReportItem[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.filing_status) searchParams.set('filing_status', params.filing_status);
  if (params?.q) searchParams.set('q', params.q);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  
  const query = searchParams.toString();
  return apiFetch<{ items: AdminReportItem[]; total: number }>(
    `/admin/reports${query ? `?${query}` : ''}`
  );
}

/**
 * Get admin report detail
 */
export async function getAdminReportDetail(reportId: string): Promise<AdminReportDetail> {
  return apiFetch<AdminReportDetail>(`/admin/reports/${reportId}`);
}

/**
 * Get admin filings list
 */
export async function getAdminFilings(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: AdminFilingItem[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  
  const query = searchParams.toString();
  return apiFetch<{ items: AdminFilingItem[]; total: number }>(
    `/admin/filings${query ? `?${query}` : ''}`
  );
}

/**
 * Get recent activity
 */
export async function getAdminActivity(limit?: number): Promise<{ items: AdminActivityItem[] }> {
  return apiFetch<{ items: AdminActivityItem[] }>(
    `/admin/activity${limit ? `?limit=${limit}` : ''}`
  );
}

/**
 * Retry a filing submission
 */
export async function retryFiling(reportId: string): Promise<{
  ok: boolean;
  message: string;
  submission_status: string;
  attempts: number;
}> {
  return apiFetch<{
    ok: boolean;
    message: string;
    submission_status: string;
    attempts: number;
  }>(`/admin/reports/${reportId}/retry-filing`, {
    method: 'POST',
  });
}

/**
 * Set demo filing outcome (requires DEMO_SECRET)
 */
export async function setFilingOutcome(
  reportId: string,
  outcome: SetFilingOutcomeRequest,
  demoSecret: string
): Promise<{
  ok: boolean;
  outcome: string;
  rejection_code: string | null;
}> {
  return apiFetch<{
    ok: boolean;
    outcome: string;
    rejection_code: string | null;
  }>(`/demo/reports/${reportId}/set-filing-outcome`, {
    method: 'POST',
    headers: {
      'X-DEMO-SECRET': demoSecret,
    },
    body: JSON.stringify(outcome),
  });
}

// ============================================
// CERTIFICATION API
// ============================================

/**
 * Certify a report before filing with FinCEN
 */
export async function certifyReport(reportId: string, certification: {
  certified_by_name: string;
  certified_by_email: string;
  certification_checkboxes: Record<string, boolean>;
}): Promise<{ success: boolean; certified_at: string; message: string }> {
  return apiFetch(`/reports/${reportId}/certify`, {
    method: 'POST',
    body: JSON.stringify(certification),
  });
}

// ============================================
// SUBMISSION REQUESTS API
// ============================================

export interface SubmissionStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  exempt: number;
  this_month: number;
}

export interface SubmissionRequest {
  id: string;
  status: string;
  property_address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    county?: string;
  };
  purchase_price_cents: number;
  expected_closing_date: string;
  escrow_number: string | null;
  financing_type: string;
  buyer_name: string;
  buyer_email: string;
  buyer_type: string;
  seller_name: string;
  seller_email: string | null;
  notes: string | null;
  report_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get submission statistics for client dashboard
 */
export async function getSubmissionStats(): Promise<SubmissionStats> {
  return apiFetch<SubmissionStats>('/submission-requests/stats');
}

/**
 * Get all submission requests for the current user's company
 */
export async function getMyRequests(): Promise<SubmissionRequest[]> {
  return apiFetch<SubmissionRequest[]>('/submission-requests/my-requests');
}

// ============================================
// EXECUTIVE STATS API
// ============================================

export interface ExecutiveStats {
  total_reports: number;
  filed_reports: number;
  exempt_reports: number;
  pending_reports: number;
  filed_this_month: number;
  mtd_revenue_cents: number;
  avg_revenue_per_filing?: number;  // Actual average from billing events
  compliance_rate: number;
  avg_completion_days: number;
  
  // Filing status breakdown
  rejected_filings?: number;
  needs_review_filings?: number;
  pending_filings?: number;
  accepted_filings?: number;
  
  // Recent filings
  recent_filings?: {
    report_id: string;
    property_address: string;
    company_name: string;
    filed_at: string | null;
    receipt_id: string | null;
  }[];
  
  // Early determination stats (from SubmissionRequests)
  total_submissions?: number;
  exempt_submissions?: number;
  reportable_submissions?: number;
  exemption_rate?: number;  // Percentage of submissions that were exempt
  exemption_reasons_breakdown?: Record<string, number>;  // Breakdown by reason
}

/**
 * Get executive-level statistics for COO dashboard
 */
export async function getExecutiveStats(): Promise<ExecutiveStats> {
  return apiFetch<ExecutiveStats>('/reports/executive-stats');
}
