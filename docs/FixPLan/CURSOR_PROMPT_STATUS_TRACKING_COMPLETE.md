# CURSOR PROMPT: End-to-End Status Tracking & Action Prominence

## 🦈 MISSION

Create complete status visibility across the entire workflow - from client submission through FinCEN filing - with every role able to track progress appropriately.

**Principle:** At ANY point, ANY user should be able to see exactly where a request/report stands.

---

## THE COMPLETE STATUS JOURNEY

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           COMPLETE STATUS LIFECYCLE                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CLIENT SUBMITS                                                                  │
│       ↓                                                                          │
│  ┌─────────────────┐                                                             │
│  │ SubmissionReq:  │  👤 Client sees: "Pending Review"                           │
│  │ status=pending  │  👔 Staff sees: Badge on "All Requests"                     │
│  └────────┬────────┘  👑 COO sees: In dashboard stats                            │
│           ↓                                                                      │
│  STAFF STARTS WIZARD                                                             │
│           ↓                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐                                        │
│  │ SubmissionReq:  │  │ Report:         │                                        │
│  │ status=         │  │ status=draft    │  👤 Client sees: "In Progress"         │
│  │ in_progress     │  │ wizard_step=1   │  👔 Staff sees: In "My Queue"          │
│  └────────┬────────┘  └────────┬────────┘  👑 COO sees: In dashboard stats       │
│           │                    ↓                                                 │
│           │           WIZARD PROGRESSES                                          │
│           │                    ↓                                                 │
│           │           ┌─────────────────┐                                        │
│           │           │ Report:         │                                        │
│           │           │ status=draft    │  Track wizard progress:                │
│           │           │ wizard_step=3   │  - Determination: ✅                   │
│           │           │ phase=collection│  - Collection: 🔄                      │
│           │           └────────┬────────┘  - Parties: ⏳                         │
│           │                    ↓                                                 │
│           │           PARTY LINKS SENT                                           │
│           │                    ↓                                                 │
│           │           ┌─────────────────┐                                        │
│           │           │ Report:         │                                        │
│           │           │ status=         │  👤 Client sees: "Collecting Info"     │
│           │           │ collecting      │  👔 Staff sees: Party progress         │
│           │           └────────┬────────┘  🧑 Parties see: Their portal          │
│           │                    ↓                                                 │
│           │           ┌─────────────────┐                                        │
│           │           │ ReportParty:    │  Track EACH party:                     │
│           │           │ Buyer 1: ✅     │  - Link sent: ✅                       │
│           │           │ Buyer 2: 🔄     │  - Opened: ✅                          │
│           │           │ Seller 1: ⏳    │  - Submitted: 🔄                       │
│           │           └────────┬────────┘                                        │
│           │                    ↓                                                 │
│           │           ALL PARTIES COMPLETE                                       │
│           │                    ↓                                                 │
│           │           ┌─────────────────┐                                        │
│           │           │ Report:         │  👤 Client sees: "Ready for Filing"    │
│           │           │ status=         │  👔 Staff sees: "Review" button        │
│           │           │ ready_to_file   │  👑 COO sees: Ready count              │
│           │           └────────┬────────┘                                        │
│           │                    ↓                                                 │
│           │           STAFF FILES TO FINCEN                                      │
│           ↓                    ↓                                                 │
│  ┌─────────────────┐  ┌─────────────────┐                                        │
│  │ SubmissionReq:  │  │ Report:         │  👤 Client sees: "Completed" ✅        │
│  │ status=         │  │ status=filed    │  👔 Staff sees: In "Filed" list        │
│  │ completed  ←────┼──┤ receipt_id=XXX  │  👑 COO sees: Filing stats             │
│  └─────────────────┘  └─────────────────┘                                        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## PART 1: FIX STATUS SYNC - SubmissionRequest ↔ Report

### 1A: Update SubmissionRequest to "completed" When Report Filed

**File:** `api/app/routes/reports.py`

Find the `file_report` endpoint and add:

```python
@router.post("/{report_id}/file")
async def file_report(
    report_id: str,
    db: Session = Depends(get_db),
):
    """File the report to FinCEN."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # ... existing filing logic ...
    
    # After successful filing:
    if outcome == "accepted":
        report.status = "filed"
        report.filed_at = datetime.utcnow()
        report.receipt_id = receipt_id
        
        # =================================================================
        # NEW: Update linked SubmissionRequest to "completed"
        # =================================================================
        if report.submission_request_id:
            submission = db.query(SubmissionRequest).filter(
                SubmissionRequest.id == report.submission_request_id
            ).first()
            if submission:
                submission.status = "completed"
                submission.updated_at = datetime.utcnow()
                # Optionally store the receipt ID on submission too
                # submission.receipt_id = receipt_id
        
        # Create billing event...
        
    db.commit()
```

### 1B: Update SubmissionRequest When Report Becomes Exempt

**File:** `api/app/routes/reports.py`

In the determination endpoint:

```python
@router.post("/{report_id}/determine")
async def determine_report(
    report_id: str,
    # ...
):
    # ... determination logic ...
    
    if is_reportable:
        report.status = "determination_complete"
    else:
        report.status = "exempt"
        
        # =================================================================
        # NEW: Update linked SubmissionRequest when exempt
        # =================================================================
        if report.submission_request_id:
            submission = db.query(SubmissionRequest).filter(
                SubmissionRequest.id == report.submission_request_id
            ).first()
            if submission:
                submission.status = "completed"  # Or "exempt" if you want a separate status
                submission.updated_at = datetime.utcnow()
    
    db.commit()
```

---

## PART 2: EXPAND MY QUEUE TO SHOW ALL ACTIVE WORK

### 2A: Update Queue API to Accept Multiple Statuses

**File:** `api/app/routes/reports.py`

Find or create the queue endpoint:

```python
@router.get("/queue/with-parties")
async def get_queue_with_parties(
    status: Optional[str] = None,  # Make optional
    statuses: Optional[str] = None,  # NEW: Comma-separated list
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
):
    """
    Get reports in the work queue with party status.
    Can filter by single status or multiple statuses.
    """
    query = db.query(Report)
    
    # Filter by status(es)
    if statuses:
        # Support comma-separated: "draft,collecting,ready_to_file"
        status_list = [s.strip() for s in statuses.split(",")]
        query = query.filter(Report.status.in_(status_list))
    elif status:
        query = query.filter(Report.status == status)
    else:
        # Default: Show all active work (not filed, not exempt)
        query = query.filter(Report.status.in_([
            "draft", 
            "determination_complete", 
            "collecting", 
            "ready_to_file"
        ]))
    
    # Order by urgency: ready_to_file first, then by deadline
    query = query.order_by(
        # Priority order
        case(
            (Report.status == "ready_to_file", 1),
            (Report.status == "collecting", 2),
            (Report.status == "draft", 3),
            else_=4
        ),
        Report.filing_deadline.asc().nullslast()
    )
    
    reports = query.limit(limit).all()
    
    # ... build response with party status ...
```

### 2B: Update My Queue Frontend with Tabs

**File:** `web/app/(app)/app/staff/queue/page.tsx`

Replace single fetch with tabbed view:

```tsx
"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Play,
  Eye,
  CheckCircle,
  Clock,
  Users,
  FileText,
  AlertTriangle,
  Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format, differenceInDays } from "date-fns";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface QueueReport {
  id: string;
  property_address_text: string;
  escrow_number: string | null;
  status: string;
  wizard_step: number;
  filing_deadline: string | null;
  created_at: string;
  party_count: number;
  parties_complete: number;
  all_parties_complete: boolean;
  submission_request_id: string | null;
}

interface QueueCounts {
  needs_setup: number;
  collecting: number;
  ready: number;
  total: number;
}

const statusConfig = {
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

export default function MyQueuePage() {
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

  const fetchQueue = async () => {
    setLoading(true);
    try {
      // Fetch all active reports
      const response = await fetch(
        `${API_BASE_URL}/reports/queue/with-parties?statuses=draft,determination_complete,collecting,ready_to_file&limit=100`
      );
      
      if (response.ok) {
        const data = await response.json();
        const items = data.reports || data || [];
        setReports(items);
        
        // Calculate counts
        setCounts({
          needs_setup: items.filter((r: QueueReport) => 
            r.status === "draft" || r.status === "determination_complete"
          ).length,
          collecting: items.filter((r: QueueReport) => r.status === "collecting").length,
          ready: items.filter((r: QueueReport) => r.status === "ready_to_file").length,
          total: items.length,
        });
      }
    } catch (error) {
      console.error("Failed to fetch queue:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Poll every 30 seconds
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const handleAction = (report: QueueReport) => {
    router.push(`/app/reports/${report.id}/wizard`);
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
          <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction(report)}>
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

  const getDaysUntilDeadline = (deadline: string | null) => {
    if (!deadline) return null;
    return differenceInDays(new Date(deadline), new Date());
  };

  const filteredReports = getFilteredReports();

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Queue</h1>
        <p className="text-muted-foreground mt-1">
          Track and manage your assigned reports
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card className="cursor-pointer hover:bg-slate-50" onClick={() => setActiveTab("all")}>
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
          className={`cursor-pointer hover:bg-slate-50 ${counts.needs_setup > 0 ? 'border-amber-300 bg-amber-50' : ''}`}
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
        
        <Card className="cursor-pointer hover:bg-slate-50" onClick={() => setActiveTab("collecting")}>
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
          className={`cursor-pointer hover:bg-slate-50 ${counts.ready > 0 ? 'border-green-300 bg-green-50' : ''}`}
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
              <Badge className="ml-2 bg-amber-500">{counts.needs_setup}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="collecting">
            Collecting ({counts.collecting})
          </TabsTrigger>
          <TabsTrigger value="ready" className="relative">
            Ready to File
            {counts.ready > 0 && (
              <Badge className="ml-2 bg-green-500">{counts.ready}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading...
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No reports in this category</p>
                </div>
              ) : (
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
                      const isUrgent = daysLeft !== null && daysLeft <= 5;
                      const config = statusConfig[report.status as keyof typeof statusConfig];
                      
                      return (
                        <TableRow 
                          key={report.id}
                          className={isUrgent ? "bg-red-50" : ""}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{report.property_address_text}</p>
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
                            {report.status === "collecting" ? (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                                  <span className="text-sm">
                                    {report.parties_complete}/{report.party_count}
                                  </span>
                                </div>
                                {report.all_parties_complete && (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                            ) : report.status === "draft" ? (
                              <span className="text-sm text-muted-foreground">
                                Step {report.wizard_step}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {report.filing_deadline ? (
                              <div className={`flex items-center gap-1 ${isUrgent ? 'text-red-600 font-medium' : ''}`}>
                                {isUrgent && <AlertTriangle className="h-4 w-4" />}
                                <span>{format(new Date(report.filing_deadline), "MMM d")}</span>
                                {daysLeft !== null && (
                                  <span className="text-xs">
                                    ({daysLeft}d)
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
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## PART 3: ADD INLINE "START WIZARD" BUTTON IN ALL REQUESTS

**File:** `web/app/(app)/app/admin/requests/page.tsx`

Add action buttons directly in the table:

```tsx
// In the table row for each request:
<TableCell className="text-right">
  <div className="flex items-center justify-end gap-2">
    {/* PRIMARY ACTION based on status */}
    {request.status === "pending" && (
      <Button 
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          handleStartWizard(request.id);
        }}
      >
        <Play className="h-3 w-3 mr-1" />
        Start Wizard
      </Button>
    )}
    
    {request.status === "in_progress" && request.report_id && (
      <Button 
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/app/reports/${request.report_id}/wizard`);
        }}
      >
        <ArrowRight className="h-3 w-3 mr-1" />
        Continue
      </Button>
    )}
    
    {/* SECONDARY: View details */}
    <Button 
      size="sm" 
      variant="ghost"
      onClick={(e) => {
        e.stopPropagation();
        setSelectedRequest(request);
        setSheetOpen(true);
      }}
    >
      <Eye className="h-3 w-3" />
    </Button>
  </div>
</TableCell>
```

---

## PART 4: ENHANCE CLIENT REQUEST VIEW WITH DETAILED STATUS

**File:** `web/app/(app)/app/requests/page.tsx`

Show clients MORE detail about where their request stands:

```tsx
const getStatusDetails = (request: SubmissionRequest) => {
  switch (request.status) {
    case "pending":
      return {
        label: "Pending Review",
        description: "Your request has been received and is awaiting review by our team.",
        icon: Clock,
        color: "text-amber-600",
        bgColor: "bg-amber-50",
      };
    case "in_progress":
      return {
        label: "In Progress",
        description: "Our team is actively processing your request. We'll notify you when we need information from the transaction parties.",
        icon: RefreshCw,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        // Show sub-status if we have report info
        subStatus: request.report_status === "collecting" 
          ? "Currently collecting information from buyers and sellers"
          : request.report_status === "ready_to_file"
          ? "All information collected, preparing for filing"
          : null,
      };
    case "completed":
      return {
        label: "Completed",
        description: "Your FinCEN report has been filed successfully.",
        icon: CheckCircle,
        color: "text-green-600",
        bgColor: "bg-green-50",
        receiptId: request.receipt_id,
      };
    case "cancelled":
      return {
        label: "Cancelled",
        description: "This request has been cancelled.",
        icon: XCircle,
        color: "text-slate-600",
        bgColor: "bg-slate-50",
      };
    default:
      return {
        label: request.status,
        description: "",
        icon: FileText,
        color: "text-slate-600",
        bgColor: "bg-slate-50",
      };
  }
};

// In the render, show expanded status:
{requests.map((request) => {
  const statusInfo = getStatusDetails(request);
  const StatusIcon = statusInfo.icon;
  
  return (
    <Card key={request.id} className={`${statusInfo.bgColor} border-l-4 ${statusInfo.color.replace('text-', 'border-')}`}>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
              <span className={`font-semibold ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            <h3 className="font-medium">{request.property_address_text}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {statusInfo.description}
            </p>
            {statusInfo.subStatus && (
              <p className="text-sm text-blue-600 mt-2 flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                {statusInfo.subStatus}
              </p>
            )}
            {statusInfo.receiptId && (
              <p className="text-sm text-green-600 mt-2 font-mono">
                Receipt: {statusInfo.receiptId}
              </p>
            )}
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Submitted {format(new Date(request.created_at), "MMM d, yyyy")}</p>
            {request.escrow_number && (
              <p className="font-mono">{request.escrow_number}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
})}
```

---

## PART 5: ADD REPORT STATUS TO SUBMISSION REQUEST API

**File:** `api/app/routes/submission_requests.py`

When listing submissions, include the linked report's status:

```python
@router.get("")
async def list_submission_requests(
    # ... params ...
    db: Session = Depends(get_db),
):
    # ... query logic ...
    
    result = []
    for submission in submissions:
        # Get linked report if exists
        report = None
        report_status = None
        if submission.id:
            report = db.query(Report).filter(
                Report.submission_request_id == submission.id
            ).first()
            if report:
                report_status = report.status
        
        result.append({
            "id": str(submission.id),
            "status": submission.status,
            # ... other fields ...
            
            # NEW: Include report info for richer status display
            "report_id": str(report.id) if report else None,
            "report_status": report_status,
            "receipt_id": report.receipt_id if report and report.status == "filed" else None,
        })
    
    return {"submissions": result, "total": total}
```

---

## PART 6: COO/EXECUTIVE DASHBOARD STATUS OVERVIEW

**File:** `web/app/(app)/app/executive/page.tsx`

Ensure the executive dashboard shows complete status breakdown:

```tsx
// Status breakdown cards
<div className="grid grid-cols-5 gap-4 mb-8">
  <Card>
    <CardContent className="pt-6 text-center">
      <p className="text-3xl font-bold text-amber-600">{stats.pending_requests}</p>
      <p className="text-sm text-muted-foreground">Pending</p>
    </CardContent>
  </Card>
  <Card>
    <CardContent className="pt-6 text-center">
      <p className="text-3xl font-bold text-blue-600">{stats.in_progress}</p>
      <p className="text-sm text-muted-foreground">In Progress</p>
    </CardContent>
  </Card>
  <Card>
    <CardContent className="pt-6 text-center">
      <p className="text-3xl font-bold text-purple-600">{stats.collecting}</p>
      <p className="text-sm text-muted-foreground">Collecting</p>
    </CardContent>
  </Card>
  <Card>
    <CardContent className="pt-6 text-center">
      <p className="text-3xl font-bold text-green-600">{stats.ready_to_file}</p>
      <p className="text-sm text-muted-foreground">Ready to File</p>
    </CardContent>
  </Card>
  <Card>
    <CardContent className="pt-6 text-center">
      <p className="text-3xl font-bold text-emerald-600">{stats.filed_this_month}</p>
      <p className="text-sm text-muted-foreground">Filed (MTD)</p>
    </CardContent>
  </Card>
</div>
```

---

## PART 7: PARTY STATUS VISIBILITY

Ensure party submission status is visible at all levels:

### 7A: API - Include Party Progress

**File:** `api/app/routes/reports.py`

```python
def get_party_progress(report_id: str, db: Session) -> dict:
    """Get party submission progress for a report."""
    parties = db.query(ReportParty).filter(
        ReportParty.report_id == report_id
    ).all()
    
    total = len(parties)
    submitted = len([p for p in parties if p.status == "submitted"])
    
    return {
        "total_parties": total,
        "submitted_count": submitted,
        "all_complete": total > 0 and submitted == total,
        "parties": [
            {
                "id": str(p.id),
                "role": p.role,
                "name": p.party_data.get("name", "Unknown") if p.party_data else "Unknown",
                "email": p.party_data.get("email", "") if p.party_data else "",
                "status": p.status,
                "link_sent_at": p.link_sent_at.isoformat() if p.link_sent_at else None,
                "submitted_at": p.submitted_at.isoformat() if p.submitted_at else None,
            }
            for p in parties
        ]
    }
```

### 7B: Frontend - Show Party Progress in Queue

Already included in Part 2's queue table - the `{report.parties_complete}/{report.party_count}` display.

---

## VERIFICATION CHECKLIST

### Status Sync
- [ ] When report filed → SubmissionRequest becomes "completed"
- [ ] When report exempt → SubmissionRequest becomes "completed" 
- [ ] Client sees "Completed" status after filing
- [ ] Receipt ID visible to client after filing

### My Queue
- [ ] Shows ALL active statuses (draft, collecting, ready_to_file)
- [ ] Tabs filter by status category
- [ ] Stats cards show accurate counts
- [ ] Urgent items highlighted (≤5 days to deadline)
- [ ] Correct action button per status

### All Requests
- [ ] "Start Wizard" button visible inline for pending
- [ ] "Continue" button visible for in_progress
- [ ] No need to open sheet for primary action

### Client View
- [ ] Detailed status descriptions
- [ ] Sub-status shows when collecting
- [ ] Receipt ID shows when filed
- [ ] Progress indicator for in-progress

### Executive Dashboard
- [ ] Full pipeline visibility
- [ ] Counts by status accurate
- [ ] Real-time data

### Party Tracking
- [ ] Party count visible in queue
- [ ] Individual party status trackable
- [ ] "All complete" indicator works

---

## UPDATE KILLEDSHARKS.MD

```markdown
---

### 25. End-to-End Status Tracking & Action Prominence ✅

**Problem:** Status visibility was incomplete and inconsistent:
- SubmissionRequest never became "completed" when filed
- My Queue only showed "collecting" reports (missed draft)
- "Start Wizard" required 2 clicks (buried in sheet)
- Clients couldn't see detailed progress
- No urgency indicators for approaching deadlines

**Solution:**

**1. Status Sync - SubmissionRequest ↔ Report**
- Filing a report → SubmissionRequest = "completed"
- Exempt determination → SubmissionRequest = "completed"
- Report status included in submission API response

**2. Expanded My Queue**
- Shows ALL active statuses: draft, collecting, ready_to_file
- Tabbed interface for filtering
- Stats cards with counts
- Urgency indicators (red highlight for ≤5 days)
- Correct action button per status:
  - Draft → "Continue Setup"
  - Collecting → "View Progress" / "Review"
  - Ready → "Review & File"

**3. Inline Action Buttons**
- "Start Wizard" visible in table row (no sheet needed)
- "Continue" visible for in-progress items
- Primary actions are PRIMARY buttons

**4. Enhanced Client View**
- Detailed status descriptions
- Sub-status when collecting party info
- Receipt ID displayed when filed
- Visual progress indicators

**5. Complete Status Lifecycle**
```
SubmissionRequest: pending → in_progress → completed
Report: draft → collecting → ready_to_file → filed
                    ↑
            Parties: sent → submitted
```

**Files Changed:**
- `api/app/routes/reports.py` (status sync on filing)
- `api/app/routes/submission_requests.py` (include report_status)
- `web/app/(app)/app/staff/queue/page.tsx` (expanded queue)
- `web/app/(app)/app/admin/requests/page.tsx` (inline buttons)
- `web/app/(app)/app/requests/page.tsx` (client status detail)

**Status:** ✅ Killed

---

### Updated Shark Count: 26 🦈
```

---

## SUMMARY

| Fix | What | Impact |
|-----|------|--------|
| **Status Sync** | Update SubmissionRequest when Report filed/exempt | Client sees completion |
| **Queue Expansion** | Show all active statuses with tabs | Staff sees all work |
| **Inline Buttons** | Primary actions in table row | 1-click workflow |
| **Client Detail** | Rich status descriptions | Better client experience |
| **Urgency Indicators** | Highlight approaching deadlines | Prevent missed filings |
| **Party Progress** | Show X/Y submitted | Track collection status |

**Everyone can now track status end-to-end: Client → Staff → Admin → COO** 🎯
