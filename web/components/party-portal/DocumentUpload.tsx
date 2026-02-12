"use client";

/**
 * DocumentUpload Component
 * 
 * Provides secure document upload functionality using Cloudflare R2.
 * Uploads directly from browser to R2 using pre-signed URLs, bypassing
 * our server for file handling.
 * 
 * Features:
 * - Drag and drop file selection
 * - File type and size validation
 * - Upload progress tracking
 * - Preview for images
 * - Delete functionality
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { 
  Upload, 
  File, 
  FileImage, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Download,
  Trash2,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://pct-fincen-api.onrender.com";

// Types
interface DocumentType {
  value: string;
  label: string;
  description: string;
  required?: boolean;
  acceptedTypes: string[];
}

interface UploadedDocument {
  id: string;
  document_type: string;
  file_name: string;
  mime_type: string;
  size_bytes?: number;
  description?: string;
  upload_confirmed: boolean;
  download_url?: string;
  created_at: string;
  uploaded_at?: string;
  verified_at?: string;
}

interface DocumentUploadProps {
  partyId: string;
  documentTypes: DocumentType[];
  existingDocuments?: UploadedDocument[];
  onDocumentUploaded?: (document: UploadedDocument) => void;
  onDocumentDeleted?: (documentId: string) => void;
  maxFileSizeMB?: number;
  className?: string;
}

interface UploadingFile {
  id: string;
  file: File;
  documentType: string;
  progress: number;
  status: "pending" | "uploading" | "confirming" | "complete" | "error";
  error?: string;
  documentId?: string;
}

// Document type definitions for the party portal
export const DOCUMENT_TYPES: Record<string, DocumentType[]> = {
  individual: [
    {
      value: "government_id",
      label: "Government-Issued ID (Front)",
      description: "Driver's license, passport, or state ID - front side",
      required: true,
      acceptedTypes: ["image/jpeg", "image/png", "application/pdf"],
    },
    {
      value: "government_id_back",
      label: "Government-Issued ID (Back)",
      description: "Back side of your ID if applicable",
      required: false,
      acceptedTypes: ["image/jpeg", "image/png", "application/pdf"],
    },
  ],
  entity: [
    {
      value: "formation_docs",
      label: "Formation Documents",
      description: "Articles of Organization, Certificate of Formation, etc.",
      required: true,
      acceptedTypes: ["application/pdf"],
    },
    {
      value: "operating_agreement",
      label: "Operating Agreement",
      description: "LLC Operating Agreement or Partnership Agreement",
      required: false,
      acceptedTypes: ["application/pdf"],
    },
    {
      value: "articles_of_incorporation",
      label: "Articles of Incorporation",
      description: "For corporations - articles or certificate of incorporation",
      required: false,
      acceptedTypes: ["application/pdf"],
    },
    {
      value: "beneficial_owner_id",
      label: "Beneficial Owner ID",
      description: "Government ID for beneficial owners",
      required: false,
      acceptedTypes: ["image/jpeg", "image/png", "application/pdf"],
    },
  ],
  trust: [
    {
      value: "trust_agreement",
      label: "Trust Agreement",
      description: "Complete trust document including all amendments",
      required: true,
      acceptedTypes: ["application/pdf"],
    },
    {
      value: "government_id",
      label: "Trustee ID",
      description: "Government-issued ID for each trustee",
      required: true,
      acceptedTypes: ["image/jpeg", "image/png", "application/pdf"],
    },
  ],
};

// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return <FileImage className="h-5 w-5 text-blue-500" />;
  }
  if (mimeType === "application/pdf") {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  return <File className="h-5 w-5 text-gray-500" />;
}

function isImageType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

// Main Component
export function DocumentUpload({
  partyId,
  documentTypes,
  existingDocuments = [],
  onDocumentUploaded,
  onDocumentDeleted,
  maxFileSizeMB = 10,
  className = "",
}: DocumentUploadProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>(existingDocuments);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedType, setSelectedType] = useState<string>(documentTypes[0]?.value || "");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing documents on mount
  useEffect(() => {
    fetchDocuments();
  }, [partyId]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API_BASE}/documents/party/${partyId}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file: File, docType: DocumentType): string | null => {
    // Check file size
    if (file.size > maxFileSizeMB * 1024 * 1024) {
      return `File exceeds maximum size of ${maxFileSizeMB}MB`;
    }

    // Check file type
    if (!docType.acceptedTypes.includes(file.type)) {
      return `File type ${file.type} not accepted. Allowed: ${docType.acceptedTypes.join(", ")}`;
    }

    return null;
  };

  const uploadFile = async (file: File, documentType: string) => {
    const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Find document type config
    const docTypeConfig = documentTypes.find(dt => dt.value === documentType);
    if (!docTypeConfig) {
      setError("Invalid document type selected");
      return;
    }

    // Validate file
    const validationError = validateFile(file, docTypeConfig);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Add to uploading state
    const uploadingFile: UploadingFile = {
      id: uploadId,
      file,
      documentType,
      progress: 0,
      status: "pending",
    };
    setUploadingFiles(prev => [...prev, uploadingFile]);
    setError(null);

    try {
      // Step 1: Get pre-signed upload URL
      setUploadingFiles(prev =>
        prev.map(uf =>
          uf.id === uploadId ? { ...uf, status: "uploading" as const, progress: 10 } : uf
        )
      );

      const urlResponse = await fetch(`${API_BASE}/documents/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          party_id: partyId,
          document_type: documentType,
          filename: file.name,
          content_type: file.type,
        }),
      });

      if (!urlResponse.ok) {
        const errorData = await urlResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to get upload URL");
      }

      const { document_id, upload_url } = await urlResponse.json();

      // Debug: log the URL structure (signature truncated)
      const urlPath = upload_url.split('?')[0];
      console.log(`[DocumentUpload] PUT URL path: ${urlPath}`);

      setUploadingFiles(prev =>
        prev.map(uf =>
          uf.id === uploadId ? { ...uf, progress: 30, documentId: document_id } : uf
        )
      );

      // Step 2: Upload directly to R2 using pre-signed PUT URL
      // Cloudflare R2 requires PUT-based uploads (not POST multipart form)
      const uploadResponse = await fetch(upload_url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok && uploadResponse.status !== 200) {
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }

      setUploadingFiles(prev =>
        prev.map(uf =>
          uf.id === uploadId ? { ...uf, status: "confirming" as const, progress: 80 } : uf
        )
      );

      // Step 3: Confirm upload
      const confirmResponse = await fetch(`${API_BASE}/documents/confirm/${document_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size_bytes: file.size }),
      });

      if (!confirmResponse.ok) {
        throw new Error("Failed to confirm upload");
      }

      // Success!
      setUploadingFiles(prev =>
        prev.map(uf =>
          uf.id === uploadId ? { ...uf, status: "complete" as const, progress: 100 } : uf
        )
      );

      // Refresh documents list
      await fetchDocuments();

      // Notify parent
      if (onDocumentUploaded) {
        const newDoc: UploadedDocument = {
          id: document_id,
          document_type: documentType,
          file_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          upload_confirmed: true,
          created_at: new Date().toISOString(),
          uploaded_at: new Date().toISOString(),
        };
        onDocumentUploaded(newDoc);
      }

      // Remove from uploading after short delay
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(uf => uf.id !== uploadId));
      }, 2000);

    } catch (err) {
      console.error("Upload error:", err);
      setUploadingFiles(prev =>
        prev.map(uf =>
          uf.id === uploadId
            ? { ...uf, status: "error" as const, error: err instanceof Error ? err.message : "Upload failed" }
            : uf
        )
      );
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0], selectedType);
    }
  }, [selectedType, partyId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0], selectedType);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      const response = await fetch(`${API_BASE}/documents/${documentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDocuments(prev => prev.filter(d => d.id !== documentId));
        if (onDocumentDeleted) {
          onDocumentDeleted(documentId);
        }
      } else {
        setError("Failed to delete document");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete document");
    }
  };

  const removeUploadingFile = (uploadId: string) => {
    setUploadingFiles(prev => prev.filter(uf => uf.id !== uploadId));
  };

  // Get accepted file types for current selection
  const currentDocType = documentTypes.find(dt => dt.value === selectedType);
  const acceptString = currentDocType?.acceptedTypes.join(",") || "";

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Document Upload
        </CardTitle>
        <CardDescription>
          Upload required documents for identity verification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Document Type Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Document Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full p-2 border rounded-md bg-background"
          >
            {documentTypes.map((dt) => (
              <option key={dt.value} value={dt.value}>
                {dt.label} {dt.required && "*"}
              </option>
            ))}
          </select>
          {currentDocType && (
            <p className="text-xs text-muted-foreground">
              {currentDocType.description}
            </p>
          )}
        </div>

        {/* Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200
            ${dragActive 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptString}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className={`h-10 w-10 mx-auto mb-3 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />
          <p className="text-sm font-medium">
            {dragActive ? "Drop file here" : "Drag and drop a file, or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Max file size: {maxFileSizeMB}MB
          </p>
          <p className="text-xs text-muted-foreground">
            Accepted: {currentDocType?.acceptedTypes.map(t => t.split("/")[1].toUpperCase()).join(", ")}
          </p>
        </div>

        {/* Uploading Files */}
        {uploadingFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Uploading</h4>
            {uploadingFiles.map((uf) => (
              <div
                key={uf.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
              >
                {getFileIcon(uf.file.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{uf.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(uf.file.size)}
                  </p>
                  {uf.status === "error" ? (
                    <p className="text-xs text-destructive">{uf.error}</p>
                  ) : (
                    <Progress value={uf.progress} className="h-1 mt-1" />
                  )}
                </div>
                {uf.status === "complete" ? (
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                ) : uf.status === "error" ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeUploadingFile(uf.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Uploaded Documents */}
        {documents.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Uploaded Documents</h4>
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                {getFileIcon(doc.mime_type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.file_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-xs">
                      {documentTypes.find(dt => dt.value === doc.document_type)?.label || doc.document_type}
                    </Badge>
                    {doc.size_bytes && (
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(doc.size_bytes)}
                      </span>
                    )}
                    {doc.verified_at && (
                      <Badge variant="default" className="text-xs bg-green-600">
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Preview for images */}
                  {isImageType(doc.mime_type) && doc.download_url && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>{doc.file_name}</DialogTitle>
                        </DialogHeader>
                        <div className="flex justify-center">
                          <img
                            src={doc.download_url}
                            alt={doc.file_name}
                            className="max-h-[70vh] object-contain rounded-lg"
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  {/* Download */}
                  {doc.download_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(doc.download_url, "_blank")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(doc.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Required Documents Checklist */}
        <div className="pt-2 border-t">
          <h4 className="text-sm font-medium mb-2">Required Documents</h4>
          <div className="space-y-1">
            {documentTypes.filter(dt => dt.required).map((dt) => {
              const hasDocument = documents.some(d => d.document_type === dt.value && d.upload_confirmed);
              return (
                <div key={dt.value} className="flex items-center gap-2 text-sm">
                  {hasDocument ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  <span className={hasDocument ? "text-muted-foreground" : ""}>
                    {dt.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default DocumentUpload;
