"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getNavigationForRole, isPCTStaff, type UserRole } from "@/lib/navigation";
import { useDemo } from "@/hooks/use-demo";
import { Badge } from "@/components/ui/badge";
import { LogOut, HelpCircle, Shield, Wrench } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function AppSidebar() {
  const pathname = usePathname();
  const { user, isLoading, logout } = useDemo();

  const role = (user?.role || "client_user") as UserRole;
  const navigation = getNavigationForRole(role);
  const isInternal = isPCTStaff(role);

  if (isLoading) {
    return (
      <aside className="flex h-screen w-64 flex-col border-r border-slate-700 bg-slate-900">
        <div className="flex h-16 items-center border-b border-slate-700 px-6">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="ml-2 h-4 w-24" />
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-700 bg-slate-900">
      {/* Logo/Header */}
      <div className="flex h-16 items-center border-b border-slate-700 px-6">
        <Link
          href={isInternal ? "/app/admin/overview" : "/app/dashboard"}
          className="flex items-center gap-2"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">PCT FinCEN</span>
            <span className="text-xs text-slate-400">
              {isInternal ? "Admin Portal" : "Client Portal"}
            </span>
          </div>
        </Link>
      </div>

      {/* User Info */}
      <div className="border-b border-slate-700 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-medium text-white">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-medium text-white">
              {user?.name || "User"}
            </span>
            <span className="truncate text-xs text-slate-400">
              {user?.companyName || (isInternal ? "PCT FinCEN Solutions" : "Company")}
            </span>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "mt-2 text-xs border",
            isInternal
              ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
              : "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
          )}
        >
          {role
            .replace("pct_", "PCT ")
            .replace("client_", "")
            .replace("_", " ")
            .replace(/\b\w/g, (l) => l.toUpperCase())}
        </Badge>
      </div>

      {/* Staging Banner */}
      {process.env.NEXT_PUBLIC_ENVIRONMENT === "staging" && (
        <div className="mx-3 mt-3 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Staging Environment
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navigation.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-4">
            {section.title && (
              <h4 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {section.title}
              </h4>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/");

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-blue-500/20 text-blue-400"
                          : "text-slate-400 hover:bg-slate-800 hover:text-white"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "h-5 px-1.5 text-xs",
                            isActive
                              ? "bg-blue-500/30 text-blue-300"
                              : "bg-slate-700 text-slate-300"
                          )}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* Demo Tools - only for PCT staff in staging */}
        {isInternal && process.env.NEXT_PUBLIC_ENVIRONMENT === "staging" && (
          <div className="mb-4">
            <h4 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Demo
            </h4>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/app/demo-tools"
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    pathname === "/app/demo-tools"
                      ? "bg-amber-500/20 text-amber-400"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <Wrench className="h-4 w-4" />
                  <span>Demo Tools</span>
                </Link>
              </li>
            </ul>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700 px-3 py-4">
        <ul className="space-y-1">
          <li>
            <Link
              href="/help"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <HelpCircle className="h-4 w-4" />
              <span>Help & Support</span>
            </Link>
          </li>
          <li>
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
}
