// StatusBadge.tsx — Single source of truth for all status display in FinClear
//
// USAGE:
//   <StatusBadge type="report" status="filed" />
//   <StatusBadge type="filing" status="accepted" />
//   <StatusBadge type="request" status="completed" />
//   <StatusBadge type="invoice" status="paid" />
//   <StatusBadge type="party" status="submitted" />

import { Badge } from "./badge";
import { cn } from "@/lib/utils";

export type StatusType = "report" | "filing" | "request" | "invoice" | "party" | "user";

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor?: string;
  description?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORT STATUS (internal workflow)
// ═══════════════════════════════════════════════════════════════════════════
export const REPORT_STATUS_CONFIG: Record<string, StatusConfig> = {
  draft: {
    label: "Draft",
    color: "text-slate-600",
    bgColor: "bg-slate-100",
    description: "Just created",
  },
  determination_complete: {
    label: "Determined",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    description: "Determination phase done",
  },
  awaiting_parties: {
    label: "Awaiting Parties",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    description: "Party portal links sent",
  },
  collecting: {
    label: "Collecting",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    description: "Collection in progress",
  },
  ready_to_file: {
    label: "Ready to File",
    color: "text-green-600",
    bgColor: "bg-green-100",
    description: "All data collected",
  },
  filed: {
    label: "Filed",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    description: "Successfully filed with FinCEN",
  },
  exempt: {
    label: "Exempt",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    description: "Determined exempt",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-600",
    bgColor: "bg-red-100",
    description: "Cancelled",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// FILING STATUS (SDTM submission lifecycle)
// ═══════════════════════════════════════════════════════════════════════════
export const FILING_STATUS_CONFIG: Record<string, StatusConfig> = {
  not_started: {
    label: "Not Started",
    color: "text-slate-600",
    bgColor: "bg-slate-100",
    description: "No filing attempted",
  },
  queued: {
    label: "Queued",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    description: "In queue for submission",
  },
  submitted: {
    label: "Submitted",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    description: "Uploaded to FinCEN, awaiting response",
  },
  accepted: {
    label: "Accepted",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    description: "FinCEN accepted, BSA ID received",
  },
  rejected: {
    label: "Rejected",
    color: "text-red-600",
    bgColor: "bg-red-100",
    description: "FinCEN rejected",
  },
  needs_review: {
    label: "Needs Review",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    description: "Warnings or timeout, staff must review",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST STATUS (client-facing)
// ═══════════════════════════════════════════════════════════════════════════
export const REQUEST_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    label: "Pending Review",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    description: "Awaiting staff review",
  },
  exempt: {
    label: "Exempt",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    description: "No filing required",
  },
  reportable: {
    label: "Reportable",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    description: "Requires filing",
  },
  in_progress: {
    label: "In Progress",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    description: "Filing in progress",
  },
  completed: {
    label: "Completed",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    description: "Filing complete",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-600",
    bgColor: "bg-red-100",
    description: "Cancelled",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// INVOICE STATUS
// ═══════════════════════════════════════════════════════════════════════════
export const INVOICE_STATUS_CONFIG: Record<string, StatusConfig> = {
  draft: {
    label: "Draft",
    color: "text-slate-600",
    bgColor: "bg-slate-100",
  },
  pending: {
    label: "Pending",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
  paid: {
    label: "Paid",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
  overdue: {
    label: "Overdue",
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// PARTY STATUS
// ═══════════════════════════════════════════════════════════════════════════
export const PARTY_STATUS_CONFIG: Record<string, StatusConfig> = {
  invited: {
    label: "Invited",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  in_progress: {
    label: "In Progress",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
  submitted: {
    label: "Submitted",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
  needs_correction: {
    label: "Needs Correction",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// USER STATUS
// ═══════════════════════════════════════════════════════════════════════════
export const USER_STATUS_CONFIG: Record<string, StatusConfig> = {
  active: {
    label: "Active",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
  inactive: {
    label: "Inactive",
    color: "text-slate-600",
    bgColor: "bg-slate-100",
  },
  pending: {
    label: "Pending",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
  suspended: {
    label: "Suspended",
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// MASTER CONFIG MAP
// ═══════════════════════════════════════════════════════════════════════════
const STATUS_CONFIGS: Record<StatusType, Record<string, StatusConfig>> = {
  report: REPORT_STATUS_CONFIG,
  filing: FILING_STATUS_CONFIG,
  request: REQUEST_STATUS_CONFIG,
  invoice: INVOICE_STATUS_CONFIG,
  party: PARTY_STATUS_CONFIG,
  user: USER_STATUS_CONFIG,
};

// ═══════════════════════════════════════════════════════════════════════════
// STATUS BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
interface StatusBadgeProps {
  type: StatusType;
  status: string;
  size?: "sm" | "md";
  className?: string;
  showDescription?: boolean;
}

export function StatusBadge({
  type,
  status,
  size = "sm",
  className,
  showDescription = false,
}: StatusBadgeProps) {
  const config = STATUS_CONFIGS[type]?.[status] || {
    label: status,
    color: "text-slate-600",
    bgColor: "bg-slate-100",
  };

  const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        config.bgColor,
        config.color,
        sizeClasses,
        className
      )}
      title={showDescription ? config.description : undefined}
    >
      {config.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the status configuration for a given type and status.
 * Useful when you need to access label/color outside of the component.
 */
export function getStatusConfig(type: StatusType, status: string): StatusConfig {
  return STATUS_CONFIGS[type]?.[status] || {
    label: status,
    color: "text-slate-600",
    bgColor: "bg-slate-100",
  };
}

/**
 * Get all possible statuses for a given type.
 * Useful for building filter dropdowns.
 */
export function getStatusOptions(type: StatusType): { value: string; label: string }[] {
  const config = STATUS_CONFIGS[type] || {};
  return Object.entries(config).map(([value, { label }]) => ({
    value,
    label,
  }));
}

export default StatusBadge;
