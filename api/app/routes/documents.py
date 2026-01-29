"""
Document upload and management API routes.

Supports secure document uploads via Cloudflare R2 with pre-signed URLs.
Browser uploads directly to R2, bypassing our server for file handling.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid
import logging

from app.database import get_db
from app.models import Document, ReportParty, Report
from app.services.storage import (
    storage_service, 
    validate_document_type, 
    get_allowed_document_types,
    DOCUMENT_TYPE_ALLOWED_CONTENT,
)
from app.services.audit import (
    log_document_event,
    EVENT_DOCUMENT_UPLOAD_STARTED,
    EVENT_DOCUMENT_UPLOADED,
    EVENT_DOCUMENT_DOWNLOADED,
    EVENT_DOCUMENT_DELETED,
    EVENT_DOCUMENT_VERIFIED,
)
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/documents", tags=["documents"])


# =============================================================================
# Pydantic Schemas
# =============================================================================

class UploadUrlRequest(BaseModel):
    """Request to generate a pre-signed upload URL."""
    party_id: str = Field(..., description="Party UUID")
    document_type: str = Field(..., description="Type of document (government_id, trust_agreement, etc.)")
    filename: str = Field(..., description="Original filename")
    content_type: str = Field(..., description="MIME type (image/jpeg, application/pdf)")
    description: Optional[str] = Field(None, max_length=255, description="Optional description")


class UploadUrlResponse(BaseModel):
    """Response with pre-signed upload URL and fields."""
    document_id: str
    upload_url: str
    fields: dict
    key: str
    expires_at: str
    max_size_mb: int
    

class ConfirmUploadRequest(BaseModel):
    """Confirm successful upload to R2."""
    size_bytes: Optional[int] = Field(None, description="File size in bytes")


class DocumentResponse(BaseModel):
    """Document response."""
    id: str
    party_id: str
    document_type: str
    file_name: str
    mime_type: str
    size_bytes: Optional[int]
    description: Optional[str]
    upload_confirmed: bool
    download_url: Optional[str]
    created_at: str
    uploaded_at: Optional[str]
    verified_at: Optional[str]


class DocumentListResponse(BaseModel):
    """List of documents."""
    documents: List[DocumentResponse]
    total: int


class AllowedTypesResponse(BaseModel):
    """Allowed document types and content types."""
    document_types: List[str]
    content_types_by_type: dict
    max_size_mb: int


# =============================================================================
# API Endpoints
# =============================================================================

@router.get("/allowed-types", response_model=AllowedTypesResponse)
def get_allowed_types():
    """
    Get allowed document types and their permitted content types.
    
    Returns the configuration for client-side validation before upload.
    """
    return AllowedTypesResponse(
        document_types=get_allowed_document_types(),
        content_types_by_type=DOCUMENT_TYPE_ALLOWED_CONTENT,
        max_size_mb=settings.MAX_FILE_SIZE_MB
    )


@router.post("/upload-url", response_model=UploadUrlResponse)
def generate_upload_url(
    request: UploadUrlRequest,
    db: Session = Depends(get_db)
):
    """
    Generate a pre-signed URL for direct browser upload to R2.
    
    Flow:
    1. Client calls this endpoint with file metadata
    2. Returns pre-signed POST URL and fields
    3. Client uploads directly to R2 using the URL
    4. Client calls /confirm/{document_id} when complete
    
    This keeps files off our server entirely.
    """
    # Validate document type and content type
    if not validate_document_type(request.document_type, request.content_type):
        allowed = DOCUMENT_TYPE_ALLOWED_CONTENT.get(request.document_type, [])
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid content type '{request.content_type}' for document type '{request.document_type}'. Allowed: {allowed}"
        )
    
    # Validate party exists
    party = db.query(ReportParty).filter(ReportParty.id == request.party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    
    # Get report and company for storage path
    report = party.report
    if not report:
        raise HTTPException(status_code=404, detail="Report not found for party")
    
    company_id = str(report.company_id) if report.company_id else "no-company"
    report_id = str(report.id)
    party_id = str(party.id)
    
    # Check R2 configuration
    if not storage_service.is_configured:
        raise HTTPException(status_code=503, detail="Document storage not configured")
    
    # Generate pre-signed URL
    upload_info = storage_service.generate_upload_url(
        company_id=company_id,
        report_id=report_id,
        party_id=party_id,
        document_type=request.document_type,
        filename=request.filename,
        content_type=request.content_type,
    )
    
    if not upload_info:
        raise HTTPException(status_code=500, detail="Failed to generate upload URL")
    
    # Create pending document record
    document = Document(
        id=uuid.uuid4(),
        report_party_id=party.id,
        document_type=request.document_type,
        file_name=request.filename,
        mime_type=request.content_type,
        storage_key=upload_info['key'],
        description=request.description,
        upload_confirmed=False,
    )
    db.add(document)
    db.flush()
    
    # Audit log
    log_document_event(
        db=db,
        document_id=str(document.id),
        event_type=EVENT_DOCUMENT_UPLOAD_STARTED,
        party_id=party_id,
        report_id=report_id,
        details={
            "document_type": request.document_type,
            "filename": request.filename,
            "mime_type": request.content_type,
        },
        actor_type="party",
    )
    
    db.commit()
    db.refresh(document)
    
    logger.info(f"Generated upload URL for document {document.id} on party {party_id}")
    
    return UploadUrlResponse(
        document_id=str(document.id),
        upload_url=upload_info['upload_url'],
        fields=upload_info['fields'],
        key=upload_info['key'],
        expires_at=upload_info['expires_at'],
        max_size_mb=settings.MAX_FILE_SIZE_MB,
    )


@router.post("/confirm/{document_id}")
def confirm_upload(
    document_id: str,
    request: ConfirmUploadRequest,
    db: Session = Depends(get_db)
):
    """
    Confirm successful upload to R2.
    
    Called by client after successful direct upload to R2.
    Optionally verifies file exists in R2.
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.upload_confirmed:
        return {"status": "already_confirmed", "document_id": document_id}
    
    # Optionally verify file exists in R2
    if document.storage_key and storage_service.is_configured:
        if not storage_service.file_exists(document.storage_key):
            logger.warning(f"Upload confirmation for {document_id} but file not found in R2")
            # Don't fail - could be timing issue with R2 propagation
    
    # Get file info from R2 if possible
    if document.storage_key and storage_service.is_configured:
        file_info = storage_service.get_file_info(document.storage_key)
        if file_info:
            document.size_bytes = file_info.get('size_bytes')
    
    # Use provided size if R2 check failed
    if not document.size_bytes and request.size_bytes:
        document.size_bytes = request.size_bytes
    
    document.upload_confirmed = True
    document.uploaded_at = datetime.utcnow()
    
    # Get party and report for audit
    party = document.report_party
    report_id = str(party.report_id) if party and party.report_id else None
    
    # Audit log
    log_document_event(
        db=db,
        document_id=document_id,
        event_type=EVENT_DOCUMENT_UPLOADED,
        party_id=str(document.report_party_id) if document.report_party_id else None,
        report_id=report_id,
        details={
            "size_bytes": document.size_bytes,
            "document_type": document.document_type,
        },
        actor_type="party",
    )
    
    db.commit()
    
    logger.info(f"Confirmed upload for document {document_id}")
    
    return {"status": "confirmed", "document_id": document_id}


@router.get("/download/{document_id}")
def get_download_url(
    document_id: str,
    db: Session = Depends(get_db)
):
    """
    Generate a pre-signed download URL for a document.
    
    URL is valid for 1 hour.
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not document.upload_confirmed:
        raise HTTPException(status_code=400, detail="Document upload not confirmed")
    
    if not document.storage_key:
        raise HTTPException(status_code=400, detail="Document has no storage key")
    
    if not storage_service.is_configured:
        raise HTTPException(status_code=503, detail="Document storage not configured")
    
    download_url = storage_service.generate_download_url(
        key=document.storage_key,
        filename=document.file_name
    )
    
    if not download_url:
        raise HTTPException(status_code=500, detail="Failed to generate download URL")
    
    # GAP 9 Fix: Audit log for download tracking
    party = document.report_party
    report_id = str(party.report_id) if party and party.report_id else None
    
    log_document_event(
        db=db,
        document_id=document_id,
        event_type=EVENT_DOCUMENT_DOWNLOADED,
        party_id=str(document.report_party_id) if document.report_party_id else None,
        report_id=report_id,
        details={
            "filename": document.file_name,
            "document_type": document.document_type,
        },
        actor_type="staff",  # Downloads are typically by staff
    )
    db.commit()
    
    return {
        "download_url": download_url,
        "file_name": document.file_name,
        "mime_type": document.mime_type,
        "expires_in": 3600
    }


@router.get("/party/{party_id}", response_model=DocumentListResponse)
def list_party_documents(
    party_id: str,
    confirmed_only: bool = Query(True, description="Only return confirmed uploads"),
    db: Session = Depends(get_db)
):
    """
    List all documents for a party.
    """
    party = db.query(ReportParty).filter(ReportParty.id == party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    
    query = db.query(Document).filter(Document.report_party_id == party_id)
    
    if confirmed_only:
        query = query.filter(Document.upload_confirmed == True)
    
    documents = query.order_by(Document.created_at.desc()).all()
    
    # Generate download URLs for confirmed documents
    doc_responses = []
    for doc in documents:
        download_url = None
        if doc.upload_confirmed and doc.storage_key and storage_service.is_configured:
            download_url = storage_service.generate_download_url(
                key=doc.storage_key,
                filename=doc.file_name
            )
        
        doc_responses.append(DocumentResponse(
            id=str(doc.id),
            party_id=str(doc.report_party_id),
            document_type=doc.document_type,
            file_name=doc.file_name,
            mime_type=doc.mime_type,
            size_bytes=doc.size_bytes,
            description=doc.description,
            upload_confirmed=doc.upload_confirmed,
            download_url=download_url,
            created_at=doc.created_at.isoformat() if doc.created_at else None,
            uploaded_at=doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            verified_at=doc.verified_at.isoformat() if doc.verified_at else None,
        ))
    
    return DocumentListResponse(documents=doc_responses, total=len(doc_responses))


@router.get("/report/{report_id}", response_model=DocumentListResponse)
def list_report_documents(
    report_id: str,
    confirmed_only: bool = Query(True, description="Only return confirmed uploads"),
    db: Session = Depends(get_db)
):
    """
    List all documents across all parties for a report.
    
    Used by staff wizard to see all uploaded documents before filing.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Get all party IDs for this report
    party_ids = [str(p.id) for p in report.parties]
    
    query = db.query(Document).filter(Document.report_party_id.in_(party_ids))
    
    if confirmed_only:
        query = query.filter(Document.upload_confirmed == True)
    
    documents = query.order_by(Document.created_at.desc()).all()
    
    # Generate download URLs for confirmed documents
    doc_responses = []
    for doc in documents:
        download_url = None
        if doc.upload_confirmed and doc.storage_key and storage_service.is_configured:
            download_url = storage_service.generate_download_url(
                key=doc.storage_key,
                filename=doc.file_name
            )
        
        doc_responses.append(DocumentResponse(
            id=str(doc.id),
            party_id=str(doc.report_party_id),
            document_type=doc.document_type,
            file_name=doc.file_name,
            mime_type=doc.mime_type,
            size_bytes=doc.size_bytes,
            description=doc.description,
            upload_confirmed=doc.upload_confirmed,
            download_url=download_url,
            created_at=doc.created_at.isoformat() if doc.created_at else None,
            uploaded_at=doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            verified_at=doc.verified_at.isoformat() if doc.verified_at else None,
        ))
    
    return DocumentListResponse(documents=doc_responses, total=len(doc_responses))


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    db: Session = Depends(get_db)
):
    """
    Delete a document.
    
    Removes from R2 storage and database.
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Capture info for audit before deletion
    party_id = str(document.report_party_id) if document.report_party_id else None
    party = document.report_party
    report_id = str(party.report_id) if party and party.report_id else None
    doc_type = document.document_type
    filename = document.file_name
    
    # Delete from R2 if exists
    if document.storage_key and storage_service.is_configured:
        storage_service.delete_file(document.storage_key)
    
    # Audit log (before delete so we have context)
    log_document_event(
        db=db,
        document_id=document_id,
        event_type=EVENT_DOCUMENT_DELETED,
        party_id=party_id,
        report_id=report_id,
        details={
            "document_type": doc_type,
            "filename": filename,
        },
        actor_type="party",  # Could be staff/admin
    )
    
    # Delete from database
    db.delete(document)
    db.commit()
    
    logger.info(f"Deleted document {document_id}")
    
    return {"status": "deleted", "document_id": document_id}


@router.post("/{document_id}/verify")
def verify_document(
    document_id: str,
    db: Session = Depends(get_db)
):
    """
    Mark a document as verified by staff.
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not document.upload_confirmed:
        raise HTTPException(status_code=400, detail="Document upload not confirmed")
    
    document.verified_at = datetime.utcnow()
    
    # Get party and report for audit
    party = document.report_party
    report_id = str(party.report_id) if party and party.report_id else None
    
    # Audit log
    log_document_event(
        db=db,
        document_id=document_id,
        event_type=EVENT_DOCUMENT_VERIFIED,
        party_id=str(document.report_party_id) if document.report_party_id else None,
        report_id=report_id,
        details={
            "document_type": document.document_type,
        },
        actor_type="staff",  # Verification is done by staff
    )
    
    db.commit()
    
    logger.info(f"Verified document {document_id}")
    
    return {"status": "verified", "document_id": document_id, "verified_at": document.verified_at.isoformat()}


# =============================================================================
# ADMIN ENDPOINTS - GAP 3 Fix
# =============================================================================

@router.get("/admin/list")
def list_all_documents(
    status: str = Query(None, description="Filter by status: pending, verified, unconfirmed"),
    document_type: str = Query(None, description="Filter by document type"),
    report_id: str = Query(None, description="Filter by report ID"),
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    List all documents for admin review.
    Returns documents across all parties with associated metadata.
    """
    from app.models import Report
    
    query = db.query(Document).join(ReportParty).join(Report)
    
    # Apply filters
    if status:
        if status == "pending":
            query = query.filter(Document.upload_confirmed == True, Document.verified_at.is_(None))
        elif status == "verified":
            query = query.filter(Document.verified_at.isnot(None))
        elif status == "unconfirmed":
            query = query.filter(Document.upload_confirmed == False)
    
    if document_type:
        query = query.filter(Document.document_type == document_type)
    
    if report_id:
        query = query.filter(Report.id == report_id)
    
    total = query.count()
    documents = query.order_by(Document.created_at.desc()).offset(offset).limit(limit).all()
    
    # Build response with party and report info
    doc_responses = []
    for doc in documents:
        party = doc.report_party
        report = party.report if party else None
        
        # Get download URL if document is confirmed
        download_url = None
        if doc.upload_confirmed and doc.storage_key and storage_service.is_configured:
            download_url = storage_service.generate_download_url(
                key=doc.storage_key,
                filename=doc.file_name
            )
        
        doc_responses.append({
            "id": str(doc.id),
            "party_id": str(doc.report_party_id) if doc.report_party_id else None,
            "party_name": party.display_name if party else None,
            "party_role": party.party_role if party else None,
            "report_id": str(report.id) if report else None,
            "property_address": report.property_address_text if report else None,
            "document_type": doc.document_type,
            "file_name": doc.file_name,
            "mime_type": doc.mime_type,
            "size_bytes": doc.size_bytes,
            "upload_confirmed": doc.upload_confirmed,
            "verified_at": doc.verified_at.isoformat() if doc.verified_at else None,
            "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
            "download_url": download_url,
        })
    
    return {
        "documents": doc_responses,
        "total": total,
        "has_more": offset + limit < total
    }
