"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Inbox, 
  Clock, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Play,
  RefreshCw,
  Users,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { useDemo } from "@/hooks/use-demo";
import { createReport } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

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
}

export default function StaffQueuePage() {
  const { user } = useDemo();
  const router = useRouter();
  const [reports, setReports] = useState<QueueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCreatingReport, setIsCreatingReport] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchQueue = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    
    try {
      // Fetch reports in "collecting" status (waiting for parties)
      const res = await fetch(`${API_BASE_URL}/reports/queue/with-parties?status=collecting&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
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

  const handleStartWizard = async (report: QueueReport) => {
    router.push(`/app/reports/${report.id}/wizard`);
  };

  const handleRefresh = () => {
    fetchQueue(true);
  };

  // Calculate stats
  const stats = {
    waitingOnParties: reports.filter(r => !r.all_parties_complete && r.parties_total > 0).length,
    readyToReview: reports.filter(r => r.all_parties_complete && r.parties_total > 0).length,
    noParties: reports.filter(r => r.parties_total === 0).length,
    total: reports.length,
  };

  const getPartyBadge = (report: QueueReport) => {
    if (report.parties_total === 0) {
      return (
        <Badge variant="outline" className="text-slate-500">
          <Users className="h-3 w-3 mr-1" />
          No parties
        </Badge>
      );
    }
    
    if (report.all_parties_complete) {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          {report.parties_submitted}/{report.parties_total} Complete
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
        <Clock className="h-3 w-3 mr-1" />
        {report.parties_submitted}/{report.parties_total} Waiting
      </Badge>
    );
  };

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
          <h1 className="text-2xl font-bold text-slate-900">Party Collection Queue</h1>
          <p className="text-slate-500">
            Reports waiting for party information submission
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

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className={stats.waitingOnParties > 0 ? "border-amber-200 bg-amber-50" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Waiting on Parties</p>
                <p className="text-xl font-bold text-amber-600">{stats.waitingOnParties}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.readyToReview > 0 ? "border-green-200 bg-green-50" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Ready to Review</p>
                <p className="text-xl font-bold text-green-600">{stats.readyToReview}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Users className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pending Setup</p>
                <p className="text-xl font-bold">{stats.noParties}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total in Queue</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reports Collecting Party Data</CardTitle>
          <CardDescription>
            {stats.readyToReview > 0 && (
              <span className="text-green-600 font-medium">
                🎉 {stats.readyToReview} report{stats.readyToReview > 1 ? 's' : ''} ready to review!
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-900">No reports in collection!</p>
              <p className="text-slate-500">All parties have submitted or no reports are collecting.</p>
              <Button asChild className="mt-4">
                <Link href="/app/admin/reports">View All Reports</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Escrow #</TableHead>
                    <TableHead>Parties</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow
                      key={report.id}
                      className={report.all_parties_complete ? "bg-green-50/50" : ""}
                    >
                      <TableCell>
                        <div className="font-medium max-w-xs truncate">
                          {report.property_address_text || "No address"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ID: {report.id.slice(0, 8)}...
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {report.escrow_number || "—"}
                      </TableCell>
                      <TableCell>{getPartyBadge(report)}</TableCell>
                      <TableCell className="w-32">
                        {report.parties_total > 0 ? (
                          <div className="space-y-1">
                            <Progress 
                              value={(report.parties_submitted / report.parties_total) * 100} 
                              className={`h-2 ${report.all_parties_complete ? '[&>div]:bg-green-500' : '[&>div]:bg-amber-500'}`}
                            />
                            <span className="text-xs text-muted-foreground">
                              {Math.round((report.parties_submitted / report.parties_total) * 100)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {report.all_parties_complete ? (
                          <Badge className="bg-green-100 text-green-700">Ready</Badge>
                        ) : report.parties_total > 0 ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700">Collecting</Badge>
                        ) : (
                          <Badge variant="outline">Setup</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm"
                          onClick={() => handleStartWizard(report)}
                          variant={report.all_parties_complete ? "default" : "outline"}
                        >
                          {report.all_parties_complete ? (
                            <>
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Review
                            </>
                          ) : (
                            <>
                              <Eye className="mr-1 h-3 w-3" />
                              View
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="flex gap-4">
        <Button variant="outline" asChild>
          <Link href="/app/admin/reports">View All Reports</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/app/admin/requests">View Requests</Link>
        </Button>
      </div>

      {/* Auto-refresh notice */}
      <p className="text-xs text-center text-muted-foreground">
        🔄 This page auto-refreshes every 30 seconds to show the latest party submissions
      </p>
    </div>
  );
}
