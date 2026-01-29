"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  RefreshCw,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  MoreHorizontal,
  Users,
  Send,
  Shield,
  Printer,
} from "lucide-react";
import { PartyTypeBadge, PartyStatusBadge } from "@/components/party";
import { Progress } from "@/components/ui/progress";
import { ExemptionCertificate, type ExemptionCertificateData } from "@/components/exemption";

interface PartyBasicInfo {
  id: string;
  party_role: string;
  entity_type: string;
  display_name: string | null;
  status: string;
}

interface ExemptionReasonDisplay {
  code: string;
  display: string;
}

interface SubmissionRequest {
  id: string;
  status: "pending" | "exempt" | "reportable" | "in_progress" | "completed" | "cancelled";
  property_address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  purchase_price_cents: number;
  expected_closing_date: string;
  escrow_number?: string;
  buyer_name: string;
  buyer_type: string;
  seller_name: string;
  created_at: string;
  updated_at: string;
  report_id?: string;
  report_status?: string;
  receipt_id?: string;
  // Party info (limited for clients)
  parties_total?: number;
  parties_submitted?: number;
  parties?: PartyBasicInfo[];
  // Determination fields
  determination_result?: "exempt" | "reportable" | "needs_review";
  exemption_reasons?: string[];
  exemption_reasons_display?: ExemptionReasonDisplay[];
  determination_timestamp?: string;
  determination_method?: string;
  exemption_certificate_id?: string;
}

const statusConfig = {
  pending: {
    label: "Pending Review",
    variant: "secondary" as const,
    icon: Clock,
    description: "Waiting for FinClear staff to begin processing",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  exempt: {
    label: "Exempt",
    variant: "default" as const,
    icon: Shield,
    description: "No FinCEN report required for this transaction",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  reportable: {
    label: "Reportable",
    variant: "default" as const,
    icon: FileText,
    description: "FinCEN report required - in staff queue",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  in_progress: {
    label: "In Progress",
    variant: "default" as const,
    icon: RefreshCw,
    description: "FinClear staff is processing your request",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  completed: {
    label: "Completed",
    variant: "default" as const,
    icon: CheckCircle2,
    description: "Filing has been submitted to FinCEN",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  cancelled: {
    label: "Cancelled",
    variant: "destructive" as const,
    icon: AlertCircle,
    description: "This request has been cancelled",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

export default function ClientRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<SubmissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "exempt" | "filed">("active");
  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<ExemptionCertificateData | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/submission-requests/my-requests`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch requests");
      }

      const data = await response.json();
      setRequests(data);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchRequests, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      if (diffDays > 0) return `${diffDays}d ago`;
      if (diffHours > 0) return `${diffHours}h ago`;
      if (diffMinutes > 0) return `${diffMinutes}m ago`;
      return "Just now";
    } catch {
      return "N/A";
    }
  };

  // Separate requests into categories
  const exemptRequests = requests.filter(r => r.status === "exempt");
  const activeRequests = requests.filter(r => 
    ["pending", "reportable", "in_progress"].includes(r.status)
  );
  const filedRequests = requests.filter(r => r.status === "completed");
  
  // Open certificate dialog for an exempt request
  const openCertificate = (request: SubmissionRequest) => {
    if (!request.exemption_certificate_id) return;
    
    setSelectedCertificate({
      certificateId: request.exemption_certificate_id,
      propertyAddress: request.property_address,
      purchasePrice: request.purchase_price_cents / 100,
      buyerName: request.buyer_name,
      escrowNumber: request.escrow_number,
      exemptionReasons: request.exemption_reasons_display || [],
      determinationTimestamp: request.determination_timestamp || request.created_at,
      determinationMethod: request.determination_method || "auto_client_form",
    });
    setCertificateDialogOpen(true);
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Requests</h1>
          <p className="text-muted-foreground mt-1">
            Track your FinCEN compliance submissions
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchRequests} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => router.push("/app/requests/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{requests.length}</div>
            <p className="text-xs text-muted-foreground">Total Requests</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {exemptRequests.length}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" /> Exempt
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {requests.filter((r) => r.status === "pending" || r.status === "reportable").length}
            </div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {requests.filter((r) => r.status === "in_progress").length}
            </div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {filedRequests.length}
            </div>
            <p className="text-xs text-muted-foreground">Filed</p>
          </CardContent>
        </Card>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive bg-destructive/10 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={fetchRequests} className="ml-auto">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && requests.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && requests.length === 0 && !error && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No requests yet</h3>
            <p className="text-muted-foreground mb-6">
              Submit your first compliance request to get started.
            </p>
            <Button onClick={() => router.push("/app/requests/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Submit New Request
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Requests Table with Tabs */}
      {!loading && requests.length > 0 && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "exempt" | "filed")}>
          <TabsList className="mb-4">
            <TabsTrigger value="active" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Active ({activeRequests.length})
            </TabsTrigger>
            <TabsTrigger value="exempt" className="gap-2">
              <Shield className="h-4 w-4" />
              Exempt ({exemptRequests.length})
            </TabsTrigger>
            <TabsTrigger value="filed" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Filed ({filedRequests.length})
            </TabsTrigger>
          </TabsList>

          {/* Active Requests Tab */}
          <TabsContent value="active">
            <Card>
              <CardHeader>
                <CardTitle>Active Requests</CardTitle>
                <CardDescription>
                  Requests currently being processed
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No active requests</p>
                  </div>
                ) : (
                  <RequestsTable 
                    requests={activeRequests} 
                    router={router} 
                    formatPrice={formatPrice}
                    formatDate={formatDate}
                    formatTimeAgo={formatTimeAgo}
                    statusConfig={statusConfig}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Exempt Requests Tab */}
          <TabsContent value="exempt">
            <Card className="border-green-200">
              <CardHeader className="bg-green-50/50">
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <Shield className="h-5 w-5" />
                  Exempt Transactions
                </CardTitle>
                <CardDescription>
                  No FinCEN report required for these transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {exemptRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No exempt transactions yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead>Certificate</TableHead>
                        <TableHead>Exemption Reason</TableHead>
                        <TableHead>Determined</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exemptRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div className="font-medium">
                              {request.property_address?.street || "No address"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {request.property_address?.city}, {request.property_address?.state}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{request.buyer_name}</div>
                                <div className="text-xs text-muted-foreground capitalize">
                                  {request.buyer_type}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPrice(request.purchase_price_cents)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className="bg-green-50 text-green-700 border-green-200 font-mono text-xs cursor-pointer hover:bg-green-100"
                              onClick={() => openCertificate(request)}
                            >
                              {request.exemption_certificate_id?.slice(0, 16) || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {request.exemption_reasons_display && request.exemption_reasons_display.length > 0 ? (
                              <div className="text-sm text-green-700">
                                {request.exemption_reasons_display[0].display.slice(0, 40)}
                                {request.exemption_reasons_display[0].display.length > 40 ? "..." : ""}
                                {request.exemption_reasons_display.length > 1 && (
                                  <span className="text-xs text-muted-foreground">
                                    {" "}(+{request.exemption_reasons_display.length - 1} more)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatTimeAgo(request.determination_timestamp || request.created_at)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-green-700 border-green-300 hover:bg-green-50"
                              onClick={() => openCertificate(request)}
                            >
                              <Eye className="h-3 w-3" />
                              Certificate
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Filed Requests Tab */}
          <TabsContent value="filed">
            <Card className="border-green-200">
              <CardHeader className="bg-green-50/50">
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="h-5 w-5" />
                  Filed with FinCEN
                </CardTitle>
                <CardDescription>
                  Completed FinCEN filings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filedRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No filed reports yet</p>
                  </div>
                ) : (
                  <RequestsTable 
                    requests={filedRequests} 
                    router={router} 
                    formatPrice={formatPrice}
                    formatDate={formatDate}
                    formatTimeAgo={formatTimeAgo}
                    statusConfig={statusConfig}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Exemption Certificate Dialog */}
      <Dialog open={certificateDialogOpen} onOpenChange={setCertificateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-800">
              <Shield className="h-5 w-5" />
              Exemption Certificate
            </DialogTitle>
            <DialogDescription>
              Keep this certificate for your records
            </DialogDescription>
          </DialogHeader>
          {selectedCertificate && (
            <ExemptionCertificate data={selectedCertificate} showActions={true} />
          )}
        </DialogContent>
      </Dialog>

      {/* Help Section */}
      <Card className="mt-8 bg-muted/30">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3">Understanding Request Status</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {Object.entries(statusConfig).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <div key={key} className="flex items-start gap-3">
                  <Badge variant="outline" className={`mt-0.5 ${config.className}`}>
                    <Icon className="h-3 w-3" />
                  </Badge>
                  <div>
                    <span className="font-medium">{config.label}:</span>{" "}
                    <span className="text-muted-foreground">
                      {config.description}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper component for reusable table structure
function RequestsTable({
  requests,
  router,
  formatPrice,
  formatDate,
  formatTimeAgo,
  statusConfig,
}: {
  requests: SubmissionRequest[];
  router: ReturnType<typeof useRouter>;
  formatPrice: (cents: number) => string;
  formatDate: (dateString: string) => string;
  formatTimeAgo: (dateString: string) => string;
  statusConfig: typeof statusConfig;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Property</TableHead>
          <TableHead>Buyer</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead>Closing</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((request) => {
          const status = statusConfig[request.status] || statusConfig.pending;
          const StatusIcon = status.icon;

          return (
            <TableRow
              key={request.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/app/requests/${request.id}`)}
            >
              <TableCell>
                <div className="font-medium">
                  {request.property_address?.street || "No address"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {request.property_address?.city}, {request.property_address?.state}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{request.buyer_name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {request.buyer_type}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatPrice(request.purchase_price_cents)}
              </TableCell>
              <TableCell>
                {formatDate(request.expected_closing_date)}
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <Badge
                    variant="outline"
                    className={`flex items-center gap-1 w-fit ${status.className}`}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                  {/* Show party progress if in_progress and has parties */}
                  {request.status === "in_progress" && request.parties_total && request.parties_total > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{request.parties_submitted || 0}/{request.parties_total} parties</span>
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatTimeAgo(request.created_at)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/app/requests/${request.id}`);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
