import {
  LayoutDashboard,
  FileText,
  Building2,
  Users,
  Inbox,
  Receipt,
  Bell,
  Send,
  Settings,
  HelpCircle,
  DollarSign,
  BarChart3,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type UserRole = "pct_admin" | "pct_staff" | "client_admin" | "client_user";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number | string;
  roles: UserRole[];
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

// PCT Staff Navigation (pct_admin, pct_staff)
export const pctNavigation: NavSection[] = [
  {
    items: [
      {
        label: "Overview",
        href: "/app/admin/overview",
        icon: BarChart3,
        roles: ["pct_admin", "pct_staff"],
      },
      {
        label: "Requests",
        href: "/app/admin/requests",
        icon: Inbox,
        roles: ["pct_admin", "pct_staff"],
        badge: 8, // Will be dynamic later
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        label: "Companies",
        href: "/app/admin/companies",
        icon: Building2,
        roles: ["pct_admin", "pct_staff"],
      },
      {
        label: "Reports",
        href: "/app/admin/reports",
        icon: FileText,
        roles: ["pct_admin", "pct_staff"],
      },
      {
        label: "Filings",
        href: "/app/admin/filings",
        icon: Send,
        roles: ["pct_admin", "pct_staff"],
      },
      {
        label: "Billing",
        href: "/app/admin/billing",
        icon: DollarSign,
        roles: ["pct_admin"], // Admin only
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        label: "Users",
        href: "/app/admin/users",
        icon: Users,
        roles: ["pct_admin"], // Admin only
      },
      {
        label: "Notifications",
        href: "/app/admin/notifications",
        icon: Bell,
        roles: ["pct_admin"], // Admin only
      },
    ],
  },
];

// Client Navigation (client_admin, client_user)
export const clientNavigation: NavSection[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/app/dashboard",
        icon: LayoutDashboard,
        roles: ["client_admin", "client_user"],
      },
      {
        label: "New Request",
        href: "/app/requests/new",
        icon: Send,
        roles: ["client_admin", "client_user"],
      },
    ],
  },
  {
    title: "My Company",
    items: [
      {
        label: "Requests",
        href: "/app/requests",
        icon: Inbox,
        roles: ["client_admin", "client_user"],
      },
      {
        label: "Reports",
        href: "/app/reports",
        icon: FileText,
        roles: ["client_admin", "client_user"],
      },
      {
        label: "Invoices",
        href: "/app/invoices",
        icon: Receipt,
        roles: ["client_admin", "client_user"],
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        label: "Company Settings",
        href: "/app/settings/company",
        icon: Building2,
        roles: ["client_admin"], // Admin only
      },
      {
        label: "Team Members",
        href: "/app/settings/team",
        icon: Users,
        roles: ["client_admin"], // Admin only
      },
      {
        label: "My Profile",
        href: "/app/settings/profile",
        icon: Settings,
        roles: ["client_admin", "client_user"],
      },
    ],
  },
];

// Helper to get navigation based on role
export function getNavigationForRole(role: UserRole): NavSection[] {
  if (role === "pct_admin" || role === "pct_staff") {
    return pctNavigation
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.roles.includes(role)),
      }))
      .filter((section) => section.items.length > 0);
  }

  if (role === "client_admin" || role === "client_user") {
    return clientNavigation
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.roles.includes(role)),
      }))
      .filter((section) => section.items.length > 0);
  }

  return [];
}

// Check if user is PCT internal staff
export function isPCTStaff(role: UserRole): boolean {
  return role === "pct_admin" || role === "pct_staff";
}

// Check if user is client
export function isClient(role: UserRole): boolean {
  return role === "client_admin" || role === "client_user";
}

// Get home page for role
export function getHomePageForRole(role: UserRole): string {
  if (isPCTStaff(role)) {
    return "/app/admin/overview";
  }
  return "/app/dashboard";
}
