"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  PlusCircle,
  RefreshCw,
  Play,
  Users,
  Send,
  Loader2,
} from "lucide-react";
import { getReportsWithParties, type ReportWithParties } from "@/lib/api";
import { useSession } from "@/lib/session";

function getStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Draft</Badge>;
    case "determination_complete":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Determination Done</Badge>;
    case "collecting":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Collecting Info</Badge>;
    case "ready_to_file":
      return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Ready to File</Badge>;
    case "filed":
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Filed</Badge>;
    case "exempt":
      return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Exempt</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getPartyBadge(summary: { total: number; submitted: number; all_complete: boolean } | null) {
  if (!summary || summary.total === 0) {
    return <span className="text-sm text-gray-400">No parties</span>;
  }
  
  if (summary.all_complete) {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <CheckCircle className="h-3 w-3 mr-1" />
        {summary.submitted}/{summary.total}
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
      <Clock className="h-3 w-3 mr-1" />
      {summary.submitted}/{summary.total}
    </Badge>
  );
}

export default function ClientReportsPage() {
  const router = useRouter();
  const session = useSession();
  const [reports, setReports] = useState<ReportWithParties[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      // Fetch reports in active states
      const data = await getReportsWithParties({ 
        statuses: "draft,determination_complete,collecting,ready_to_file,filed,exempt",
        limit: 50,
      });
      setReports(data.reports || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const getActionButton = (report: ReportWithParties) => {
    const { status, party_summary, id } = report;
    
    // Draft or determination in progress - continue wizard
    if (status === "draft" || status === "determination_complete") {
      return (
        <Button 
          variant="default" 
          size="sm"
          onClick={() => router.push(`/app/reports/${id}/wizard`)}
        >
          <Play className="mr-1 h-3 w-3" />
          Continue
        </Button>
      );
    }
    
    // Collecting - send links or view status
    if (status === "collecting") {
      if (!party_summary || party_summary.total === 0) {
        return (
          <Button 
            variant="default" 
            size="sm"
            onClick={() => router.push(`/app/reports/${id}/wizard?step=party-setup`)}
          >
            <Users className="mr-1 h-3 w-3" />
            Add Parties
          </Button>
        );
      }
      return (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => router.push(`/app/reports/${id}/wizard?step=monitor-progress`)}
        >
          <Eye className="mr-1 h-3 w-3" />
          Track
        </Button>
      );
    }
    
    // Ready to file - can manually trigger or view
    if (status === "ready_to_file") {
      return (
        <Button 
          variant="default" 
          size="sm"
          onClick={() => router.push(`/app/reports/${id}/wizard?step=file`)}
        >
          <Send className="mr-1 h-3 w-3" />
          File Now
        </Button>
      );
    }
    
    // Filed or exempt - view details
    return (
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => router.push(`/app/reports/${id}/review`)}
      >
        <Eye className="mr-1 h-3 w-3" />
        View
      </Button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with New Report Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Reports</h1>
          <p className="text-muted-foreground">Track and manage your FinCEN reports</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchReports}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => router.push("/app/reports/new")}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Report
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && reports.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading reports...</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && reports.length === 0 && !error && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No reports yet</h3>
            <p className="text-muted-foreground mb-6">
              Start by creating your first FinCEN report
            </p>
            <Button onClick={() => router.push("/app/reports/new")}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Report
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Reports Table */}
      {reports.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Property</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Parties</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Filing</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="max-w-xs truncate text-sm font-medium">
                        {report.property_address_text || "Address pending"}
                      </div>
                      {report.escrow_number && (
                        <div className="text-xs text-muted-foreground">
                          #{report.escrow_number}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(report.status)}</td>
                    <td className="px-4 py-3">{getPartyBadge(report.party_summary)}</td>
                    <td className="px-4 py-3 text-sm">
                      {report.receipt_id ? (
                        <span className="font-mono text-xs text-green-700">
                          BSA: {report.receipt_id}
                        </span>
                      ) : report.filing_status ? (
                        <span className="text-xs text-gray-500">
                          {report.filing_status}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(report.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {getActionButton(report)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Status Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-gray-400" />
              <span className="text-sm"><strong>Draft:</strong> Wizard in progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-sm"><strong>Collecting:</strong> Waiting for party submissions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-indigo-500" />
              <span className="text-sm"><strong>Ready:</strong> All info received, can file</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-purple-500" />
              <span className="text-sm"><strong>Filed:</strong> Submitted to FinCEN</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm"><strong>Accepted:</strong> BSA ID received</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-gray-300" />
              <span className="text-sm"><strong>Exempt:</strong> No filing required</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-File Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Send className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Automatic Filing</h3>
              <p className="text-sm text-blue-700 mt-1">
                When all parties submit their information, reports are automatically 
                filed with FinCEN. You'll receive a confirmation email with the BSA ID.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
