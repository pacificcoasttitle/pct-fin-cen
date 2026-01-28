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
  RefreshCw,
  Search,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getReports, createReport, type ReportListItem } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }> = {
  draft: { label: "Draft", variant: "secondary", icon: FileText },
  awaiting_parties: { label: "Awaiting Parties", variant: "outline", icon: Clock },
  ready_to_file: { label: "Ready to File", variant: "default", icon: CheckCircle2 },
  filed: { label: "Filed", variant: "default", icon: CheckCircle2 },
  exempt: { label: "Exempt", variant: "secondary", icon: CheckCircle2 },
};

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

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

  // Filter reports
  const filteredReports = reports.filter((report) => {
    const matchesSearch = !searchQuery || 
      (report.property_address_text?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = !statusFilter || report.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = reports.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">All your FinCEN reports in one place</p>
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by property address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={statusFilter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(null)}
          >
            All ({reports.length})
          </Button>
          {Object.entries(statusConfig).map(([status, config]) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(statusFilter === status ? null : status)}
            >
              {config.label} ({statusCounts[status] || 0})
            </Button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg mb-4">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchReports} className="ml-auto">
            Retry
          </Button>
        </div>
      )}

      {/* Reports List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              {filteredReports.length} {filteredReports.length === 1 ? "Report" : "Reports"}
            </CardTitle>
            <CardDescription>
              {searchQuery || statusFilter ? "Filtered results" : "All reports"}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchReports} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {loading && !error ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchQuery || statusFilter ? "No matching reports" : "No reports yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter 
                  ? "Try adjusting your filters" 
                  : "Create your first report to get started"}
              </p>
              {!searchQuery && !statusFilter && (
                <Button onClick={handleNewReport} disabled={creating}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Report
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredReports.map((report) => {
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
        </CardContent>
      </Card>
    </div>
  );
}
