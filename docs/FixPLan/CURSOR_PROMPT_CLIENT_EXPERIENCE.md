# CURSOR PROMPT: Complete Client Experience & Proactive Bug Prevention

## MISSION

We're shark hunters. We don't just fix bugs - we anticipate them and kill them before they bite.

**Current Gap Found:** Client submits request but has NO visibility into their submissions.

**This prompt:** Fixes the gap AND proactively addresses related issues before they surface.

---

## PART 1: Client "My Requests" Dashboard

### The Problem

After a client submits a request, they see a success message... and then nothing. No way to:
- View their submitted requests
- Check status updates
- See what happens next

**This is unacceptable for a professional compliance platform.**

### The Solution

Create a full client requests dashboard at `/app/requests`.

**File:** `web/app/(app)/app/requests/page.tsx`

```tsx
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
  Plus,
  RefreshCw,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  MoreHorizontal,
  ArrowUpRight,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface SubmissionRequest {
  id: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  property_address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  purchase_price_cents: number;
  expected_closing_date: string;
  buyer_name: string;
  buyer_type: string;
  seller_name: string;
  created_at: string;
  updated_at: string;
  report_id?: string;
}

const statusConfig = {
  pending: {
    label: "Pending Review",
    variant: "secondary" as const,
    icon: Clock,
    description: "Waiting for PCT staff to begin processing",
  },
  in_progress: {
    label: "In Progress",
    variant: "default" as const,
    icon: RefreshCw,
    description: "PCT staff is processing your request",
  },
  completed: {
    label: "Completed",
    variant: "success" as const,
    icon: CheckCircle2,
    description: "Filing has been submitted to FinCEN",
  },
  cancelled: {
    label: "Cancelled",
    variant: "destructive" as const,
    icon: AlertCircle,
    description: "This request has been cancelled",
  },
};

export default function ClientRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<SubmissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/submission-requests/my-requests`,
        {
          headers: {
            // Include auth headers when auth is implemented
            // "Authorization": `Bearer ${token}`,
          },
        }
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

  const formatAddress = (addr: SubmissionRequest["property_address"]) => {
    return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`;
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{requests.length}</div>
            <p className="text-xs text-muted-foreground">Total Requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {requests.filter((r) => r.status === "pending").length}
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
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {requests.filter((r) => r.status === "completed").length}
            </div>
            <p className="text-xs text-muted-foreground">Completed</p>
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

      {/* Requests Table */}
      {!loading && requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Submission History</CardTitle>
            <CardDescription>
              Click on a request to view details
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  const status = statusConfig[request.status];
                  const StatusIcon = status.icon;

                  return (
                    <TableRow
                      key={request.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/app/requests/${request.id}`)}
                    >
                      <TableCell>
                        <div className="font-medium">
                          {request.property_address.street}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {request.property_address.city},{" "}
                          {request.property_address.state}
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
                        {format(new Date(request.expected_closing_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={status.variant}
                          className="flex items-center gap-1 w-fit"
                        >
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(request.created_at), {
                          addSuffix: true,
                        })}
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
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="mt-8 bg-muted/30">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3">Understanding Request Status</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {Object.entries(statusConfig).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <div key={key} className="flex items-start gap-3">
                  <Badge variant={config.variant} className="mt-0.5">
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
```

---

## PART 2: Client Request Detail Page

**File:** `web/app/(app)/app/requests/[id]/page.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Home,
  Mail,
  MapPin,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

interface SubmissionRequest {
  id: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  property_address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    county?: string;
  };
  purchase_price_cents: number;
  expected_closing_date: string;
  escrow_number?: string;
  financing_type: string;
  buyer_name: string;
  buyer_email: string;
  buyer_type: string;
  seller_name: string;
  seller_email?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  report_id?: string;
  filing_receipt_id?: string;
}

const statusConfig = {
  pending: {
    label: "Pending Review",
    variant: "secondary" as const,
    icon: Clock,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
  },
  in_progress: {
    label: "In Progress",
    variant: "default" as const,
    icon: RefreshCw,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  completed: {
    label: "Completed",
    variant: "success" as const,
    icon: CheckCircle2,
    color: "text-green-600",
    bg: "bg-green-50",
  },
  cancelled: {
    label: "Cancelled",
    variant: "destructive" as const,
    icon: AlertCircle,
    color: "text-red-600",
    bg: "bg-red-50",
  },
};

export default function ClientRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [request, setRequest] = useState<SubmissionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/submission-requests/${params.id}`
        );

        if (!response.ok) {
          throw new Error("Request not found");
        }

        const data = await response.json();
        setRequest(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [params.id]);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Skeleton className="h-8 w-48 mb-8" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card className="border-destructive">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-semibold">Request Not Found</h3>
            <p className="text-muted-foreground mt-2">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusConfig[request.status];
  const StatusIcon = status.icon;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push("/app/requests")}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to My Requests
      </Button>

      {/* Header with Status */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">
            {request.property_address.street}
          </h1>
          <p className="text-muted-foreground">
            {request.property_address.city}, {request.property_address.state}{" "}
            {request.property_address.zip}
          </p>
        </div>
        <div className={`p-4 rounded-lg ${status.bg}`}>
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${status.color}`} />
            <span className={`font-semibold ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>
      </div>

      {/* Filing Receipt (if completed) */}
      {request.status === "completed" && request.filing_receipt_id && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-800">
                  FinCEN Filing Complete
                </h3>
                <p className="text-sm text-green-600">
                  Receipt ID: <span className="font-mono">{request.filing_receipt_id}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Home className="h-5 w-5" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Address</label>
              <p className="font-medium">{request.property_address.street}</p>
              <p>
                {request.property_address.city}, {request.property_address.state}{" "}
                {request.property_address.zip}
              </p>
              {request.property_address.county && (
                <p className="text-sm text-muted-foreground">
                  {request.property_address.county} County
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transaction Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5" />
              Transaction Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Purchase Price</span>
              <span className="font-semibold">
                {formatPrice(request.purchase_price_cents)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Closing Date</span>
              <span>
                {format(new Date(request.expected_closing_date), "MMMM d, yyyy")}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Financing</span>
              <Badge variant="outline" className="capitalize">
                {request.financing_type}
              </Badge>
            </div>
            {request.escrow_number && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Escrow #</span>
                  <span className="font-mono">{request.escrow_number}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Buyer Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Buyer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{request.buyer_name}</span>
              <Badge variant="secondary" className="capitalize">
                {request.buyer_type}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{request.buyer_email}</span>
            </div>
          </CardContent>
        </Card>

        {/* Seller Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Seller
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{request.seller_name}</span>
            </div>
            {request.seller_email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{request.seller_email}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {request.notes && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {request.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Timeline / What's Next */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>What Happens Next?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  request.status !== "pending" ? "bg-green-100" : "bg-primary"
                }`}
              >
                {request.status !== "pending" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <span className="text-sm text-white font-bold">1</span>
                )}
              </div>
              <div>
                <h4 className="font-medium">Request Submitted</h4>
                <p className="text-sm text-muted-foreground">
                  Your request has been received and is in our queue.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  request.status === "in_progress" || request.status === "completed"
                    ? "bg-green-100"
                    : "bg-muted"
                }`}
              >
                {request.status === "in_progress" ||
                request.status === "completed" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <span className="text-sm text-muted-foreground font-bold">2</span>
                )}
              </div>
              <div>
                <h4 className="font-medium">Compliance Review</h4>
                <p className="text-sm text-muted-foreground">
                  PCT staff determines if FinCEN reporting is required.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  request.status === "completed" ? "bg-green-100" : "bg-muted"
                }`}
              >
                {request.status === "completed" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <span className="text-sm text-muted-foreground font-bold">3</span>
                )}
              </div>
              <div>
                <h4 className="font-medium">Information Collection</h4>
                <p className="text-sm text-muted-foreground">
                  Buyer and seller complete secure forms with required details.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  request.status === "completed" ? "bg-green-100" : "bg-muted"
                }`}
              >
                {request.status === "completed" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <span className="text-sm text-muted-foreground font-bold">4</span>
                )}
              </div>
              <div>
                <h4 className="font-medium">FinCEN Filing</h4>
                <p className="text-sm text-muted-foreground">
                  Report is submitted to FinCEN and receipt is generated.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timestamps */}
      <div className="mt-6 text-sm text-muted-foreground text-center">
        Submitted {format(new Date(request.created_at), "MMMM d, yyyy 'at' h:mm a")}
        {request.updated_at !== request.created_at && (
          <> • Last updated {format(new Date(request.updated_at), "MMMM d, yyyy 'at' h:mm a")}</>
        )}
      </div>
    </div>
  );
}
```

---

## PART 3: API Endpoint for Client's Own Requests

**File:** `api/app/routes/submission_requests.py`

Add this endpoint:

```python
@router.get("/my-requests", response_model=List[SubmissionRequestResponse])
async def get_my_requests(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user),  # When auth is implemented
):
    """
    Get all submission requests for the current user/company.
    For demo purposes, returns all requests for the demo company.
    """
    # When auth is implemented:
    # requests = db.query(SubmissionRequest).filter(
    #     SubmissionRequest.company_id == current_user.company_id
    # ).order_by(SubmissionRequest.created_at.desc()).all()
    
    # For demo - get demo company's requests
    demo_company = db.query(Company).filter(Company.code == "DEMO").first()
    if not demo_company:
        return []
    
    requests = db.query(SubmissionRequest).filter(
        SubmissionRequest.company_id == demo_company.id
    ).order_by(SubmissionRequest.created_at.desc()).all()
    
    return requests
```

---

## PART 4: Enhanced Success Page After Submission

**File:** `web/app/(app)/app/requests/new/page.tsx`

Update the success state to be more informative:

```tsx
// In the success state section of the form:

{isSuccess && (
  <Card className="border-green-200 bg-green-50">
    <CardContent className="pt-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-green-800 mb-2">
          Request Submitted Successfully!
        </h2>
        <p className="text-green-600 mb-4">
          Your compliance request has been received.
        </p>
        
        <div className="bg-white rounded-lg p-4 mb-6 inline-block">
          <p className="text-sm text-muted-foreground">Request ID</p>
          <p className="font-mono text-lg font-bold">{requestId}</p>
        </div>
        
        <div className="space-y-2 text-left max-w-md mx-auto mb-6">
          <h4 className="font-semibold text-green-800">What happens next?</h4>
          <ul className="text-sm text-green-700 space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <span>PCT staff will review your submission within 1 business day</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Buyer and seller will receive secure links to provide required information</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <span>You can track progress in your dashboard anytime</span>
            </li>
          </ul>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => router.push("/app/requests")}
          >
            <FileText className="h-4 w-4 mr-2" />
            View My Requests
          </Button>
          <Button
            onClick={() => {
              setIsSuccess(false);
              setRequestId(null);
              setFormData(initialFormData);
              setCurrentStep(1);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Submit Another Request
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

---

## PART 5: Navigation Update

**File:** `web/components/app-sidebar.tsx` (or wherever navigation is defined)

Ensure clients can see "My Requests" in their sidebar:

```tsx
// In the navigation items for client users:
{
  title: "My Requests",
  url: "/app/requests",
  icon: FileText,
},
{
  title: "New Request",
  url: "/app/requests/new",
  icon: Plus,
},
```

---

## PART 6: Proactive Bug Prevention

### 6.1 Add Date Formatting Safety

**File:** `web/lib/utils.ts`

```typescript
// Safe date formatting that won't crash on invalid dates
export function safeFormatDate(
  date: string | Date | null | undefined,
  formatStr: string = "MMM d, yyyy"
): string {
  if (!date) return "N/A";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "Invalid date";
    return format(d, formatStr);
  } catch {
    return "Invalid date";
  }
}

// Safe price formatting
export function formatCentsToUSD(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
```

### 6.2 Add Error Boundary for Client Pages

**File:** `web/app/(app)/app/requests/error.tsx`

```tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function RequestsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Requests page error:", error);
  }, [error]);

  return (
    <div className="container max-w-2xl mx-auto py-16 px-4">
      <Card className="border-destructive">
        <CardContent className="pt-8 pb-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-6">
            We encountered an error loading your requests.
          </p>
          <Button onClick={reset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 6.3 Add Loading State

**File:** `web/app/(app)/app/requests/loading.tsx`

```tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function RequestsLoading() {
  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-12 mb-2" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-48" />
                <Skeleton className="h-12 w-32" />
                <Skeleton className="h-12 w-24" />
                <Skeleton className="h-12 w-24" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## PART 7: Update KilledSharks.md

Add this entry:

```markdown
---

### 12. Client Request Visibility ✅

**Problem Found During Testing:** Client submits a request, sees success message, but then has NO way to:
- View their submitted requests
- Check status of requests
- Track progress through the workflow

**Impact:** Clients submit into a black hole. Unprofessional for a compliance platform.

**Solution - Complete Client Experience:**

1. **My Requests Dashboard** (`/app/requests`)
   - Table view of all client submissions
   - Stats cards (total, pending, in progress, completed)
   - Status badges with icons
   - Click to view details
   - Auto-refresh every 60 seconds
   - Empty state with CTA

2. **Request Detail Page** (`/app/requests/[id]`)
   - Full submission details
   - Visual status indicator
   - Filing receipt (when completed)
   - "What happens next?" timeline
   - Professional, polished UI

3. **API Endpoint** (`GET /submission-requests/my-requests`)
   - Returns requests for current user's company
   - Sorted by most recent first
   - Ready for auth integration

4. **Enhanced Success Page**
   - Clear request ID display
   - "What happens next" explanation
   - Links to dashboard
   - Option to submit another

5. **Proactive Bug Prevention**
   - Error boundary for graceful failures
   - Loading states
   - Safe date/price formatting utilities
   - Navigation updates

**Files Created:**
- `web/app/(app)/app/requests/page.tsx` (client dashboard)
- `web/app/(app)/app/requests/[id]/page.tsx` (detail view)
- `web/app/(app)/app/requests/error.tsx` (error boundary)
- `web/app/(app)/app/requests/loading.tsx` (loading state)

**Files Modified:**
- `api/app/routes/submission_requests.py` (my-requests endpoint)
- `web/app/(app)/app/requests/new/page.tsx` (enhanced success)
- `web/components/app-sidebar.tsx` (navigation)
- `web/lib/utils.ts` (formatting utilities)

**Test:**
1. Submit a new request → See enhanced success page
2. Click "View My Requests" → See dashboard with submission
3. Click on request → See full details with timeline
4. Submit another → Both appear in dashboard

**Status:** ✅ Killed

---

## Summary Update

| Category | Count |
|----------|-------|
| 🔴 Critical Fixes | 6 |
| 🟠 Major Features | 6 |
| 📄 Documentation | 3 |
| 🎨 UX Improvements | 2 |

**Total Sharks Killed: 17** 🦈
```

---

## VERIFICATION CHECKLIST

After implementing:

- [ ] `/app/requests` shows client dashboard
- [ ] Dashboard displays submitted requests
- [ ] Stats cards show correct counts
- [ ] Clicking row navigates to detail page
- [ ] Detail page shows all submission info
- [ ] "What happens next" timeline displays
- [ ] Empty state shows when no requests
- [ ] Error boundary catches failures gracefully
- [ ] Loading states appear during fetch
- [ ] Success page shows request ID and next steps
- [ ] Navigation includes "My Requests" link

---

## TESTING SEQUENCE

1. **Submit fresh request** → Verify enhanced success page
2. **Click "View My Requests"** → Verify dashboard loads
3. **Check table** → Verify submission appears
4. **Click row** → Verify detail page loads
5. **Refresh page** → Verify data persists
6. **Submit second request** → Verify both appear
7. **Check auto-refresh** → Wait 60s, verify updates

---

**This is shark hunting done right. Professional. Complete. Proactive.** 🦈🔱
