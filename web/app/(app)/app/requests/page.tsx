"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  RefreshCw,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  PlusCircle,
  Play,
  Users,
  Send,
  Shield,
  Loader2,
  Search,
  ArrowRight,
} from "lucide-react";
import {
  getReportsWithParties,
  type ReportWithParties,
} from "@/lib/api";

// ── Status helpers ──────────────────────────────────────────────────

function getStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Draft</Badge>;
    case "determination_complete":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Determination Done</Badge>;
    case "collecting":
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Collecting Info</Badge>;
    case "ready_to_file":
      return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Ready to File</Badge>;
    case "filed":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Filed</Badge>;
    case "exempt":
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Exempt</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getPartyProgress(summary: { total: number; submitted: number; all_complete: boolean } | null) {
  if (!summary || summary.total === 0) {
    return <span className="text-sm text-gray-400">—</span>;
  }
  if (summary.all_complete) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium">
        <CheckCircle className="h-3.5 w-3.5" />
        {summary.submitted}/{summary.total}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm text-amber-600 font-medium">
      <Clock className="h-3.5 w-3.5" />
      {summary.submitted}/{summary.total}
    </span>
  );
}

// ── Tab definitions ─────────────────────────────────────────────────

type TabKey = "active" | "ready" | "filed" | "exempt" | "drafts";

const TAB_CONFIG: { key: TabKey; label: string; statuses: string[]; icon: React.ReactNode; emptyMessage: string }[] = [
  {
    key: "active",
    label: "Active",
    statuses: ["collecting", "determination_complete"],
    icon: <Clock className="h-4 w-4" />,
    emptyMessage: "No active requests — start a new request to begin.",
  },
  {
    key: "ready",
    label: "Ready to File",
    statuses: ["ready_to_file"],
    icon: <Send className="h-4 w-4" />,
    emptyMessage: "No requests ready to file yet.",
  },
  {
    key: "filed",
    label: "Filed",
    statuses: ["filed"],
    icon: <CheckCircle className="h-4 w-4" />,
    emptyMessage: "No filed requests yet.",
  },
  {
    key: "exempt",
    label: "Exempt",
    statuses: ["exempt"],
    icon: <Shield className="h-4 w-4" />,
    emptyMessage: "No exempt transactions.",
  },
  {
    key: "drafts",
    label: "Drafts",
    statuses: ["draft"],
    icon: <FileText className="h-4 w-4" />,
    emptyMessage: "No draft requests.",
  },
];

// ── Main Page ───────────────────────────────────────────────────────

export default function UnifiedRequestsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportWithParties[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("active");

  const fetchAll = async () => {
    try {
      setLoading(true);
      const data = await getReportsWithParties({
        statuses: "draft,determination_complete,collecting,ready_to_file,filed,exempt",
        limit: 100,
      });
      setReports(data.reports || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => fetchAll(), 60000);
    return () => clearInterval(interval);
  }, []);

  // Filter by search
  const filteredReports = useMemo(() => {
    if (!search.trim()) return reports;
    const q = search.toLowerCase();
    return reports.filter(
      (r) =>
        (r.property_address_text || "").toLowerCase().includes(q) ||
        (r.escrow_number || "").toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    );
  }, [reports, search]);

  // Group by tab statuses
  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = { active: 0, ready: 0, filed: 0, exempt: 0, drafts: 0 };
    for (const r of filteredReports) {
      for (const tab of TAB_CONFIG) {
        if (tab.statuses.includes(r.status)) {
          counts[tab.key]++;
          break;
        }
      }
    }
    return counts;
  }, [filteredReports]);

  const getTabReports = (tab: TabKey) => {
    const cfg = TAB_CONFIG.find((t) => t.key === tab)!;
    return filteredReports.filter((r) => cfg.statuses.includes(r.status));
  };

  const getActionButton = (report: ReportWithParties) => {
    const { status, party_summary, id } = report;

    if (status === "draft" || status === "determination_complete") {
      return (
        <Button
          variant="default"
          size="sm"
          onClick={(e) => { e.stopPropagation(); router.push(`/app/reports/${id}/wizard`); }}
        >
          <Play className="mr-1 h-3 w-3" /> Continue
        </Button>
      );
    }
    if (status === "collecting") {
      if (!party_summary || party_summary.total === 0) {
        return (
          <Button
            variant="default"
            size="sm"
            onClick={(e) => { e.stopPropagation(); router.push(`/app/reports/${id}/wizard?step=party-setup`); }}
          >
            <Users className="mr-1 h-3 w-3" /> Add Parties
          </Button>
        );
      }
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); router.push(`/app/reports/${id}/wizard?step=monitor-progress`); }}
        >
          <Eye className="mr-1 h-3 w-3" /> Track
        </Button>
      );
    }
    if (status === "ready_to_file") {
      return (
        <Button
          variant="default"
          size="sm"
          onClick={(e) => { e.stopPropagation(); router.push(`/app/reports/${id}/wizard?step=file`); }}
        >
          <Send className="mr-1 h-3 w-3" /> File Now
        </Button>
      );
    }
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => { e.stopPropagation(); router.push(`/app/reports/${id}/wizard`); }}
      >
        <Eye className="mr-1 h-3 w-3" /> View
      </Button>
    );
  };

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Requests</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track and manage your FinCEN filing requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAll}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            asChild
            className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
          >
            <Link href="/app/reports/new">
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Link>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by address, escrow #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={fetchAll} className="ml-auto">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && reports.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Loading requests...</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state — no reports at all */}
      {!loading && reports.length === 0 && !error && (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-14 w-14 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No requests yet</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Create your first FinCEN filing request. Our wizard will guide you through
              the determination and party collection process.
            </p>
            <Button
              asChild
              className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
            >
              <Link href="/app/reports/new">
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Request
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main content — tabs */}
      {reports.length > 0 && (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabKey)}
          className="w-full"
        >
          <TabsList className="w-full justify-start overflow-x-auto">
            {TAB_CONFIG.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="gap-2">
                {tab.icon}
                {tab.label}
                {tabCounts[tab.key] > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 min-w-[20px] px-1.5 text-xs"
                  >
                    {tabCounts[tab.key]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {TAB_CONFIG.map((tab) => (
            <TabsContent key={tab.key} value={tab.key} className="mt-4">
              <RequestTable
                reports={getTabReports(tab.key)}
                emptyMessage={tab.emptyMessage}
                getActionButton={getActionButton}
                router={router}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

// ── Reusable table component ────────────────────────────────────────

function RequestTable({
  reports,
  emptyMessage,
  getActionButton,
  router,
}: {
  reports: ReportWithParties[];
  emptyMessage: string;
  getActionButton: (r: ReportWithParties) => React.ReactNode;
  router: ReturnType<typeof useRouter>;
}) {
  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-gray-500">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full">
          <thead className="border-b bg-gray-50/80">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Property</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Parties</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Filing</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Created</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {reports.map((report) => (
              <tr
                key={report.id}
                className="hover:bg-gray-50/60 cursor-pointer transition"
                onClick={() => router.push(`/app/reports/${report.id}/wizard`)}
              >
                <td className="px-4 py-3">
                  <div className="max-w-xs truncate text-sm font-medium text-gray-900">
                    {report.property_address_text || "Address pending"}
                  </div>
                  {report.escrow_number && (
                    <div className="text-xs text-gray-500">#{report.escrow_number}</div>
                  )}
                </td>
                <td className="px-4 py-3">{getStatusBadge(report.status)}</td>
                <td className="px-4 py-3">{getPartyProgress(report.party_summary)}</td>
                <td className="px-4 py-3 text-sm">
                  {report.receipt_id ? (
                    <span className="font-mono text-xs text-green-700">BSA: {report.receipt_id}</span>
                  ) : report.filing_status ? (
                    <span className="text-xs text-gray-500">{report.filing_status}</span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(report.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">{getActionButton(report)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
