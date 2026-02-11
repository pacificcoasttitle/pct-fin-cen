import { useState, useCallback } from "react";
import type {
  WizardState,
  DeterminationState,
  CollectionState,
} from "../types";
import { createInitialWizardState } from "../types";

export function useWizardState(initialData?: Partial<WizardState>) {
  const [state, setState] = useState<WizardState>(() => {
    const initial = createInitialWizardState();
    if (initialData) {
      return {
        ...initial,
        determination: { ...initial.determination, ...initialData.determination },
        collection: { ...initial.collection, ...initialData.collection },
        exemptionReason: initialData.exemptionReason,
      };
    }
    return initial;
  });

  const updateDetermination = useCallback((updates: Partial<DeterminationState>) => {
    setState((prev) => ({
      ...prev,
      determination: { ...prev.determination, ...updates },
    }));
  }, []);

  const updateCollection = useCallback((updates: Partial<CollectionState>) => {
    setState((prev) => ({
      ...prev,
      collection: { ...prev.collection, ...updates },
    }));
  }, []);

  const setExemptionReason = useCallback((reason: string) => {
    setState((prev) => ({
      ...prev,
      exemptionReason: reason,
    }));
  }, []);

  const reset = useCallback(() => {
    setState(createInitialWizardState());
  }, []);

  return {
    state,
    updateDetermination,
    updateCollection,
    setExemptionReason,
    reset,
  };
}
