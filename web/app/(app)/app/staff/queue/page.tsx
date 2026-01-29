"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Clock, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Play,
  RefreshCw,
  Users,
  Eye,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { useDemo } from "@/hooks/use-demo";
import { 
  PartyTypeBadge, 
  PartyStatusBadge, 
  PartyCompletionProgress,
  type PartySummaryData 
} from "@/components/party";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// Enhanced party interface from API
interface PartyItem {
  id: string;
  party_role: string;
  entity_type: string;
  display_name: string | null;
  email: string | null;
  status: string;
  submitted_at: string | null;
  completion_percentage: number;
  beneficial_owners_count: number | null;
  trustees_count: number | null;
  payment_sources_count: number | null;
  payment_sources_total: number | null;
  documents_count: number;
  has_validation_errors: boolean;
  validation_error_count: number;
}

interface QueueReport {
  id: string;
  status: string;
  property_address_text: string | null;
  escrow_number: string | null;
  closing_date: string | null;
  filing_deadline: string | null;
  wizard_step: number;
  determination: Record<string, unknown> | null;
  filing_status: string | null;
  created_at: string;
  updated_at: string;
  parties_total: number;
  parties_submitted: number;
  parties_pending: number;
  all_parties_complete: boolean;
  parties: PartyItem[];
}

interface QueueCounts {
  needs_setup: number;
  collecting: number;
  ready: number;
  total: number;
}

const statusConfig: Record<string, { label: string; color: string; description: string }> = {
  draft: { 
    label: "Needs Setup", 
    color: "bg-slate-500",
    description: "Wizard in progress, parties not yet invited"
  },
  determination_complete: { 
    label: "Ready for Parties", 
    color: "bg-blue-500",
    description: "Determination complete, ready to send party links"
  },
  collecting: { 
    label: "Collecting", 
    color: "bg-amber-500",
    description: "Waiting for parties to submit information"
  },
  ready_to_file: { 
    label: "Ready to File", 
    color: "bg-green-500",
    description: "All information collected, ready for FinCEN submission"
  },
};

export default function StaffQueuePage() {
  const { user } = useDemo();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [reports, setReports] = useState<QueueReport[]>([]);
  const [counts, setCounts] = useState<QueueCounts>({ 
    needs_setup: 0, 
    collecting: 0, 
    ready: 0, 
    total: 0 
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchQueue = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    
    try {
      // Fetch all active reports (API now defaults to active statuses if no filter)
      const res = await fetch(
        `${API_BASE_URL}/reports/queue/with-parties?limit=100`
      );
      
      if (res.ok) {
        const data = await res.json();
        const items: QueueReport[] = data.reports || [];
        setReports(items);
        
        // Calculate counts
        setCounts({
          needs_setup: items.filter((r) => 
            r.status === "draft" || r.status === "determination_complete"
          ).length,
          collecting: items.filter((r) => r.status === "collecting").length,
          ready: items.filter((r) => r.status === "ready_to_file").length,
          total: items.length,
        });
      }
    } catch (error) {
      console.error("Failed to fetch queue:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastRefresh(new Date());
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchQueue(false), 30000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const handleRefresh = () => {
    fetchQueue(true);
  };

  const handleAction = (report: QueueReport) => {
    router.push(`/app/reports/${report.id}/wizard`);
  };

  const getFilteredReports = () => {
    switch (activeTab) {
      case "needs_setup":
        return reports.filter(r => r.status === "draft" || r.status === "determination_complete");
      case "collecting":
        return reports.filter(r => r.status === "collecting");
      case "ready":
        return reports.filter(r => r.status === "ready_to_file");
      default:
        return reports;
    }
  };

  const getActionButton = (report: QueueReport) => {
    switch (report.status) {
      case "draft":
      case "determination_complete":
        return (
          <Button size="sm" onClick={() => handleAction(report)}>
            <Play className="h-3 w-3 mr-1" />
            Continue Setup
          </Button>
        );
      case "collecting":
        return (
          <Button 
            size="sm" 
            variant={report.all_parties_complete ? "default" : "outline"}
            onClick={() => handleAction(report)}
          >
            {report.all_parties_complete ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Review
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1" />
                View Progress
              </>
            )}
          </Button>
        );
      case "ready_to_file":
        return (
          <Button 
            size="sm" 
            className="bg-green-600 hover:bg-green-700" 
            onClick={() => handleAction(report)}
          >
            <Send className="h-3 w-3 mr-1" />
            Review & File
          </Button>
        );
      default:
        return (
          <Button size="sm" variant="outline" onClick={() => handleAction(report)}>
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
        );
    }
  };

  const getDaysUntilDeadline = (deadline: string | null): number | null => {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffTime = deadlineDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return "—";
    try {
      return new Date(deadline).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "—";
    }
  };

  // Expanded party rows state
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  
  const toggleReportExpanded = (reportId: string) => {
    setExpandedReports(prev => {
      const next = new Set(prev);
      if (next.has(reportId)) {
        next.delete(reportId);
      } else {
        next.add(reportId);
      }
      return next;
    });
  };

  const getPartyProgress = (report: QueueReport) => {
    if (report.parties_total === 0) {
      return (
        <span className="text-xs text-muted-foreground">No parties yet</span>
      );
    }
    
    // Check if any party has validation errors
    const hasAnyErrors = report.parties?.some(p => p.has_validation_errors);
    
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center">
          <Users className="h-3 w-3 mr-1 text-muted-foreground" />
          <span className="text-sm">
            {report.parties_submitted}/{report.parties_total}
          </span>
        </div>
        {hasAnyErrors && (
          <AlertTriangle className="h-3 w-3 text-amber-500" />
        )}
        {report.all_parties_complete && !hasAnyErrors && (
          <CheckCircle className="h-4 w-4 text-green-500" />
        )}
      </div>
    );
  };
  
  // Render expanded party details
  const renderPartyDetails = (report: QueueReport) => {
    if (!report.parties || report.parties.length === 0) {
      return (
        <div className="py-4 px-6 bg-muted/50 text-center text-muted-foreground text-sm">
          No parties added yet
        </div>
      );
    }
    
    return (
      <div className="py-3 px-6 bg-muted/30 space-y-2 border-t">
        {report.parties.map((party) => (
          <div 
            key={party.id} 
            className="flex items-center justify-between p-3 bg-background rounded-lg border"
          >
            <div className="flex items-center gap-3">
              <PartyTypeBadge type={party.entity_type} />
              <div>
                <span className="font-medium text-sm">
                  {party.display_name || "Unnamed Party"}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({party.party_role === "transferee" ? "Buyer" : "Seller"})
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Type-specific counts */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {party.beneficial_owners_count !== null && (
                  <span>{party.beneficial_owners_count} BO{party.beneficial_owners_count !== 1 ? "s" : ""}</span>
                )}
                {party.trustees_count !== null && (
                  <span>{party.trustees_count} trustee{party.trustees_count !== 1 ? "s" : ""}</span>
                )}
                {party.payment_sources_count !== null && party.payment_sources_count > 0 && (
                  <span>
                    ${((party.payment_sources_total || 0) / 100).toLocaleString()}
                  </span>
                )}
              </div>
              
              {/* Completion progress */}
              <PartyCompletionProgress 
                percentage={party.completion_percentage}
                hasErrors={party.has_validation_errors}
                errorCount={party.validation_error_count}
                size="sm"
              />
              
              <PartyStatusBadge status={party.status} showIcon={false} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const filteredReports = getFilteredReports();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Queue</h1>
          <p className="text-slate-500">
            Track and manage your assigned reports
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Updated {lastRefresh.toLocaleTimeString()}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card 
          className={`cursor-pointer transition-colors hover:bg-slate-50 ${activeTab === "all" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{counts.total}</p>
                <p className="text-sm text-muted-foreground">Total Active</p>
              </div>
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-colors hover:bg-slate-50 ${counts.needs_setup > 0 ? 'border-amber-300 bg-amber-50' : ''} ${activeTab === "needs_setup" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setActiveTab("needs_setup")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{counts.needs_setup}</p>
                <p className="text-sm text-muted-foreground">Needs Setup</p>
              </div>
              <Play className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-colors hover:bg-slate-50 ${activeTab === "collecting" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setActiveTab("collecting")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{counts.collecting}</p>
                <p className="text-sm text-muted-foreground">Collecting</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-colors hover:bg-slate-50 ${counts.ready > 0 ? 'border-green-300 bg-green-50' : ''} ${activeTab === "ready" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setActiveTab("ready")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{counts.ready}</p>
                <p className="text-sm text-muted-foreground">Ready to File</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">
            All ({counts.total})
          </TabsTrigger>
          <TabsTrigger value="needs_setup" className="relative">
            Needs Setup
            {counts.needs_setup > 0 && (
              <Badge className="ml-2 bg-amber-500 hover:bg-amber-500">{counts.needs_setup}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="collecting">
            Collecting ({counts.collecting})
          </TabsTrigger>
          <TabsTrigger value="ready" className="relative">
            Ready to File
            {counts.ready > 0 && (
              <Badge className="ml-2 bg-green-500 hover:bg-green-500">{counts.ready}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === "all" && "All Active Reports"}
              {activeTab === "needs_setup" && "Reports Needing Setup"}
              {activeTab === "collecting" && "Reports Collecting Party Data"}
              {activeTab === "ready" && "Reports Ready to File"}
            </CardTitle>
            <CardDescription>
              {counts.ready > 0 && activeTab !== "ready" && (
                <span className="text-green-600 font-medium">
                  🎉 {counts.ready} report{counts.ready > 1 ? 's' : ''} ready to file!
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-lg font-medium text-slate-900">No reports in this category</p>
                <p className="text-slate-500">
                  {activeTab === "ready" 
                    ? "Reports will appear here when all parties have submitted."
                    : "Great job keeping up with your queue!"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Escrow #</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => {
                      const daysLeft = getDaysUntilDeadline(report.filing_deadline);
                      const isUrgent = daysLeft !== null && daysLeft <= 5 && daysLeft >= 0;
                      const isOverdue = daysLeft !== null && daysLeft < 0;
                      const config = statusConfig[report.status];
                      const isExpanded = expandedReports.has(report.id);
                      const hasParties = report.parties && report.parties.length > 0;
                      
                      return (
                        <>
                          <TableRow 
                            key={report.id}
                            className={
                              isOverdue ? "bg-red-50" : 
                              isUrgent ? "bg-amber-50" : 
                              report.status === "ready_to_file" ? "bg-green-50/50" : ""
                            }
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {hasParties && (
                                  <button
                                    onClick={() => toggleReportExpanded(report.id)}
                                    className="p-0.5 hover:bg-muted rounded"
                                    title={isExpanded ? "Hide parties" : "Show parties"}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </button>
                                )}
                                <div>
                                  <p className="font-medium max-w-xs truncate">
                                    {report.property_address_text || "No address"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    ID: {report.id.slice(0, 8)}...
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <code className="text-sm bg-slate-100 px-2 py-0.5 rounded">
                                {report.escrow_number || "—"}
                              </code>
                            </TableCell>
                            <TableCell>
                              <Badge className={config?.color || "bg-slate-500"}>
                                {config?.label || report.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {report.status === "collecting" || report.status === "ready_to_file" ? (
                                getPartyProgress(report)
                              ) : report.status === "draft" || report.status === "determination_complete" ? (
                                <span className="text-sm text-muted-foreground">
                                  Step {report.wizard_step || 1}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {report.filing_deadline ? (
                                <div className={`flex items-center gap-1 ${
                                  isOverdue ? 'text-red-600 font-semibold' : 
                                  isUrgent ? 'text-amber-600 font-medium' : ''
                                }`}>
                                  {(isUrgent || isOverdue) && <AlertTriangle className="h-4 w-4" />}
                                  <span>{formatDeadline(report.filing_deadline)}</span>
                                  {daysLeft !== null && (
                                    <span className="text-xs">
                                      {isOverdue ? `(${Math.abs(daysLeft)}d overdue)` : `(${daysLeft}d)`}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {getActionButton(report)}
                            </TableCell>
                          </TableRow>
                          {/* Expanded Party Details Row */}
                          {isExpanded && (
                            <TableRow key={`${report.id}-parties`}>
                              <TableCell colSpan={6} className="p-0">
                                {renderPartyDetails(report)}
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>

      {/* Quick Links */}
      <div className="flex gap-4">
        <Button variant="outline" asChild>
          <Link href="/app/reports">View All Reports</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/app/admin/requests">View Requests</Link>
        </Button>
      </div>

      {/* Auto-refresh notice */}
      <p className="text-xs text-center text-muted-foreground">
        🔄 This page auto-refreshes every 30 seconds
      </p>
    </div>
  );
}
