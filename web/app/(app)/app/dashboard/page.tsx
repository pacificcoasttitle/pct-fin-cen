"use client";

import { useState, useEffect } from "react";
import { useDemo } from "@/hooks/use-demo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Send, Clock, CheckCircle, AlertCircle, RefreshCw, Loader2, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { getSubmissionStats, getMyRequests, type SubmissionStats, type SubmissionRequest } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

export default function ClientDashboardPage() {
  const { user } = useDemo();
  const isClientAdmin = user?.role === "client_admin";

  const [stats, setStats] = useState<SubmissionStats | null>(null);
  const [recentRequests, setRecentRequests] = useState<SubmissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [statsData, requestsData] = await Promise.all([
        getSubmissionStats(),
        getMyRequests(),
      ]);
      setStats(statsData);
      setRecentRequests(requestsData.slice(0, 5)); // Last 5
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.name?.split(" ")[0] || "User"}</h1>
          <p className="text-muted-foreground">{user?.companyName || "Your Company"}</p>
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
          <Button asChild size="lg">
            <Link href="/app/requests/new">
              <Send className="mr-2 h-4 w-4" />
              New Request
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Action Card */}
      <Card className="border-primary bg-primary/5">
        <CardHeader>
          <CardTitle>Need a FinCEN Report?</CardTitle>
          <CardDescription>
            Submit a request and our team will handle the compliance filing for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/app/requests/new">
              <Send className="mr-2 h-4 w-4" />
              Submit New Request
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.pending ?? 0}</div>
                <p className="text-xs text-muted-foreground">Awaiting processing</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.in_progress ?? 0}</div>
                <p className="text-xs text-muted-foreground">Being processed</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.completed ?? 0}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.this_month ?? 0}</div>
                <p className="text-xs text-muted-foreground">Requests submitted</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
          <CardDescription>Your latest submission requests</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between border-b pb-3">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[80px]" />
                </div>
              ))}
            </div>
          ) : recentRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No requests yet. Submit your first request!</p>
              <Button asChild className="mt-4">
                <Link href="/app/requests/new">Submit Request</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentRequests.map((request) => {
                // Calculate party progress (GAP 1 Fix)
                const partiesTotal = request.parties_total || (request.parties?.length ?? 0);
                const partiesSubmitted = request.parties_submitted || 
                  (request.parties?.filter((p: { status: string }) => p.status === "submitted").length ?? 0);
                const partyProgress = partiesTotal > 0 ? (partiesSubmitted / partiesTotal) * 100 : 0;
                
                return (
                  <Link 
                    key={request.id} 
                    href={`/app/requests/${request.id}`}
                    className="flex items-center justify-between border-b pb-3 last:border-0 hover:bg-muted/50 rounded px-2 -mx-2 py-2 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${
                        request.status === "completed" ? "bg-green-500" :
                        request.status === "exempt" ? "bg-green-500" :
                        request.status === "in_progress" ? "bg-blue-500" : "bg-yellow-500"
                      }`} />
                      <div>
                        <span className="text-sm font-medium">{request.property_address.street}</span>
                        <p className="text-xs text-muted-foreground">
                          {request.property_address.city}, {request.property_address.state} • {request.buyer_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                      </span>
                      <div className="flex items-center gap-2">
                        {/* Party Status - GAP 1 Fix */}
                        {partiesTotal > 0 && request.status !== "completed" && request.status !== "exempt" && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <Progress value={partyProgress} className="w-12 h-1.5" />
                            <span className={`text-[10px] ${partyProgress === 100 ? "text-green-600" : "text-muted-foreground"}`}>
                              {partiesSubmitted}/{partiesTotal}
                            </span>
                          </div>
                        )}
                        <p className="text-xs font-medium capitalize">{request.status.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
              {recentRequests.length > 0 && (
                <div className="pt-2">
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/app/requests">View All Requests</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing Summary - Client Admin Only */}
      {isClientAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Billing Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-2xl font-bold">$0.00</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Filings This Month</p>
                <p className="text-lg font-medium">{stats?.this_month ?? 0}</p>
                <p className="text-xs text-muted-foreground">@ $75/filing</p>
              </div>
              <div className="flex items-end">
                <Button variant="outline" asChild>
                  <Link href="/app/invoices">View All Invoices</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
