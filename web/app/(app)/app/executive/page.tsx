"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ReceiptId } from "@/components/ui/ReceiptId";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  FileText,
  Building2,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { getExecutiveStats, type ExecutiveStats } from "@/lib/api";

export default function ExecutiveDashboardPage() {
  const [stats, setStats] = useState<ExecutiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const data = await getExecutiveStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch executive stats:", error);
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

  // Format currency from cents
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  // Get month name
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Executive Dashboard</h1>
          <p className="text-slate-500">
            Business overview for FinClear • {currentMonth}
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => fetchData(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Attention Required Banner */}
      {!loading && ((stats?.rejected_filings ?? 0) > 0 || (stats?.needs_review_filings ?? 0) > 0) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <div>
                  <p className="font-semibold text-red-800">Attention Required</p>
                  <p className="text-sm text-red-600">
                    {(stats?.rejected_filings ?? 0) > 0 && (
                      <span>{stats?.rejected_filings} filing{(stats?.rejected_filings ?? 0) > 1 ? "s" : ""} rejected</span>
                    )}
                    {(stats?.rejected_filings ?? 0) > 0 && (stats?.needs_review_filings ?? 0) > 0 && " • "}
                    {(stats?.needs_review_filings ?? 0) > 0 && (
                      <span>{stats?.needs_review_filings} filing{(stats?.needs_review_filings ?? 0) > 1 ? "s" : ""} need{(stats?.needs_review_filings ?? 0) === 1 ? "s" : ""} review</span>
                    )}
                  </p>
                </div>
              </div>
              <Link href="/app/admin/filings?status=needs_review">
                <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                  View Filings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Revenue & Billing
        </h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Month to Date Revenue</CardDescription>
              {loading ? (
                <Skeleton className="h-9 w-32" />
              ) : (
                <CardTitle className="text-3xl">
                  {formatCurrency(stats?.mtd_revenue_cents ?? 0)}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-green-600">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                Based on {stats?.filed_this_month ?? 0} filings
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg Revenue Per Filing</CardDescription>
              {loading ? (
                <Skeleton className="h-9 w-24" />
              ) : (
                <CardTitle className="text-3xl">
                  {formatCurrency(stats?.avg_revenue_per_filing ?? 7500)}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">From billing events</p>
            </CardContent>
          </Card>

          <Link href="/app/admin/reports?filing_status=accepted&period=month">
            <Card className="cursor-pointer hover:bg-slate-50 transition-colors">
              <CardHeader className="pb-2">
                <CardDescription>Filings This Month</CardDescription>
                {loading ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  <CardTitle className="text-3xl">
                    {stats?.filed_this_month ?? 0}
                  </CardTitle>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  Completed filings <ArrowUpRight className="h-3 w-3" />
                </p>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Reports</CardDescription>
              {loading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl">
                  {stats?.total_reports ?? 0}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">All time</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Recent Filings Table */}
      {!loading && stats?.recent_filings && stats.recent_filings.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Recent Filings
          </h2>
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Property</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Company</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Filed</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Receipt ID</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_filings.map((filing, idx) => (
                    <tr key={filing.report_id} className={idx % 2 === 0 ? "" : "bg-slate-50/50"}>
                      <td className="px-4 py-3 text-sm font-medium truncate max-w-[200px]">
                        {filing.property_address}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{filing.company_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {filing.filed_at 
                          ? new Date(filing.filed_at).toLocaleDateString("en-US", { 
                              month: "short", 
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit"
                            })
                          : "—"
                        }
                      </td>
                      <td className="px-4 py-3">
                        {filing.receipt_id ? (
                          <ReceiptId value={filing.receipt_id} size="sm" />
                        ) : (
                          <span className="text-xs text-slate-400">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
            <div className="border-t px-4 py-2 text-right">
              <Link href="/app/admin/filings" className="text-sm text-blue-600 hover:underline">
                View All Filings →
              </Link>
            </div>
          </Card>
        </section>
      )}

      {/* Operations Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Operations
        </h2>
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Filed</CardDescription>
              {loading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl">
                  {stats?.filed_reports ?? 0}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <Badge className="bg-green-100 text-green-700">Completed</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Exempt</CardDescription>
              {loading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl">{stats?.exempt_reports ?? 0}</CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">No filing required</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>In Progress</CardDescription>
              {loading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl">{stats?.pending_reports ?? 0}</CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Awaiting completion</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Compliance Rate</CardDescription>
              {loading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl">{stats?.compliance_rate ?? 0}%</CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <Badge className="bg-green-100 text-green-700">Excellent</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg Completion</CardDescription>
              {loading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl">
                  {stats?.avg_completion_days ?? 0} days
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Request → Filed</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Status Breakdown */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-teal-600" />
          Report Status Breakdown
        </h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loading ? "-" : stats?.filed_reports ?? 0}</p>
                  <p className="text-sm text-slate-600">Filed with FinCEN</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ShieldCheck className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loading ? "-" : stats?.exempt_reports ?? 0}</p>
                  <p className="text-sm text-slate-600">Exempt (No Filing)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loading ? "-" : stats?.pending_reports ?? 0}</p>
                  <p className="text-sm text-slate-600">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <FileText className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loading ? "-" : stats?.total_reports ?? 0}</p>
                  <p className="text-sm text-slate-600">Total Reports</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Early Determination Insights */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-green-600" />
          Early Exemption Determination
        </h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-green-200">
            <CardHeader className="pb-2">
              <CardDescription>Exemption Rate</CardDescription>
              {loading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <CardTitle className="text-3xl text-green-600">
                  {stats?.exemption_rate ?? 0}%
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                of submissions auto-determined exempt
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Submissions</CardDescription>
              {loading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl">
                  {stats?.total_submissions ?? 0}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">All client submissions</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/30">
            <CardHeader className="pb-2">
              <CardDescription>Exempt Submissions</CardDescription>
              {loading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl text-green-600">
                  {stats?.exempt_submissions ?? 0}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-green-700">
                No staff time required
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-2">
              <CardDescription>Reportable Submissions</CardDescription>
              {loading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <CardTitle className="text-3xl text-blue-600">
                  {stats?.reportable_submissions ?? 0}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-700">
                Requires FinCEN filing
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Insight about early determination value */}
        {stats && (stats.exemption_rate ?? 0) > 0 && (
          <Card className="mt-4 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-800">
                    Early Determination Savings
                  </p>
                  <p className="text-sm text-green-700">
                    {stats.exemption_rate}% of submissions resolved instantly with certificates. 
                    Staff time saved: ~{Math.round((stats.exempt_submissions ?? 0) * 15)} minutes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Exemption Reasons Breakdown */}
        {stats && stats.exemption_reasons_breakdown && Object.keys(stats.exemption_reasons_breakdown).length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Exemption Reasons Breakdown</CardTitle>
              <CardDescription>Why submissions were automatically exempted</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.exemption_reasons_breakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([reason, count]) => (
                    <div key={reason} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium capitalize">
                          {reason.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{
                              width: `${Math.round((count / (stats.exempt_submissions || 1)) * 100)}%`
                            }}
                          />
                        </div>
                        <span className="text-sm text-slate-600 w-12 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Alerts Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          System Status
        </h2>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <>
                  {(stats?.pending_reports ?? 0) > 5 && (
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="font-medium">
                            {stats?.pending_reports} Reports In Progress
                          </p>
                          <p className="text-sm text-slate-500">
                            Monitor workload distribution
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">Monitor</Badge>
                    </div>
                  )}

                  {(stats?.pending_reports ?? 0) <= 5 && (
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">All Systems Operational</p>
                          <p className="text-sm text-slate-500">
                            No issues requiring attention
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-700">Healthy</Badge>
                    </div>
                  )}

                  {stats?.compliance_rate && stats.compliance_rate >= 95 && (
                    <div className="flex items-center justify-between p-3 bg-teal-50 rounded-lg border border-teal-200">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="h-5 w-5 text-teal-600" />
                        <div>
                          <p className="font-medium">Excellent Compliance Rate</p>
                          <p className="text-sm text-slate-500">
                            {stats.compliance_rate}% of filings accepted by FinCEN
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-teal-100 text-teal-700">Excellent</Badge>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
