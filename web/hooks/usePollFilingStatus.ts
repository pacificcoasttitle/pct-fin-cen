// usePollFilingStatus.ts — Auto-refresh hook for pending filing status
//
// USAGE:
//   const { filingStatus, receiptId, isPolling, lastChecked, error } = usePollFilingStatus(reportId);
//
// Polls /reports/{id}/filing-status every 60s while status is "submitted" or "queued"
// Stops polling when accepted, rejected, or an error occurs

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";

interface FilingStatusData {
  status: string;
  receipt_id?: string;
  submitted_at?: string;
  accepted_at?: string;
  rejection_reason?: string;
  is_demo?: boolean;
}

interface UsePollFilingStatusResult {
  filingStatus: string | null;
  receiptId: string | null;
  submittedAt: string | null;
  acceptedAt: string | null;
  rejectionReason: string | null;
  isDemo: boolean;
  isPolling: boolean;
  lastChecked: Date | null;
  error: string | null;
  refresh: () => Promise<void>;
}

const POLL_INTERVAL_MS = 60000; // 60 seconds
const POLLING_STATUSES = ["submitted", "queued"];

export function usePollFilingStatus(
  reportId: string | null,
  enabled: boolean = true
): UsePollFilingStatusResult {
  const [filingStatus, setFilingStatus] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [acceptedAt, setAcceptedAt] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const fetchStatus = useCallback(async () => {
    if (!reportId) return;

    try {
      setError(null);
      const response = await api.get<FilingStatusData>(`/reports/${reportId}/filing-status`);
      
      if (!mountedRef.current) return;

      setFilingStatus(response.status);
      setReceiptId(response.receipt_id || null);
      setSubmittedAt(response.submitted_at || null);
      setAcceptedAt(response.accepted_at || null);
      setRejectionReason(response.rejection_reason || null);
      setIsDemo(response.is_demo || false);
      setLastChecked(new Date());

      // Stop polling if we've reached a terminal state
      if (!POLLING_STATUSES.includes(response.status)) {
        setIsPolling(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to fetch filing status");
      setIsPolling(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [reportId]);

  const refresh = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    mountedRef.current = true;

    if (!reportId || !enabled) {
      setIsPolling(false);
      return;
    }

    // Initial fetch
    fetchStatus();

    // Start polling if status warrants it
    const startPolling = () => {
      if (filingStatus && POLLING_STATUSES.includes(filingStatus)) {
        setIsPolling(true);
        intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
      }
    };

    // Check initial status after a short delay to allow state to update
    const timeout = setTimeout(startPolling, 100);

    return () => {
      mountedRef.current = false;
      clearTimeout(timeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [reportId, enabled, fetchStatus, filingStatus]);

  return {
    filingStatus,
    receiptId,
    submittedAt,
    acceptedAt,
    rejectionReason,
    isDemo,
    isPolling,
    lastChecked,
    error,
    refresh,
  };
}

export default usePollFilingStatus;
