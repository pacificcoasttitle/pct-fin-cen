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
  FileImage,
  PlusCircle,
  Building,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type UserRole = "coo" | "pct_admin" | "pct_staff" | "client_admin" | "client_user";

// Badge type with color variant
export type BadgeVariant = "alert" | "active" | "info";

export interface BadgeConfig {
  count: number;
  variant: BadgeVariant;  // alert=red, active=amber, info=blue
}

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: BadgeConfig;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

// Badge counts from API
export interface BadgeCounts {
  requestsPending: number;  // RED: Pending submission requests
  queueActive: number;      // AMBER: Reports in collecting/ready_to_file
  requestsActive: number;   // BLUE: Client's pending + in_progress
}

// ============================================
// Dynamic Navigation Generators
// ============================================

/**
 * Get navigation items for a role with dynamic badge counts
 */
export function getNavigationForRole(
  role: UserRole,
  badgeCounts?: BadgeCounts
): NavSection[] {
  const counts = badgeCounts || { requestsPending: 0, queueActive: 0, requestsActive: 0 };

  switch (role) {
    case "coo":
      return getCOONavigation(counts);
    case "pct_admin":
      return getPCTAdminNavigation(counts);
    case "pct_staff":
      return getPCTStaffNavigation(counts);
    case "client_admin":
      return getClientAdminNavigation(counts);
    case "client_user":
      return getClientUserNavigation(counts);
    default:
      return getClientUserNavigation(counts);
  }
}

// ============================================
// COO - Executive Dashboard + FULL Admin Access
// ============================================
function getCOONavigation(counts: BadgeCounts): NavSection[] {
  return [
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
          badge: counts.requestsPending > 0
            ? { count: counts.requestsPending, variant: "alert" as BadgeVariant }
            : undefined,
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
          label: "Invoices",
          href: "/app/admin/invoices",
          icon: Receipt,
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
          label: "Documents",
          href: "/app/admin/documents",
          icon: FileImage,
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
}

// ============================================
// FinClear Admin - Full Admin (NO Executive Dashboard)
// ============================================
function getPCTAdminNavigation(counts: BadgeCounts): NavSection[] {
  return [
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
          badge: counts.requestsPending > 0
            ? { count: counts.requestsPending, variant: "alert" as BadgeVariant }
            : undefined,
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
          label: "Documents",
          href: "/app/admin/documents",
          icon: FileImage,
        },
        {
          label: "Notifications",
          href: "/app/admin/notifications",
          icon: Bell,
        },
      ],
    },
  ];
}

// ============================================
// FinClear Staff - Operational Work Only
// ============================================
function getPCTStaffNavigation(counts: BadgeCounts): NavSection[] {
  return [
    {
      items: [
        {
          label: "My Queue",
          href: "/app/staff/queue",
          icon: Inbox,
          badge: counts.queueActive > 0
            ? { count: counts.queueActive, variant: "active" as BadgeVariant }  // AMBER
            : undefined,
        },
        {
          label: "All Requests",
          href: "/app/admin/requests",
          icon: ClipboardList,
          badge: counts.requestsPending > 0
            ? { count: counts.requestsPending, variant: "alert" as BadgeVariant }  // RED
            : undefined,
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
}

// ============================================
// Client Admin - Full Client Access + Billing + Team
// Client-Driven Flow: Can create reports directly and run full wizard
// ============================================
function getClientAdminNavigation(counts: BadgeCounts): NavSection[] {
  return [
    {
      items: [
        {
          label: "Dashboard",
          href: "/app/dashboard",
          icon: LayoutDashboard,
        },
        {
          label: "New Request",
          href: "/app/reports/new",
          icon: PlusCircle,
        },
      ],
    },
    {
      title: "My Company",
      items: [
        {
          label: "My Requests",
          href: "/app/requests",
          icon: FileText,
          badge: counts.requestsActive > 0
            ? { count: counts.requestsActive, variant: "info" as BadgeVariant }  // BLUE
            : undefined,
        },
        {
          label: "Billing",
          href: "/app/billing",
          icon: DollarSign,
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
          label: "Branches",
          href: "/app/settings/branches",
          icon: Building,
        },
        {
          label: "Team Members",
          href: "/app/settings/team",
          icon: Users,
        },
      ],
    },
  ];
}

// ============================================
// Client User - Basic Access (NO Billing, NO Team)
// Client-Driven Flow: Can create reports directly and run full wizard
// ============================================
function getClientUserNavigation(counts: BadgeCounts): NavSection[] {
  return [
    {
      items: [
        {
          label: "Dashboard",
          href: "/app/dashboard",
          icon: LayoutDashboard,
        },
        {
          label: "New Request",
          href: "/app/reports/new",
          icon: PlusCircle,
        },
      ],
    },
    {
      title: "My Requests",
      items: [
        {
          label: "All Requests",
          href: "/app/requests",
          icon: FileText,
          badge: counts.requestsActive > 0
            ? { count: counts.requestsActive, variant: "info" as BadgeVariant }  // BLUE
            : undefined,
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
}

// ============================================
// Helper Functions
// ============================================

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
  // COO and PCT Admin see full billing management
  // Client Admin sees their company's billing
  return role === "coo" || role === "pct_admin" || role === "client_admin";
}

export function canManageTeam(role: UserRole): boolean {
  return role === "coo" || role === "pct_admin" || role === "client_admin";
}

export function canManageCompanies(role: UserRole): boolean {
  return role === "coo" || role === "pct_admin";
}
