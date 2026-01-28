"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getReports, createReport, type ReportListItem } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }> = {
  draft: { label: "Draft", variant: "secondary", icon: FileText },
  awaiting_parties: { label: "Awaiting Parties", variant: "outline", icon: Clock },
  ready_to_file: { label: "Ready to File", variant: "default", icon: CheckCircle2 },
  filed: { label: "Filed", variant: "default", icon: CheckCircle2 },
  exempt: { label: "Exempt", variant: "secondary", icon: CheckCircle2 },
};

export default function DashboardPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getReports();
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleNewReport = async () => {
    try {
      setCreating(true);
      const report = await createReport();
      router.push(`/app/reports/${report.id}/wizard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create report");
      setCreating(false);
    }
  };

  // Stats
  const stats = {
    total: reports.length,
    draft: reports.filter(r => r.status === "draft" || r.status === "awaiting_parties").length,
    readyToFile: reports.filter(r => r.status === "ready_to_file").length,
    filed: reports.filter(r => r.status === "filed").length,
    exempt: reports.filter(r => r.status === "exempt").length,
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your FinCEN reports</p>
        </div>
        <Button 
          onClick={handleNewReport} 
          disabled={creating}
          className="bg-teal-500 hover:bg-teal-600 text-white font-semibold"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          New Report
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.draft}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.filed}</p>
                <p className="text-sm text-muted-foreground">Filed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.exempt}</p>
                <p className="text-sm text-muted-foreground">Exempt</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>Your latest FinCEN reports</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchReports} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg mb-4">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
              <Button variant="ghost" size="sm" onClick={fetchReports} className="ml-auto">
                Retry
              </Button>
            </div>
          )}

          {loading && !error ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No reports yet</h3>
              <p className="text-muted-foreground mb-4">Create your first report to get started</p>
              <Button onClick={handleNewReport} disabled={creating}>
                <Plus className="h-4 w-4 mr-2" />
                New Report
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {reports.slice(0, 10).map((report) => {
                const config = statusConfig[report.status] || statusConfig.draft;
                const StatusIcon = config.icon;
                return (
                  <Link
                    key={report.id}
                    href={`/app/reports/${report.id}/wizard`}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        <StatusIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {report.property_address_text || "New Report"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {report.closing_date 
                            ? `Closing: ${new Date(report.closing_date).toLocaleDateString()}`
                            : "No closing date set"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={config.variant}>{config.label}</Badge>
                      <span className="text-sm text-muted-foreground hidden sm:block">
                        {formatDistanceToNow(new Date(report.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {reports.length > 10 && (
            <div className="mt-4 text-center">
              <Link href="/app/reports">
                <Button variant="outline">View All Reports</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
