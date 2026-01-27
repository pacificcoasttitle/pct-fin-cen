"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
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
  DollarSign,
  FileText,
  Home,
  Mail,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar,
} from "lucide-react";

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
    icon: Clock,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
  },
  in_progress: {
    label: "In Progress",
    icon: RefreshCw,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  cancelled: {
    label: "Cancelled",
    icon: AlertCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
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

  const formatDate = (dateString: string, options?: Intl.DateTimeFormatOptions) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", options || {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "N/A";
    }
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
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => router.push("/app/requests")}
            >
              Back to My Requests
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusConfig[request.status] || statusConfig.pending;
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
            {request.property_address?.street || "Property Request"}
          </h1>
          <p className="text-muted-foreground">
            {request.property_address?.city}, {request.property_address?.state}{" "}
            {request.property_address?.zip}
          </p>
        </div>
        <div className={`p-4 rounded-lg ${status.bg} ${status.border} border`}>
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
              <p className="font-medium">{request.property_address?.street}</p>
              <p>
                {request.property_address?.city}, {request.property_address?.state}{" "}
                {request.property_address?.zip}
              </p>
              {request.property_address?.county && (
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
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {formatDate(request.expected_closing_date)}
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
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
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
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  request.status === "in_progress" || request.status === "completed"
                    ? "bg-green-100"
                    : "bg-muted"
                }`}
              >
                {request.status === "in_progress" || request.status === "completed" ? (
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
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
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
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
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
        Submitted {formatDateTime(request.created_at)}
        {request.updated_at !== request.created_at && (
          <> • Last updated {formatDateTime(request.updated_at)}</>
        )}
      </div>
    </div>
  );
}
