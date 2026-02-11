"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Bell,
  Shield,
  RefreshCw,
  Users,
} from "lucide-react";
import { useDemo } from "@/hooks/use-demo";
import {
  getSubmissionStats,
  getReportsWithParties,
  type SubmissionStats,
  type ReportWithParties,
} from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useDemo();
  const [stats, setStats] = useState<SubmissionStats | null>(null);
  const [recentReports, setRecentReports] = useState<ReportWithParties[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [statsData, reportsData] = await Promise.all([
        getSubmissionStats().catch(() => null),
        getReportsWithParties({ limit: 5 }).catch(() => ({ reports: [], total: 0 })),
      ]);
      if (statsData) setStats(statsData);
      setRecentReports(reportsData.reports || []);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchData(false), 60000);
    return () => clearInterval(interval);
  }, []);

  // Derive action items from stats
  const awaitingCount = stats?.in_progress ?? 0;
  const readyCount = recentReports.filter((r) => r.status === "ready_to_file").length;

  const actionItems = [
    awaitingCount > 0 && {
      message: `${awaitingCount} request${awaitingCount > 1 ? "s" : ""} awaiting party responses`,
      href: "/app/requests",
      color: "amber",
    },
    readyCount > 0 && {
      message: `${readyCount} request${readyCount > 1 ? "s" : ""} ready to file`,
      href: "/app/requests",
      color: "green",
    },
  ].filter(Boolean) as { message: string; href: string; color: string }[];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "filed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "ready_to_file":
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case "collecting":
      case "awaiting_parties":
        return <Clock className="w-4 h-4 text-amber-500" />;
      case "exempt":
        return <Shield className="w-4 h-4 text-purple-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatStatus = (report: ReportWithParties) => {
    switch (report.status) {
      case "filed":
        return "Filed with FinCEN";
      case "ready_to_file":
        return "Ready to file";
      case "collecting":
      case "awaiting_parties":
        return `Awaiting ${report.party_summary?.submitted || 0}/${report.party_summary?.total || 0} parties`;
      case "exempt":
        return "Exempt — no filing required";
      case "determination_complete":
        return "Determination complete";
      default:
        return report.status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Here&apos;s what&apos;s happening with your requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-6">
            <Link href="/app/reports/new">
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/app/requests">
          <Card className="hover:shadow-md transition cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
              <Clock className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-3xl font-bold">{(stats?.pending ?? 0) + (stats?.in_progress ?? 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Pending review</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/app/requests">
          <Card className="hover:shadow-md transition cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Awaiting Parties</CardTitle>
              <Users className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-3xl font-bold">{stats?.in_progress ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Collecting party data</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/app/requests">
          <Card className="hover:shadow-md transition cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Filed</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-3xl font-bold">{stats?.completed ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Submitted to FinCEN</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/app/requests">
          <Card className="hover:shadow-md transition cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Exempt</CardTitle>
              <Shield className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-3xl font-bold">{stats?.exempt ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">No filing required</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <Link href="/app/requests" className="text-sm text-primary hover:text-primary/80">
            View all →
          </Link>
        </div>

        {recentReports.length > 0 ? (
          <div className="space-y-1">
            {recentReports.slice(0, 5).map((report) => {
              const getReportHref = () => {
                if (report.status === "ready_to_file" || report.status === "filed") return `/app/reports/${report.id}/review`;
                if (report.status === "exempt") return `/app/reports/${report.id}/certificate`;
                return `/app/reports/${report.id}/wizard`;
              };
              return (
                <div
                  key={report.id}
                  onClick={() => router.push(getReportHref())}
                  className="flex items-center justify-between px-3 py-2 bg-white border rounded-lg hover:border-primary/30 hover:shadow-sm transition cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getStatusIcon(report.status)}
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {report.property_address_text || (report.status === "draft" ? "New report" : "Address not entered")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-xs text-gray-500">{formatStatus(report)}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No requests yet</p>
              <Button asChild variant="outline">
                <Link href="/app/reports/new">Create your first request</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Action Required */}
      {actionItems.length > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-900">Action Needed</span>
          </div>
          <ul className="space-y-1.5">
            {actionItems.map((item, i) => (
              <li key={i}>
                <Link
                  href={item.href}
                  className="text-sm text-emerald-800 hover:text-emerald-900 flex items-center gap-2 group"
                >
                  <span>• {item.message}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
