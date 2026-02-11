import { useEffect, useRef, useCallback } from "react";
import type { WizardState } from "../types";

// ============================================================
// AUTO-SAVE HOOK
// Debounced save of wizard state to backend via updateReport API
// ============================================================

interface UseAutoSaveOptions {
  /** Report ID to save to */
  reportId: string;
  /** Current wizard state */
  wizardState: WizardState;
  /** Debounce interval in ms (default: 1500) */
  debounceMs?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
  /** Callback to perform the actual save */
  onSave: (reportId: string, wizardData: WizardState) => Promise<void>;
  /** Optional callback on save error */
  onError?: (error: unknown) => void;
  /** Optional callback on save success */
  onSuccess?: () => void;
}

export function useAutoSave({
  reportId,
  wizardState,
  debounceMs = 1500,
  enabled = true,
  onSave,
  onError,
  onSuccess,
}: UseAutoSaveOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");
  const isSavingRef = useRef(false);

  // Serialize state for comparison
  const serialize = useCallback((state: WizardState): string => {
    try {
      return JSON.stringify(state);
    } catch {
      return "";
    }
  }, []);

  // Perform save
  const performSave = useCallback(
    async (state: WizardState) => {
      if (isSavingRef.current) return;

      const serialized = serialize(state);
      if (serialized === lastSavedRef.current) return; // No changes

      isSavingRef.current = true;

      try {
        await onSave(reportId, state);
        lastSavedRef.current = serialized;
        onSuccess?.();
      } catch (error) {
        onError?.(error);
      } finally {
        isSavingRef.current = false;
      }
    },
    [reportId, onSave, onError, onSuccess, serialize],
  );

  // Debounced save on state change
  useEffect(() => {
    if (!enabled || !reportId) return;

    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set new debounced timer
    timerRef.current = setTimeout(() => {
      performSave(wizardState);
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [wizardState, enabled, reportId, debounceMs, performSave]);

  // Flush: save immediately (useful before navigation)
  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await performSave(wizardState);
  }, [performSave, wizardState]);

  // Mark current state as "already saved" (e.g., after initial load)
  const markSaved = useCallback(() => {
    lastSavedRef.current = serialize(wizardState);
  }, [wizardState, serialize]);

  return {
    flush,
    markSaved,
    isSaving: isSavingRef.current,
  };
}
