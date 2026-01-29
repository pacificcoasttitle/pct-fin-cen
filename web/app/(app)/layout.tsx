"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarBadgeProvider } from "@/context/sidebar-badge-context"
import { parseSessionCookie, type DemoSession } from "@/lib/session"

interface SessionData {
  role: string;
  companyId: string | null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionData>({ role: "client_user", companyId: null });

  // Read session from cookie using shared utility
  useEffect(() => {
    const sessionData = parseSessionCookie();
    if (sessionData) {
      setSession({
        role: sessionData.role,
        companyId: sessionData.companyId,
      });
    }
  }, []);

  return (
    <SidebarBadgeProvider role={session.role} companyId={session.companyId}>
      <div className="flex h-screen bg-slate-50">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto">
          {/* Staging banner */}
          {process.env.NEXT_PUBLIC_ENVIRONMENT === "staging" && (
            <div className="bg-amber-500 text-white text-center text-xs font-medium py-1">
              STAGING ENVIRONMENT — Demo data may be reset
            </div>
          )}
          <div className="p-6">{children}</div>
        </main>
      </div>
    </SidebarBadgeProvider>
  )
}
