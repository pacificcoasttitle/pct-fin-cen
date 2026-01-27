"use client";

import { useEffect, useState, useCallback } from "react";

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: "coo" | "pct_admin" | "pct_staff" | "client_admin" | "client_user";
  companyId: string | null;
  companyName: string;
}

/**
 * Hook to get demo user info from session cookie.
 * 
 * The cookie contains base64-encoded JSON with user data,
 * set by the login API route.
 */
export function useDemo() {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      // Read demo session from cookie
      const cookies = document.cookie.split(";").reduce((acc, cookie) => {
        const parts = cookie.trim().split("=");
        const key = parts[0];
        const value = parts.slice(1).join("="); // Handle values with = in them
        if (key) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, string>);

      const sessionValue = cookies["pct_demo_session"];

      if (sessionValue && sessionValue !== "1") {
        try {
          // Decode URL encoding first, then base64
          const decodedValue = decodeURIComponent(sessionValue);
          const decoded = atob(decodedValue);
          const userData = JSON.parse(decoded) as DemoUser;
          setUser(userData);
        } catch (e) {
          // Invalid session data, treat as logged out
          console.error("Failed to parse session:", e);
          setUser(null);
        }
      } else if (sessionValue === "1") {
        // Legacy session format - default to pct_admin
        setUser({
          id: "demo-legacy",
          email: "admin@pctfincen.com",
          name: "Demo User",
          role: "pct_admin",
          companyId: null,
          companyName: "PCT FinCEN Solutions",
        });
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error("Error reading cookies:", e);
      setUser(null);
    }

    setIsLoading(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      window.location.href = "/login";
    } catch (e) {
      console.error("Logout failed:", e);
    }
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isCOO: user?.role === "coo",
    isPCTStaff: user?.role === "coo" || user?.role === "pct_admin" || user?.role === "pct_staff",
    isClient: user?.role === "client_admin" || user?.role === "client_user",
    isAdmin: user?.role === "coo" || user?.role === "pct_admin" || user?.role === "client_admin",
    logout,
  };
}
