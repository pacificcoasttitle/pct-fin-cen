"use client"

import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Settings,
  Shield,
  Users,
  ChevronDown,
  LogOut,
  Menu,
  X,
  BarChart3,
  Search,
  Inbox,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const isStaging = process.env.NEXT_PUBLIC_ENV_LABEL === "STAGING"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  children?: { label: string; href: string; badge?: string }[]
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/app/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: "Reports",
    href: "/app/reports",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    label: "New Report",
    href: "/app/reports/new",
    icon: <PlusCircle className="h-5 w-5" />,
  },
  {
    label: "Admin",
    href: "/app/admin/overview",
    icon: <BarChart3 className="h-5 w-5" />,
    children: [
      { label: "Overview", href: "/app/admin/overview" },
      { label: "Requests", href: "/app/admin/requests", badge: "8" },
      { label: "Companies", href: "/app/admin/companies" },
      { label: "Reports", href: "/app/admin/reports" },
      { label: "Filings", href: "/app/admin/filings" },
      { label: "Users", href: "/app/admin/users" },
      { label: "Notifications", href: "/app/admin/notifications" },
    ],
  },
  {
    label: "Settings",
    href: "/app/settings",
    icon: <Settings className="h-5 w-5" />,
  },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(pathname.startsWith("/app/admin"))

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === "/app/dashboard") return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-800">
          <div className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">PCT FinCEN</p>
            <p className="text-xs text-slate-400 truncate">Compliance Platform</p>
          </div>
          <button
            className="lg:hidden p-1 text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <div key={item.href}>
              {item.children ? (
                <>
                  <button
                    onClick={() => setAdminOpen(!adminOpen)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-slate-800 text-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                    )}
                  >
                    {item.icon}
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        adminOpen && "rotate-180"
                      )}
                    />
                  </button>
                  {adminOpen && (
                    <div className="mt-1 ml-4 pl-4 border-l border-slate-700 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                            pathname === child.href
                              ? "bg-slate-800 text-white"
                              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                          )}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <span>{child.label}</span>
                          {child.badge && (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-500 text-white rounded-full">
                              {child.badge}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Demo Tools Link (staging only) */}
        {isStaging && (
          <div className="absolute bottom-4 left-3 right-3">
            <Link
              href="/app/demo-tools"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-400 hover:bg-slate-800/50 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="w-5 h-5 flex items-center justify-center text-lg">🧪</span>
              <span>Demo Tools</span>
            </Link>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
          {/* Staging banner */}
          {isStaging && (
            <div className="bg-amber-500 text-white text-center text-xs font-medium py-1">
              STAGING ENVIRONMENT — Demo data may be reset
            </div>
          )}

          <div className="flex items-center gap-4 px-4 h-14">
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search reports..."
                  className="pl-9 bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-400 text-white text-sm">
                      DM
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium">Demo User</span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">Demo User</p>
                  <p className="text-xs text-muted-foreground">demo@example.com</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/app/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
