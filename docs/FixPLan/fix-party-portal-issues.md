Party Portal — 4 Issues to Diagnose and Fix

====================================================================
ITEM 1: Resend Link — Show Success Feedback
====================================================================

After resending a party link from the party-status step, the user sees nothing.
Need a visual confirmation.

Diagnose:
  grep -n "resend\|Resend\|toast\|Toast\|success" web/components/wizard/steps/PartyStatusStep.tsx | head -20

Fix:
- After successful resend API call, show a toast: "Portal link resent to [party email]"
- If using a button, show brief loading state (spinner) then checkmark
- Consider a small inline "Sent ✓" text next to the resend button that fades after 3 seconds

====================================================================
ITEM 2: R2 Upload URL — CRITICAL (Pre-signed URL Wrong)
====================================================================

The upload is hitting:
  POST https://3fac7fd01dd58c78d68dce172c17f030.r2.cloudflarestorage.com/pct-fincen-documents

This is the BUCKET ROOT, not a pre-signed upload URL. It returns 501 because
you can't just POST to a bucket without a proper pre-signed URL with path + signature.

The flow should be:
1. Frontend calls POST /documents/upload-url → backend generates pre-signed PUT URL with object key
2. Frontend PUTs the file directly to the pre-signed URL (which includes signature, expiry, path)
3. Frontend calls POST /documents/confirm/{id} to mark upload complete

Diagnose:

  # Backend: How does upload-url generate the pre-signed URL?
  grep -B 5 -A 40 "upload.url\|upload_url\|generate.*presign\|presigned\|pre_signed" api/app/routes/documents.py | head -60

  # Backend: How is the R2 client configured?
  grep -B 5 -A 30 "boto3\|s3.*client\|R2.*client\|endpoint_url\|r2" api/app/routes/documents.py api/app/services/ -r | head -50

  # Frontend: How does DocumentUpload.tsx use the upload URL?
  cat web/components/party-portal/DocumentUpload.tsx

  # Check the full upload flow in DocumentUpload.tsx
  grep -n "upload-url\|presigned\|PUT\|POST\|fetch\|r2\|cloudflare" web/components/party-portal/DocumentUpload.tsx | head -20

The bug is likely one of:
A) Backend returns a URL without the object key path (just bucket root)
B) Backend returns the endpoint_url instead of a pre-signed URL
C) Frontend ignores the returned URL and constructs its own
D) boto3/S3 client generate_presigned_url() is misconfigured

Check the R2 endpoint URL format. Correct format should be:
  https://{ACCOUNT_ID}.r2.cloudflarestorage.com/{BUCKET_NAME}/{object_key}?X-Amz-Signature=...&X-Amz-Expires=...

If the pre-signed URL generation is missing or broken, here's the correct pattern:

```python
import boto3
from botocore.config import Config

s3_client = boto3.client(
    's3',
    endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=settings.R2_ACCESS_KEY_ID,
    aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
    region_name='auto',
    config=Config(signature_version='s3v4')
)

# Generate pre-signed PUT URL
presigned_url = s3_client.generate_presigned_url(
    'put_object',
    Params={
        'Bucket': settings.R2_BUCKET_NAME,
        'Key': object_key,  # e.g. "documents/{party_id}/{uuid}/{filename}"
        'ContentType': content_type,
    },
    ExpiresIn=3600,  # 1 hour
)
```

Also check: R2 bucket CORS configuration. The bucket itself needs CORS rules allowing
PUT from https://www.fincenclear.com and https://fincenclear.com.

R2 CORS can be set via Cloudflare dashboard or API:
```json
[
  {
    "AllowedOrigins": ["https://www.fincenclear.com", "https://fincenclear.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

====================================================================
ITEM 3: Acknowledgment Checkbox Not Checkable
====================================================================

The acknowledgment/certification checkbox at the bottom of the party portal
won't check, blocking submission. This might be caused by the failed upload
(a required document field being empty), or it could be a separate UI bug.

Diagnose:
  # Find the acknowledgment/certification section
  grep -n "acknowledg\|certif\|checkbox.*required\|agree\|consent\|submit.*disabled" web/app/p/\[token\]/page.tsx | head -20

  # Check if submission is gated on document upload
  grep -n "document.*required\|upload.*required\|hasDocument\|documentUploaded\|canSubmit" web/app/p/\[token\]/page.tsx | head -20

  # Check the checkbox component itself
  grep -B 5 -A 10 "acknowledg\|certif\|agree" web/app/p/\[token\]/page.tsx | head -40

Two possible causes:
A) The checkbox is disabled until all required documents are uploaded (and upload failed)
B) The checkbox onChange handler has a bug

If cause A: The checkbox should be checkable regardless of upload status.
   Documents are important but shouldn't block the certification checkbox.
   Instead, the SUBMIT button should be disabled if required docs are missing,
   with a message "Please upload required documents before submitting."

If cause B: Fix the handler.

====================================================================
ITEM 4: Document Section Restructure (Investigation Only)
====================================================================

Currently: All document uploads are in the Identification tab.

Desired: 
- Identification tab: ID document upload only (always needed — driver's license, passport, etc.)
- Separate "Documents" tab or section: Entity-specific document uploads based on entity type
  (Articles of Org, Operating Agreement, etc.)

Diagnose ONLY — do not change yet:
  # How are document types/categories defined?
  grep -n "document.*type\|doc.*category\|DocType\|DOCUMENT_TYPE\|allowed.*type" web/app/p/\[token\]/page.tsx web/components/party-portal/ -r | head -20

  # How is the document upload section structured in the portal?
  grep -n "DocumentUpload\|<DocumentUpload\|document.*section\|identification.*tab" web/app/p/\[token\]/page.tsx web/components/party-portal/ -r | head -20

  # What entity-specific document checklists exist?
  grep -n "ENTITY_DOCUMENT_CHECKLIST\|document.*checklist" web/lib/rrer-types.ts | head -10

Report back what you find for Item 4. We'll design the restructure separately.

====================================================================
PASTE ALL DIAGNOSTIC OUTPUT — FIX ITEMS 1-3, DIAGNOSE ITEM 4
====================================================================

Priority:
- Item 2 (R2 upload) is the critical blocker
- Item 3 (checkbox) may resolve itself once uploads work
- Item 1 (resend feedback) is quick UX win
- Item 4 (doc restructure) is investigation only
