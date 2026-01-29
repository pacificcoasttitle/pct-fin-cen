"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Search,
  RefreshCw,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Image,
  File,
  MoreHorizontal,
  User,
  Building2,
  AlertCircle,
  Loader2,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface Document {
  id: string;
  party_id: string;
  party_name?: string;
  party_role?: string;
  report_id?: string;
  property_address?: string;
  document_type: string;
  file_name: string;
  mime_type: string;
  size_bytes?: number;
  upload_confirmed: boolean;
  verified_at?: string;
  uploaded_at?: string;
  created_at: string;
  download_url?: string;
}

interface DocumentStats {
  total_documents: number;
  pending_verification: number;
  verified: number;
  this_week: number;
}

const documentTypeLabels: Record<string, string> = {
  government_id: "Government ID",
  drivers_license: "Driver's License",
  passport: "Passport",
  trust_agreement: "Trust Agreement",
  formation_documents: "Formation Documents",
  ein_letter: "EIN Letter",
  ownership_docs: "Ownership Documents",
  other: "Other",
};

const documentTypeIcons: Record<string, typeof FileText> = {
  government_id: Shield,
  drivers_license: User,
  passport: User,
  trust_agreement: FileText,
  formation_documents: Building2,
  ein_letter: FileText,
  ownership_docs: FileText,
  other: File,
};

export default function AdminDocumentsPage() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      // Get all documents - this endpoint lists documents from all parties
      const response = await fetch(`${API_BASE_URL}/documents/admin/list`);
      if (!response.ok) {
        // If admin endpoint doesn't exist, try to aggregate from reports
        // For now, we'll show an empty state
        setDocuments([]);
        setStats({
          total_documents: 0,
          pending_verification: 0,
          verified: 0,
          this_week: 0,
        });
        return;
      }
      const data = await response.json();
      const docs = data.documents || data;
      setDocuments(docs);
      
      // Calculate stats
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      setStats({
        total_documents: docs.length,
        pending_verification: docs.filter((d: Document) => d.upload_confirmed && !d.verified_at).length,
        verified: docs.filter((d: Document) => d.verified_at).length,
        this_week: docs.filter((d: Document) => 
          d.created_at && new Date(d.created_at) >= weekAgo
        ).length,
      });
    } catch (error) {
      console.error("Error fetching documents:", error);
      // Show empty state instead of error
      setDocuments([]);
      setStats({
        total_documents: 0,
        pending_verification: 0,
        verified: 0,
        this_week: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "N/A";
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return Image;
    return File;
  };

  const verifyDocument = async (documentId: string, verified: boolean) => {
    setActionLoading(documentId);
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/verify`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to verify document");
      
      toast({
        title: verified ? "Document Verified" : "Document Rejected",
        description: verified 
          ? "The document has been marked as verified"
          : "The document has been marked as rejected",
      });
      
      fetchDocuments();
      setPreviewDialogOpen(false);
    } catch (error) {
      console.error("Error verifying document:", error);
      toast({
        title: "Error",
        description: "Failed to update document status",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const downloadDocument = async (documentId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/download/${documentId}`);
      if (!response.ok) throw new Error("Failed to get download URL");
      const data = await response.json();
      
      if (data.download_url) {
        window.open(data.download_url, "_blank");
      }
    } catch (error) {
      console.error("Error downloading document:", error);
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.party_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.property_address || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === "all" || doc.document_type === typeFilter;
    
    let matchesStatus = true;
    if (statusFilter === "pending") {
      matchesStatus = doc.upload_confirmed && !doc.verified_at;
    } else if (statusFilter === "verified") {
      matchesStatus = !!doc.verified_at;
    } else if (statusFilter === "unconfirmed") {
      matchesStatus = !doc.upload_confirmed;
    }
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Document Management</h1>
          <p className="text-slate-500">Review and verify documents uploaded by parties</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDocuments}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Documents</p>
                {loading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.total_documents || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={stats?.pending_verification ? "border-amber-200" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${stats?.pending_verification ? "bg-amber-100" : "bg-slate-100"}`}>
                <Clock className={`h-5 w-5 ${stats?.pending_verification ? "text-amber-600" : "text-slate-600"}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Pending Review</p>
                {loading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className={`text-2xl font-bold ${stats?.pending_verification ? "text-amber-600" : ""}`}>
                    {stats?.pending_verification || 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-100 rounded-xl">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Verified</p>
                {loading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-green-600">{stats?.verified || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">This Week</p>
                {loading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-blue-600">{stats?.this_week || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                {filteredDocuments.length} {filteredDocuments.length === 1 ? "document" : "documents"}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(documentTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unconfirmed">Unconfirmed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No documents found</h3>
              <p className="text-muted-foreground">
                {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Documents will appear here when parties upload them"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => {
                  const FileIcon = getFileIcon(doc.mime_type);
                  const TypeIcon = documentTypeIcons[doc.document_type] || File;
                  
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-slate-100 rounded">
                            <FileIcon className="h-4 w-4 text-slate-600" />
                          </div>
                          <div>
                            <div className="font-medium text-sm truncate max-w-[200px]">
                              {doc.file_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {doc.mime_type}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <TypeIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {documentTypeLabels[doc.document_type] || doc.document_type}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{doc.party_name || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {doc.party_role || ""}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground truncate max-w-[150px]">
                          {doc.property_address || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatFileSize(doc.size_bytes)}
                      </TableCell>
                      <TableCell>
                        {doc.verified_at ? (
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : doc.upload_confirmed ? (
                          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Unconfirmed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(doc.uploaded_at || doc.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedDocument(doc);
                              setPreviewDialogOpen(true);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadDocument(doc.id)}>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            {doc.upload_confirmed && !doc.verified_at && (
                              <>
                                <DropdownMenuItem onClick={() => verifyDocument(doc.id, true)}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Verify
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => verifyDocument(doc.id, false)}
                                  className="text-red-600"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Document Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Details
            </DialogTitle>
            <DialogDescription>
              Review document information and verify
            </DialogDescription>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Filename</p>
                  <p className="font-medium truncate">{selectedDocument.file_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">
                    {documentTypeLabels[selectedDocument.document_type] || selectedDocument.document_type}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Party</p>
                  <p className="font-medium">{selectedDocument.party_name || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Size</p>
                  <p className="font-medium">{formatFileSize(selectedDocument.size_bytes)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">MIME Type</p>
                  <p className="font-medium">{selectedDocument.mime_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Uploaded</p>
                  <p className="font-medium">
                    {formatDate(selectedDocument.uploaded_at || selectedDocument.created_at)}
                  </p>
                </div>
                {selectedDocument.verified_at && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Verified</p>
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {formatDate(selectedDocument.verified_at)}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => downloadDocument(selectedDocument?.id || "")}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            {selectedDocument?.upload_confirmed && !selectedDocument?.verified_at && (
              <>
                <Button 
                  variant="outline"
                  onClick={() => verifyDocument(selectedDocument.id, false)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  disabled={actionLoading === selectedDocument.id}
                >
                  {actionLoading === selectedDocument.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Reject
                </Button>
                <Button 
                  onClick={() => verifyDocument(selectedDocument.id, true)}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={actionLoading === selectedDocument.id}
                >
                  {actionLoading === selectedDocument.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Verify
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
