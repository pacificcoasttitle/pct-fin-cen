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
  created_at: string;
  updated_at: string;
}

export interface ReportListItem {
  id: string;
  status: string;
  property_address_text: string | null;
  closing_date: string | null;
  updated_at: string;
}

export interface DeterminationResult {
  reportable: boolean;
  reason_code: string;
  reason_text: string;
  required_sections: string[];
  required_certifications: string[];
  path_trace: string[];
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
  report_id: string;
  party_role: string;
  display_name: string | null;
  party_data: Record<string, unknown>;
  status: string;
  report_summary: {
    property_address: string | null;
    closing_date: string | null;
    status: string;
  };
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
  success: boolean;
  confirmation_number: string;
  filed_at: string;
  message: string;
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
 * Create a new report
 */
export async function createReport(data?: {
  property_address_text?: string;
  closing_date?: string;
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
  id: string,
  wizard_step: number,
  wizard_data: Record<string, unknown>
): Promise<Report> {
  return apiFetch<Report>(`/reports/${id}/wizard`, {
    method: 'PUT',
    body: JSON.stringify({ wizard_step, wizard_data }),
  });
}

/**
 * Run determination on a report
 */
export async function determine(id: string): Promise<DeterminationResult> {
  const data = await apiFetch<{ determination: DeterminationResult }>(`/reports/${id}/determine`, {
    method: 'POST',
  });
  return data.determination;
}

/**
 * Create party links for a report
 */
export async function createPartyLinks(id: string, parties?: {
  party_role: string;
  entity_type?: string;
  display_name?: string;
}[]): Promise<PartyLinkResponse> {
  return apiFetch<PartyLinkResponse>(`/reports/${id}/party-links`, {
    method: 'POST',
    body: JSON.stringify({ parties }),
  });
}

/**
 * Run ready check on a report
 */
export async function readyCheck(id: string): Promise<ReadyCheckResult> {
  return apiFetch<ReadyCheckResult>(`/reports/${id}/ready-check`, {
    method: 'POST',
  });
}

/**
 * File a report (mock)
 */
export async function fileReport(id: string): Promise<FileResult> {
  return apiFetch<FileResult>(`/reports/${id}/file`, {
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
  success: boolean;
  message: string;
  submitted_at: string;
}> {
  return apiFetch<{ success: boolean; message: string; submitted_at: string }>(`/party/${token}/submit`, {
    method: 'POST',
  });
}

// ============================================
// HEALTH CHECK
// ============================================

/**
 * Check API health
 */
export async function healthCheck(): Promise<{ status: string }> {
  return apiFetch<{ status: string }>('/health');
}
