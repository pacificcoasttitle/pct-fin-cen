"""
Cloudflare R2 Storage Service

Provides secure document storage using S3-compatible Cloudflare R2.
Documents are uploaded directly from browser using pre-signed URLs,
keeping files off our server entirely.
"""

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class R2StorageService:
    """
    Service for interacting with Cloudflare R2 storage.
    
    Uses pre-signed URLs for secure direct browser uploads.
    """
    
    def __init__(self):
        self._client = None
    
    @property
    def client(self):
        """Lazy initialization of S3 client."""
        if self._client is None:
            if not settings.r2_configured:
                logger.warning("R2 is not configured - document uploads will fail")
                return None
            
            self._client = boto3.client(
                's3',
                endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
                aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                config=Config(signature_version='s3v4'),
                region_name='auto'
            )
        return self._client
    
    @property
    def bucket(self) -> str:
        return settings.R2_BUCKET_NAME
    
    @property
    def is_configured(self) -> bool:
        return settings.r2_configured
    
    def generate_upload_url(
        self,
        company_id: str,
        report_id: str,
        party_id: str,
        document_type: str,
        filename: str,
        content_type: str,
        expires_in: int = 3600  # 1 hour
    ) -> Optional[Dict[str, Any]]:
        """
        Generate a pre-signed URL for direct browser upload.
        
        This keeps files off our server entirely - browser uploads
        directly to R2.
        
        Args:
            company_id: Company UUID
            report_id: Report UUID
            party_id: Party UUID
            document_type: Type of document (government_id, trust_agreement, etc.)
            filename: Original filename
            content_type: MIME type of file
            expires_in: URL expiration in seconds
            
        Returns:
            Dict with upload_url, fields, key, expires_at
        """
        if not self.client:
            logger.error("R2 client not configured")
            return None
        
        try:
            # Generate unique filename to prevent collisions
            ext = filename.split('.')[-1].lower() if '.' in filename else 'bin'
            unique_filename = f"{uuid.uuid4()}.{ext}"
            
            # Build hierarchical path for organization
            key = f"{company_id}/{report_id}/parties/{party_id}/{document_type}/{unique_filename}"
            
            # Generate pre-signed PUT URL for direct upload
            # Note: Cloudflare R2 does NOT support POST-based multipart form uploads
            # (generate_presigned_post). We must use PUT-based pre-signed URLs.
            presigned_url = self.client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': self.bucket,
                    'Key': key,
                    'ContentType': content_type,
                },
                ExpiresIn=expires_in
            )
            
            # Log URL structure (truncate signature for security)
            url_path = presigned_url.split('?')[0] if '?' in presigned_url else presigned_url
            logger.info(f"Generated presigned PUT URL: {url_path}?X-Amz-... (key={key})")
            
            return {
                'upload_url': presigned_url,
                'fields': {},  # No fields needed for PUT-based upload
                'key': key,
                'expires_at': (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat()
            }
            
        except ClientError as e:
            logger.error(f"Failed to generate upload URL: {e}")
            return None
    
    def generate_download_url(
        self,
        key: str,
        expires_in: int = 3600,
        filename: Optional[str] = None
    ) -> Optional[str]:
        """
        Generate a pre-signed URL for secure download.
        
        Args:
            key: R2 object key
            expires_in: URL expiration in seconds
            filename: Optional filename for Content-Disposition header
            
        Returns:
            Pre-signed download URL or None
        """
        if not self.client:
            logger.error("R2 client not configured")
            return None
        
        try:
            params = {
                'Bucket': self.bucket,
                'Key': key,
            }
            
            if filename:
                # Set Content-Disposition to force download with original filename
                params['ResponseContentDisposition'] = f'attachment; filename="{filename}"'
            
            return self.client.generate_presigned_url(
                'get_object',
                Params=params,
                ExpiresIn=expires_in
            )
            
        except ClientError as e:
            logger.error(f"Failed to generate download URL for {key}: {e}")
            return None
    
    def delete_file(self, key: str) -> bool:
        """
        Delete a file from R2.
        
        Args:
            key: R2 object key
            
        Returns:
            True if deleted successfully
        """
        if not self.client:
            logger.error("R2 client not configured")
            return False
        
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
            logger.info(f"Deleted file from R2: {key}")
            return True
        except ClientError as e:
            logger.error(f"Failed to delete {key}: {e}")
            return False
    
    def file_exists(self, key: str) -> bool:
        """
        Check if a file exists in R2.
        
        Args:
            key: R2 object key
            
        Returns:
            True if file exists
        """
        if not self.client:
            return False
        
        try:
            self.client.head_object(Bucket=self.bucket, Key=key)
            return True
        except ClientError:
            return False
    
    def upload_file(
        self,
        key: str,
        data: bytes,
        content_type: str,
    ) -> bool:
        """
        Upload a file directly to R2 (server-side upload).
        
        Used for logo uploads where the file comes through our API first.
        
        Args:
            key: R2 object key (path)
            data: File contents as bytes
            content_type: MIME type of file
            
        Returns:
            True if uploaded successfully
        """
        if not self.client:
            logger.error("R2 client not configured")
            return False
        
        try:
            self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=data,
                ContentType=content_type,
            )
            logger.info(f"Uploaded file to R2: {key} ({len(data)} bytes)")
            return True
        except ClientError as e:
            logger.error(f"Failed to upload file to R2: {key} - {e}")
            return False
    
    def get_file_info(self, key: str) -> Optional[Dict[str, Any]]:
        """
        Get metadata about a file in R2.
        
        Args:
            key: R2 object key
            
        Returns:
            Dict with ContentLength, ContentType, LastModified
        """
        if not self.client:
            return None
        
        try:
            response = self.client.head_object(Bucket=self.bucket, Key=key)
            return {
                'size_bytes': response['ContentLength'],
                'content_type': response['ContentType'],
                'last_modified': response['LastModified'].isoformat(),
            }
        except ClientError:
            return None


# Singleton instance
storage_service = R2StorageService()


# Document type validation
DOCUMENT_TYPE_ALLOWED_CONTENT = {
    'government_id': ['image/jpeg', 'image/png', 'application/pdf'],
    'government_id_back': ['image/jpeg', 'image/png', 'application/pdf'],
    'trust_agreement': ['application/pdf'],
    'formation_docs': ['application/pdf'],
    'operating_agreement': ['application/pdf'],
    'articles_of_incorporation': ['application/pdf'],
    'beneficial_owner_id': ['image/jpeg', 'image/png', 'application/pdf'],
    'other': ['image/jpeg', 'image/png', 'application/pdf'],
}


def validate_document_type(document_type: str, content_type: str) -> bool:
    """
    Validate that the content type is allowed for the document type.
    
    Args:
        document_type: Type of document
        content_type: MIME type of file
        
    Returns:
        True if valid
    """
    allowed = DOCUMENT_TYPE_ALLOWED_CONTENT.get(document_type, [])
    return content_type in allowed


def get_allowed_document_types() -> list:
    """Get list of allowed document types."""
    return list(DOCUMENT_TYPE_ALLOWED_CONTENT.keys())
