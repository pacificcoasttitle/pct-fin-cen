"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface BadgeCounts {
  requestsPending: number;   // For internal: pending requests (RED)
  queueActive: number;       // For staff: collecting + ready_to_file (AMBER)
  requestsActive: number;    // For clients: pending + in_progress (BLUE)
  loading: boolean;
}

interface SidebarBadgeContextType extends BadgeCounts {
  refreshCounts: () => Promise<void>;
}

const SidebarBadgeContext = createContext<SidebarBadgeContextType>({
  requestsPending: 0,
  queueActive: 0,
  requestsActive: 0,
  loading: true,
  refreshCounts: async () => {},
});

export function useSidebarBadges() {
  return useContext(SidebarBadgeContext);
}

interface ProviderProps {
  children: ReactNode;
  role: string;
  companyId: string | null;
}

export function SidebarBadgeProvider({ children, role, companyId }: ProviderProps) {
  const [counts, setCounts] = useState<BadgeCounts>({
    requestsPending: 0,
    queueActive: 0,
    requestsActive: 0,
    loading: true,
  });

  const fetchCounts = useCallback(async () => {
    try {
      const params = new URLSearchParams({ role });
      if (companyId) {
        params.set("company_id", companyId);
      }

      const response = await fetch(`${API_BASE_URL}/sidebar/counts?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setCounts({
          requestsPending: data.requests_pending || 0,
          queueActive: data.queue_active || 0,
          requestsActive: data.requests_active || 0,
          loading: false,
        });
      } else {
        setCounts((prev) => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error("Failed to fetch sidebar counts:", error);
      setCounts((prev) => ({ ...prev, loading: false }));
    }
  }, [role, companyId]);

  useEffect(() => {
    // Initial fetch
    fetchCounts();

    // Poll every 60 seconds
    const interval = setInterval(fetchCounts, 60000);

    return () => clearInterval(interval);
  }, [fetchCounts]);

  return (
    <SidebarBadgeContext.Provider
      value={{
        ...counts,
        refreshCounts: fetchCounts,
      }}
    >
      {children}
    </SidebarBadgeContext.Provider>
  );
}
