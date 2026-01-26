"use client"

import { AppSidebar } from "@/components/app-sidebar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
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
  )
}
