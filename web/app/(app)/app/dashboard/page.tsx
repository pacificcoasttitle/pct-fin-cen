"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Bell,
  Shield,
  RefreshCw,
} from "lucide-react";
import { useDemo } from "@/hooks/use-demo";
import {
  getSubmissionStats,
  getReportsWithParties,
  type SubmissionStats,
  type ReportWithParties,
} from "@/lib/api";

export default function DashboardPage() {
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
      message: `${awaitingCount} report${awaitingCount > 1 ? "s" : ""} awaiting party responses`,
      href: "/app/reports",
      color: "amber",
    },
    readyCount > 0 && {
      message: `${readyCount} report${readyCount > 1 ? "s" : ""} ready to file`,
      href: "/app/reports",
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
        return "Filed";
      case "ready_to_file":
        return "Ready to file";
      case "collecting":
      case "awaiting_parties":
        return `Awaiting ${report.party_summary?.submitted || 0}/${report.party_summary?.total || 0} parties`;
      case "exempt":
        return "Exempt";
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
            Here&apos;s what&apos;s happening with your reports
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
          <Button asChild className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700">
            <Link href="/app/reports/new">
              <Plus className="w-4 h-4 mr-2" />
              New Report
            </Link>
          </Button>
        </div>
      </div>

      {/* Action Required Banner */}
      {actionItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-amber-900">Action Required</span>
            </div>
            <ul className="space-y-2">
              {actionItems.map((item, i) => (
                <li key={i}>
                  <Link
                    href={item.href}
                    className="text-amber-800 hover:text-amber-900 flex items-center gap-2 group"
                  >
                    <span>• {item.message}</span>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/app/reports">
          <Card className="hover:shadow-md transition cursor-pointer h-full">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">
                {(stats?.pending ?? 0) + (stats?.in_progress ?? 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Active</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/app/reports">
          <Card className="hover:shadow-md transition cursor-pointer border-amber-200 h-full">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-amber-600">{stats?.in_progress ?? 0}</p>
              <p className="text-sm text-gray-500 mt-1">Awaiting Parties</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/app/reports">
          <Card className="hover:shadow-md transition cursor-pointer border-green-200 h-full">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{stats?.completed ?? 0}</p>
              <p className="text-sm text-gray-500 mt-1">Filed</p>
            </CardContent>
          </Card>
        </Link>
        <Card className="border-purple-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-600">{stats?.exempt ?? 0}</p>
            <p className="text-sm text-gray-500 mt-1">Exempt</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <Link href="/app/reports" className="text-sm text-teal-600 hover:text-teal-700">
            View all →
          </Link>
        </div>

        {recentReports.length > 0 ? (
          <div className="space-y-2">
            {recentReports.map((report) => (
              <Link
                key={report.id}
                href={`/app/reports/${report.id}/wizard`}
                className="flex items-center justify-between p-4 bg-white border rounded-xl hover:border-teal-300 hover:shadow-sm transition"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(report.status)}
                  <div>
                    <p className="font-medium text-gray-900">
                      {report.property_address_text || "No address"}
                    </p>
                    <p className="text-sm text-gray-500">{formatStatus(report)}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No reports yet</p>
              <Button asChild variant="outline">
                <Link href="/app/reports/new">Create your first report</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
