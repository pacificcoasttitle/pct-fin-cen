import {
  LayoutDashboard,
  FileText,
  Building2,
  Users,
  Inbox,
  Receipt,
  Bell,
  Send,
  ClipboardList,
  TrendingUp,
  UserCircle,
  DollarSign,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type UserRole = "coo" | "pct_admin" | "pct_staff" | "client_admin" | "client_user";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number | string;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

// ============================================
// COO - Executive Dashboard + FULL Admin Access
// ============================================
export const cooNavigation: NavSection[] = [
  {
    items: [
      {
        label: "Executive Dashboard",
        href: "/app/executive",
        icon: TrendingUp,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        label: "Requests",
        href: "/app/admin/requests",
        icon: Inbox,
        badge: 8,
      },
      {
        label: "Reports",
        href: "/app/admin/reports",
        icon: FileText,
      },
      {
        label: "Filings",
        href: "/app/admin/filings",
        icon: Send,
      },
    ],
  },
  {
    title: "Business",
    items: [
      {
        label: "Companies",
        href: "/app/admin/companies",
        icon: Building2,
      },
      {
        label: "Billing",
        href: "/app/admin/billing",
        icon: DollarSign,
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        label: "Users",
        href: "/app/admin/users",
        icon: Users,
      },
      {
        label: "Notifications",
        href: "/app/admin/notifications",
        icon: Bell,
      },
      {
        label: "Settings",
        href: "/app/admin/settings",
        icon: Settings,
      },
    ],
  },
];

// ============================================
// PCT Admin - Full Admin (NO Executive Dashboard, NO Billing)
// ============================================
export const pctAdminNavigation: NavSection[] = [
  {
    items: [
      {
        label: "Overview",
        href: "/app/admin/overview",
        icon: LayoutDashboard,
      },
      {
        label: "Requests",
        href: "/app/admin/requests",
        icon: Inbox,
        badge: 8,
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
      },
      {
        label: "Reports",
        href: "/app/admin/reports",
        icon: FileText,
      },
      {
        label: "Filings",
        href: "/app/admin/filings",
        icon: Send,
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        label: "Users",
        href: "/app/admin/users",
        icon: Users,
      },
      {
        label: "Notifications",
        href: "/app/admin/notifications",
        icon: Bell,
      },
    ],
  },
];

// ============================================
// PCT Staff - Operational Work Only
// ============================================
export const pctStaffNavigation: NavSection[] = [
  {
    items: [
      {
        label: "My Queue",
        href: "/app/staff/queue",
        icon: Inbox,
        badge: 3,
      },
      {
        label: "All Requests",
        href: "/app/admin/requests",
        icon: ClipboardList,
      },
    ],
  },
  {
    title: "My Work",
    items: [
      {
        label: "My Reports",
        href: "/app/staff/reports",
        icon: FileText,
      },
      {
        label: "Filings",
        href: "/app/admin/filings",
        icon: Send,
      },
    ],
  },
];

// ============================================
// Client Admin - Full Client Access + Billing + Team
// ============================================
export const clientAdminNavigation: NavSection[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/app/dashboard",
        icon: LayoutDashboard,
      },
      {
        label: "New Request",
        href: "/app/requests/new",
        icon: Send,
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
      },
      {
        label: "Reports",
        href: "/app/reports",
        icon: FileText,
      },
      {
        label: "Invoices",
        href: "/app/invoices",
        icon: Receipt,
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        label: "Company Settings",
        href: "/app/settings/company",
        icon: Building2,
      },
      {
        label: "Team Members",
        href: "/app/settings/team",
        icon: Users,
      },
    ],
  },
];

// ============================================
// Client User - Basic Access (NO Billing, NO Team)
// ============================================
export const clientUserNavigation: NavSection[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/app/dashboard",
        icon: LayoutDashboard,
      },
      {
        label: "New Request",
        href: "/app/requests/new",
        icon: Send,
      },
    ],
  },
  {
    title: "My Requests",
    items: [
      {
        label: "All Requests",
        href: "/app/requests",
        icon: Inbox,
      },
      {
        label: "Report Status",
        href: "/app/reports",
        icon: FileText,
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        label: "My Profile",
        href: "/app/settings/profile",
        icon: UserCircle,
      },
    ],
  },
];

// ============================================
// Helper Functions
// ============================================

export function getNavigationForRole(role: UserRole): NavSection[] {
  switch (role) {
    case "coo":
      return cooNavigation;
    case "pct_admin":
      return pctAdminNavigation;
    case "pct_staff":
      return pctStaffNavigation;
    case "client_admin":
      return clientAdminNavigation;
    case "client_user":
      return clientUserNavigation;
    default:
      return clientUserNavigation;
  }
}

export function getHomeRoute(role: UserRole): string {
  switch (role) {
    case "coo":
      return "/app/executive";
    case "pct_admin":
      return "/app/admin/overview";
    case "pct_staff":
      return "/app/staff/queue";
    case "client_admin":
    case "client_user":
    default:
      return "/app/dashboard";
  }
}

export function getPortalLabel(role: UserRole): string {
  switch (role) {
    case "coo":
      return "Executive Portal";
    case "pct_admin":
      return "Admin Portal";
    case "pct_staff":
      return "Staff Portal";
    case "client_admin":
    case "client_user":
    default:
      return "Client Portal";
  }
}

export function isPCTInternal(role: UserRole): boolean {
  return role === "coo" || role === "pct_admin" || role === "pct_staff";
}

export function isClient(role: UserRole): boolean {
  return role === "client_admin" || role === "client_user";
}

export function canViewBilling(role: UserRole): boolean {
  // COO sees billing (business overview) + Company Admin sees their invoices
  return role === "coo" || role === "client_admin";
}

export function canManageTeam(role: UserRole): boolean {
  return role === "coo" || role === "pct_admin" || role === "client_admin";
}

export function canManageCompanies(role: UserRole): boolean {
  return role === "coo" || role === "pct_admin";
}
