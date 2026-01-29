"use client"

import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  FileImage, 
  Download, 
  Eye, 
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { format } from "date-fns"

export interface DocumentItem {
  id: string
  party_id: string
  party_name?: string
  document_type: string
  file_name: string
  mime_type: string
  size_bytes?: number
  download_url?: string
  upload_confirmed: boolean
  created_at: string
  uploaded_at?: string | null
  verified_at?: string | null
}

interface DocumentsTableProps {
  documents: DocumentItem[]
  showPartyColumn?: boolean
  onVerify?: (documentId: string) => void
  onDownload?: (document: DocumentItem) => void
  className?: string
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

function getDocumentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    government_id: "Government ID (Front)",
    government_id_back: "Government ID (Back)",
    trust_agreement: "Trust Agreement",
    formation_docs: "Formation Documents",
    operating_agreement: "Operating Agreement",
    articles_of_incorporation: "Articles of Incorporation",
    beneficial_owner_id: "Beneficial Owner ID",
    other: "Other Document",
  }
  return labels[type] || type.replace(/_/g, " ")
}

function isImageType(mimeType: string): boolean {
  return mimeType?.startsWith("image/")
}

export function DocumentsTable({
  documents,
  showPartyColumn = false,
  onVerify,
  onDownload,
  className,
}: DocumentsTableProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>No documents uploaded yet.</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            {showPartyColumn && <TableHead>Party</TableHead>}
            <TableHead>Document</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              {showPartyColumn && (
                <TableCell className="font-medium">
                  {doc.party_name || "Unknown"}
                </TableCell>
              )}
              <TableCell>
                <div className="flex items-center gap-2">
                  {isImageType(doc.mime_type) ? (
                    <FileImage className="h-4 w-4 text-blue-500 shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  <span className="truncate max-w-[200px]" title={doc.file_name}>
                    {doc.file_name}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {getDocumentTypeLabel(doc.document_type)}
                </span>
              </TableCell>
              <TableCell>
                {doc.size_bytes ? formatFileSize(doc.size_bytes) : "—"}
              </TableCell>
              <TableCell>
                {doc.verified_at ? (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                ) : doc.upload_confirmed ? (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending Review
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Uploading
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {doc.uploaded_at ? (
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(doc.uploaded_at), "MMM d, h:mm a")}
                  </span>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {/* Preview for images */}
                  {isImageType(doc.mime_type) && doc.download_url && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
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
                      className="h-8 w-8"
                      onClick={() => {
                        if (onDownload) {
                          onDownload(doc)
                        } else {
                          window.open(doc.download_url, "_blank")
                        }
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {/* Verify */}
                  {onVerify && !doc.verified_at && doc.upload_confirmed && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-8"
                      onClick={() => onVerify(doc.id)}
                    >
                      Verify
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// Summary stat for document counts
interface DocumentsSummaryProps {
  total: number
  verified: number
  pending: number
  className?: string
}

export function DocumentsSummary({ 
  total, 
  verified, 
  pending,
  className 
}: DocumentsSummaryProps) {
  return (
    <div className={`flex items-center gap-4 text-sm ${className}`}>
      <div className="flex items-center gap-1">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{total}</span>
        <span className="text-muted-foreground">total</span>
      </div>
      <div className="flex items-center gap-1">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <span className="font-medium">{verified}</span>
        <span className="text-muted-foreground">verified</span>
      </div>
      {pending > 0 && (
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-amber-500" />
          <span className="font-medium">{pending}</span>
          <span className="text-muted-foreground">pending</span>
        </div>
      )}
    </div>
  )
}
