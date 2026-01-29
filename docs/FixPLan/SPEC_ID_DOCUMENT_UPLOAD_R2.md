# ID Document Upload Feature Specification

## Overview

Add secure document upload capability to the party portal for government ID verification and supporting documents.

---

## Storage Architecture: Cloudflare R2

### Why R2?
- S3-compatible API (easy migration path)
- No egress fees (huge cost savings)
- Global edge network
- Built-in CDN integration
- GDPR-compliant data residency options

### R2 Bucket Structure

```
pct-fincen-documents/
├── {company_id}/
│   ├── {report_id}/
│   │   ├── parties/
│   │   │   ├── {party_id}/
│   │   │   │   ├── government_id/
│   │   │   │   │   ├── {uuid}_front.jpg
│   │   │   │   │   └── {uuid}_back.jpg
│   │   │   │   ├── trust_agreement/
│   │   │   │   │   └── {uuid}_trust.pdf
│   │   │   │   └── formation_docs/
│   │   │   │       └── {uuid}_articles.pdf
│   │   │   └── ...
│   │   └── filing/
│   │       ├── {uuid}_rrer_submission.xml
│   │       └── {uuid}_certification.pdf
│   └── ...
└── ...
```

---

## Backend Implementation

### 1. Environment Variables

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=pct-fincen-documents
R2_PUBLIC_URL=https://documents.pctfincen.com  # Optional custom domain

# Upload limits
MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf
```

### 2. Dependencies

```python
# api/requirements.txt
boto3>=1.34.0  # S3-compatible client for R2
python-magic>=0.4.27  # File type detection
Pillow>=10.0.0  # Image processing (optional, for thumbnails)
```

### 3. R2 Client Service

**File:** `api/app/services/storage.py`

```python
import boto3
from botocore.config import Config
import uuid
from datetime import datetime, timedelta
from typing import Optional
import magic

class R2StorageService:
    def __init__(self):
        self.s3 = boto3.client(
            's3',
            endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            config=Config(signature_version='s3v4'),
            region_name='auto'
        )
        self.bucket = settings.R2_BUCKET_NAME
    
    def generate_upload_url(
        self,
        company_id: str,
        report_id: str,
        party_id: str,
        document_type: str,
        filename: str,
        content_type: str,
        expires_in: int = 3600  # 1 hour
    ) -> dict:
        """
        Generate a pre-signed URL for direct browser upload.
        This keeps files off our server entirely.
        """
        # Generate unique filename
        ext = filename.split('.')[-1].lower()
        unique_filename = f"{uuid.uuid4()}.{ext}"
        
        # Build path
        key = f"{company_id}/{report_id}/parties/{party_id}/{document_type}/{unique_filename}"
        
        # Generate pre-signed POST URL
        presigned = self.s3.generate_presigned_post(
            Bucket=self.bucket,
            Key=key,
            Fields={
                'Content-Type': content_type,
            },
            Conditions=[
                {'Content-Type': content_type},
                ['content-length-range', 1, settings.MAX_FILE_SIZE_MB * 1024 * 1024],
            ],
            ExpiresIn=expires_in
        )
        
        return {
            'upload_url': presigned['url'],
            'fields': presigned['fields'],
            'key': key,
            'expires_at': (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat()
        }
    
    def generate_download_url(
        self,
        key: str,
        expires_in: int = 3600,
        filename: Optional[str] = None
    ) -> str:
        """
        Generate a pre-signed URL for secure download.
        """
        params = {
            'Bucket': self.bucket,
            'Key': key,
        }
        
        if filename:
            params['ResponseContentDisposition'] = f'attachment; filename="{filename}"'
        
        return self.s3.generate_presigned_url(
            'get_object',
            Params=params,
            ExpiresIn=expires_in
        )
    
    def delete_file(self, key: str) -> bool:
        """Delete a file from R2."""
        try:
            self.s3.delete_object(Bucket=self.bucket, Key=key)
            return True
        except Exception as e:
            logger.error(f"Failed to delete {key}: {e}")
            return False
    
    def validate_file_type(self, file_bytes: bytes, expected_type: str) -> bool:
        """
        Validate actual file type matches expected (prevent disguised malware).
        """
        detected = magic.from_buffer(file_bytes, mime=True)
        
        allowed_types = {
            'government_id': ['image/jpeg', 'image/png', 'application/pdf'],
            'trust_agreement': ['application/pdf'],
            'formation_docs': ['application/pdf'],
        }
        
        return detected in allowed_types.get(expected_type, [])


# Singleton instance
storage_service = R2StorageService()
```

### 4. Document Model

**File:** `api/app/models/party_document.py`

```python
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime

from app.database import Base

class PartyDocument(Base):
    __tablename__ = "party_documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_party_id = Column(UUID(as_uuid=True), ForeignKey("report_parties.id"), nullable=False)
    
    # Document classification
    document_type = Column(String(50), nullable=False)
    # government_id, government_id_back, trust_agreement, formation_docs, other
    
    # Storage info
    storage_key = Column(String(500), nullable=False)  # R2 object key
    original_filename = Column(String(255))
    content_type = Column(String(100))
    file_size_bytes = Column(Integer)
    
    # Metadata
    description = Column(Text)
    metadata = Column(JSONB, default={})  # Flexible additional data
    
    # Status tracking
    status = Column(String(50), default="pending")
    # pending, uploaded, verified, rejected
    
    # Verification (for future use)
    verified_at = Column(DateTime)
    verified_by = Column(UUID(as_uuid=True))  # User ID
    verification_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Soft delete (documents may need retention)
    deleted_at = Column(DateTime)
    
    # Relationships
    report_party = relationship("ReportParty", back_populates="documents")
```

### 5. API Endpoints

**File:** `api/app/routes/documents.py`

```python
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import uuid

router = APIRouter(prefix="/documents", tags=["documents"])

# === Schemas ===

class UploadUrlRequest(BaseModel):
    document_type: str  # government_id, trust_agreement, etc.
    filename: str
    content_type: str

class UploadUrlResponse(BaseModel):
    upload_url: str
    fields: dict
    document_id: str
    key: str
    expires_at: str

class DocumentConfirmRequest(BaseModel):
    key: str
    file_size_bytes: Optional[int]

class DocumentResponse(BaseModel):
    id: str
    document_type: str
    original_filename: str
    status: str
    created_at: str
    download_url: Optional[str]

# === Party Portal Endpoints (public, token-based) ===

@router.post("/party/{token}/upload-url", response_model=UploadUrlResponse)
async def get_upload_url(
    token: str,
    request: UploadUrlRequest,
    db: Session = Depends(get_db)
):
    """
    Get a pre-signed URL for direct upload to R2.
    Called BEFORE the actual upload.
    """
    # Validate token and get party
    party_link = get_party_link_by_token(db, token)
    if not party_link or party_link.is_expired:
        raise HTTPException(404, "Invalid or expired link")
    
    party = party_link.report_party
    report = party.report
    
    # Validate document type
    allowed_types = ["government_id", "government_id_back", "trust_agreement", "formation_docs", "other"]
    if request.document_type not in allowed_types:
        raise HTTPException(400, f"Invalid document type. Allowed: {allowed_types}")
    
    # Validate content type
    allowed_content = ["image/jpeg", "image/png", "application/pdf"]
    if request.content_type not in allowed_content:
        raise HTTPException(400, f"Invalid file type. Allowed: JPEG, PNG, PDF")
    
    # Create document record (pending status)
    document = PartyDocument(
        report_party_id=party.id,
        document_type=request.document_type,
        original_filename=request.filename,
        content_type=request.content_type,
        status="pending"
    )
    db.add(document)
    db.flush()  # Get ID
    
    # Generate upload URL
    upload_data = storage_service.generate_upload_url(
        company_id=str(report.company_id),
        report_id=str(report.id),
        party_id=str(party.id),
        document_type=request.document_type,
        filename=request.filename,
        content_type=request.content_type
    )
    
    # Store the key
    document.storage_key = upload_data['key']
    db.commit()
    
    return UploadUrlResponse(
        upload_url=upload_data['upload_url'],
        fields=upload_data['fields'],
        document_id=str(document.id),
        key=upload_data['key'],
        expires_at=upload_data['expires_at']
    )


@router.post("/party/{token}/confirm-upload/{document_id}")
async def confirm_upload(
    token: str,
    document_id: str,
    request: DocumentConfirmRequest,
    db: Session = Depends(get_db)
):
    """
    Confirm that upload completed successfully.
    Called AFTER the browser uploads directly to R2.
    """
    # Validate token
    party_link = get_party_link_by_token(db, token)
    if not party_link or party_link.is_expired:
        raise HTTPException(404, "Invalid or expired link")
    
    # Get document
    document = db.query(PartyDocument).filter(
        PartyDocument.id == document_id,
        PartyDocument.report_party_id == party_link.report_party_id
    ).first()
    
    if not document:
        raise HTTPException(404, "Document not found")
    
    # Verify file exists in R2 (optional but recommended)
    # storage_service.head_object(document.storage_key)
    
    # Update status
    document.status = "uploaded"
    document.file_size_bytes = request.file_size_bytes
    db.commit()
    
    return {"ok": True, "document_id": str(document.id)}


@router.get("/party/{token}/documents", response_model=List[DocumentResponse])
async def list_party_documents(
    token: str,
    db: Session = Depends(get_db)
):
    """List all documents uploaded by this party."""
    party_link = get_party_link_by_token(db, token)
    if not party_link or party_link.is_expired:
        raise HTTPException(404, "Invalid or expired link")
    
    documents = db.query(PartyDocument).filter(
        PartyDocument.report_party_id == party_link.report_party_id,
        PartyDocument.deleted_at.is_(None)
    ).all()
    
    return [
        DocumentResponse(
            id=str(doc.id),
            document_type=doc.document_type,
            original_filename=doc.original_filename,
            status=doc.status,
            created_at=doc.created_at.isoformat(),
            download_url=storage_service.generate_download_url(doc.storage_key)
            if doc.status == "uploaded" else None
        )
        for doc in documents
    ]


@router.delete("/party/{token}/documents/{document_id}")
async def delete_party_document(
    token: str,
    document_id: str,
    db: Session = Depends(get_db)
):
    """Delete a document (soft delete, keeps in R2 for retention)."""
    party_link = get_party_link_by_token(db, token)
    if not party_link or party_link.is_expired:
        raise HTTPException(404, "Invalid or expired link")
    
    document = db.query(PartyDocument).filter(
        PartyDocument.id == document_id,
        PartyDocument.report_party_id == party_link.report_party_id
    ).first()
    
    if not document:
        raise HTTPException(404, "Document not found")
    
    # Soft delete
    document.deleted_at = datetime.utcnow()
    db.commit()
    
    return {"ok": True}
```

---

## Frontend Implementation

### 1. Document Upload Component

**File:** `web/components/party-portal/DocumentUpload.tsx`

```typescript
"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, Image, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface DocumentUploadProps {
  token: string;
  documentType: "government_id" | "government_id_back" | "trust_agreement" | "formation_docs" | "other";
  label: string;
  description?: string;
  accept?: string[];
  maxSizeMB?: number;
  onUploadComplete?: (document: UploadedDocument) => void;
  existingDocument?: UploadedDocument;
}

interface UploadedDocument {
  id: string;
  filename: string;
  status: string;
  downloadUrl?: string;
}

export function DocumentUpload({
  token,
  documentType,
  label,
  description,
  accept = ["image/jpeg", "image/png", "application/pdf"],
  maxSizeMB = 10,
  onUploadComplete,
  existingDocument,
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<UploadedDocument | null>(existingDocument || null);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Step 1: Get pre-signed upload URL
      const urlResponse = await fetch(`/api/documents/party/${token}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_type: documentType,
          filename: file.name,
          content_type: file.type,
        }),
      });

      if (!urlResponse.ok) {
        const err = await urlResponse.json();
        throw new Error(err.detail || "Failed to get upload URL");
      }

      const { upload_url, fields, document_id, key } = await urlResponse.json();
      setProgress(20);

      // Step 2: Upload directly to R2
      const formData = new FormData();
      Object.entries(fields).forEach(([k, v]) => formData.append(k, v as string));
      formData.append("file", file);

      const uploadResponse = await fetch(upload_url, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }
      setProgress(80);

      // Step 3: Confirm upload
      const confirmResponse = await fetch(
        `/api/documents/party/${token}/confirm-upload/${document_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key,
            file_size_bytes: file.size,
          }),
        }
      );

      if (!confirmResponse.ok) {
        throw new Error("Failed to confirm upload");
      }

      setProgress(100);

      const uploadedDoc: UploadedDocument = {
        id: document_id,
        filename: file.name,
        status: "uploaded",
      };

      setDocument(uploadedDoc);
      onUploadComplete?.(uploadedDoc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Validate size
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File too large. Maximum size is ${maxSizeMB}MB`);
        return;
      }

      uploadFile(file);
    },
    [token, documentType, maxSizeMB]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxFiles: 1,
    disabled: uploading,
  });

  const handleRemove = async () => {
    if (!document) return;

    try {
      await fetch(`/api/documents/party/${token}/documents/${document.id}`, {
        method: "DELETE",
      });
      setDocument(null);
    } catch (err) {
      setError("Failed to remove document");
    }
  };

  // Already uploaded state
  if (document) {
    return (
      <div className="border rounded-lg p-4 bg-green-50 border-green-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800">{label}</p>
              <p className="text-sm text-green-600">{document.filename}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRemove}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}

      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive && "border-primary bg-primary/5",
          uploading && "opacity-50 cursor-not-allowed",
          error && "border-red-300 bg-red-50"
        )}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="space-y-3">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <Progress value={progress} className="w-full max-w-xs mx-auto" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm">
              {isDragActive ? (
                "Drop the file here"
              ) : (
                <>
                  Drag & drop or <span className="text-primary">browse</span>
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              JPEG, PNG, or PDF up to {maxSizeMB}MB
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <X className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
}
```

### 2. Integration in Party Forms

**Example in BeneficialOwnerCard.tsx:**

```typescript
// Inside the beneficial owner form section
<DocumentUpload
  token={token}
  documentType="government_id"
  label="Government ID (Front)"
  description="Upload a clear photo of your driver's license, passport, or state ID"
  onUploadComplete={(doc) => {
    // Update beneficial owner data with document reference
    updateBeneficialOwner(index, {
      ...owner,
      id_document_id: doc.id,
      id_document_uploaded: true,
    });
  }}
  existingDocument={owner.id_document_id ? {
    id: owner.id_document_id,
    filename: owner.id_document_filename,
    status: "uploaded"
  } : undefined}
/>

<DocumentUpload
  token={token}
  documentType="government_id_back"
  label="Government ID (Back)"
  description="If applicable, upload the back of your ID"
  // ... same pattern
/>
```

---

## Dependencies to Install

### Backend
```bash
cd api
pip install boto3 python-magic Pillow
```

### Frontend
```bash
cd web
pnpm add react-dropzone
```

---

## Database Migration

```python
# alembic/versions/xxxx_add_party_documents.py

def upgrade():
    op.create_table(
        'party_documents',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('report_party_id', UUID(as_uuid=True), sa.ForeignKey('report_parties.id'), nullable=False),
        sa.Column('document_type', sa.String(50), nullable=False),
        sa.Column('storage_key', sa.String(500), nullable=False),
        sa.Column('original_filename', sa.String(255)),
        sa.Column('content_type', sa.String(100)),
        sa.Column('file_size_bytes', sa.Integer),
        sa.Column('description', sa.Text),
        sa.Column('metadata', JSONB, default={}),
        sa.Column('status', sa.String(50), default='pending'),
        sa.Column('verified_at', sa.DateTime),
        sa.Column('verified_by', UUID(as_uuid=True)),
        sa.Column('verification_notes', sa.Text),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime),
    )
    
    op.create_index('ix_party_documents_report_party_id', 'party_documents', ['report_party_id'])
    op.create_index('ix_party_documents_status', 'party_documents', ['status'])

def downgrade():
    op.drop_table('party_documents')
```

---

## Cloudflare R2 Setup Steps

1. **Create R2 Bucket:**
   - Go to Cloudflare Dashboard → R2
   - Create bucket: `pct-fincen-documents`
   - Set location hint (e.g., "North America")

2. **Create API Token:**
   - R2 → Manage R2 API Tokens
   - Create token with "Object Read & Write" permissions
   - Save Access Key ID and Secret Access Key

3. **Configure CORS (for direct uploads):**
   ```json
   [
     {
       "AllowedOrigins": ["https://app.pctfincen.com", "http://localhost:3000"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

4. **Optional: Custom Domain:**
   - Add custom domain for cleaner URLs
   - Configure SSL

---

## Security Considerations

1. **Pre-signed URLs expire** (default 1 hour)
2. **File type validation** on both client and server
3. **Soft delete** preserves files for 5-year retention requirement
4. **No direct R2 access** - all through pre-signed URLs
5. **Separate by company/report** for data isolation
6. **PII never in logs** - only document IDs logged

---

## Summary

| Component | Purpose |
|-----------|---------|
| `R2StorageService` | Generate pre-signed URLs, manage files |
| `PartyDocument` model | Track uploaded documents |
| `/documents/party/{token}/*` | Party portal upload endpoints |
| `DocumentUpload.tsx` | Drag-drop upload component |
| Direct R2 upload | Files never touch our server |

**This is Phase 3 of the implementation roadmap - can be built after seller forms and validation are complete.**
