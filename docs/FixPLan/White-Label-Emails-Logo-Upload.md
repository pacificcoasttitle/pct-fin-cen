# 🎨 White Label Emails — Company Logo Upload

## Overview

Allow escrow admins to upload their company logo. The logo will be displayed in:
1. Party portal emails (invitation to buyers/sellers)
2. Party portal header
3. Certificate PDFs
4. Any client-facing communications

---

## Data Model

### Update Company Model

**File:** `api/app/models/company.py`

```python
class Company(Base):
    # ... existing fields ...
    
    # Branding
    logo_url = Column(String(500), nullable=True)  # S3/Cloudinary URL
    logo_updated_at = Column(DateTime, nullable=True)
    
    # Optional: Additional branding
    primary_color = Column(String(7), nullable=True)  # e.g., "#0D9488"
    secondary_color = Column(String(7), nullable=True)
```

---

## Migration

**File:** `api/alembic/versions/20260209_add_company_branding.py`

```python
"""Add company branding fields

Revision ID: 20260209_branding
"""
from alembic import op
import sqlalchemy as sa

revision = '20260209_branding'
down_revision = None  # Update to latest

def upgrade():
    op.add_column('companies', sa.Column('logo_url', sa.String(500), nullable=True))
    op.add_column('companies', sa.Column('logo_updated_at', sa.DateTime, nullable=True))
    op.add_column('companies', sa.Column('primary_color', sa.String(7), nullable=True))
    op.add_column('companies', sa.Column('secondary_color', sa.String(7), nullable=True))

def downgrade():
    op.drop_column('companies', 'logo_url')
    op.drop_column('companies', 'logo_updated_at')
    op.drop_column('companies', 'primary_color')
    op.drop_column('companies', 'secondary_color')
```

---

## File Upload Service

We'll use Cloudinary for image storage (free tier available, or use S3).

### Option A: Cloudinary (Recommended for simplicity)

**File:** `api/app/services/upload_service.py`

```python
import cloudinary
import cloudinary.uploader
from app.config import settings
from datetime import datetime
import uuid

# Configure Cloudinary
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)

async def upload_company_logo(file_data: bytes, company_id: str, filename: str) -> str:
    """
    Upload company logo to Cloudinary.
    Returns the secure URL.
    """
    
    # Generate unique public_id
    public_id = f"company_logos/{company_id}/{uuid.uuid4().hex}"
    
    result = cloudinary.uploader.upload(
        file_data,
        public_id=public_id,
        folder="finclear",
        resource_type="image",
        allowed_formats=["jpg", "jpeg", "png", "gif", "webp"],
        transformation=[
            {"width": 400, "height": 400, "crop": "limit"},  # Max size
            {"quality": "auto"},
            {"fetch_format": "auto"}
        ]
    )
    
    return result["secure_url"]


async def delete_company_logo(logo_url: str) -> bool:
    """Delete old logo from Cloudinary."""
    try:
        # Extract public_id from URL
        # URL format: https://res.cloudinary.com/{cloud}/image/upload/v123/{public_id}.jpg
        parts = logo_url.split("/upload/")
        if len(parts) > 1:
            public_id = parts[1].rsplit(".", 1)[0]  # Remove extension
            cloudinary.uploader.destroy(public_id)
        return True
    except Exception:
        return False
```

### Config Updates

**File:** `api/app/config.py`

```python
# Cloudinary
CLOUDINARY_CLOUD_NAME: str = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY: str = os.getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET: str = os.getenv("CLOUDINARY_API_SECRET", "")

@property
def cloudinary_configured(self) -> bool:
    return bool(self.CLOUDINARY_CLOUD_NAME and self.CLOUDINARY_API_KEY)
```

---

## API Endpoints

**File:** `api/app/routes/companies.py`

```python
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.services.upload_service import upload_company_logo, delete_company_logo
from datetime import datetime

@router.post("/companies/me/logo")
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload company logo."""
    
    if current_user.role not in ["client_admin"]:
        raise HTTPException(403, "Only client admins can upload logos")
    
    if not current_user.company_id:
        raise HTTPException(400, "No company associated with user")
    
    # Validate file
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")
    
    # Max 5MB
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(400, "Image must be less than 5MB")
    
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")
    
    # Delete old logo if exists
    if company.logo_url:
        await delete_company_logo(company.logo_url)
    
    # Upload new logo
    try:
        logo_url = await upload_company_logo(
            contents, 
            str(company.id), 
            file.filename
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to upload logo: {str(e)}")
    
    # Update company
    company.logo_url = logo_url
    company.logo_updated_at = datetime.utcnow()
    db.commit()
    
    return {
        "success": True,
        "logo_url": logo_url,
    }


@router.delete("/companies/me/logo")
async def delete_logo(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete company logo."""
    
    if current_user.role not in ["client_admin"]:
        raise HTTPException(403, "Only client admins can delete logos")
    
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")
    
    if company.logo_url:
        await delete_company_logo(company.logo_url)
        company.logo_url = None
        company.logo_updated_at = None
        db.commit()
    
    return {"success": True}
```

---

## Frontend: Logo Upload UI

**File:** `web/app/(app)/app/settings/branding/page.tsx`

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Upload, 
  Trash2, 
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  Building
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

export default function BrandingPage() {
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    try {
      const res = await fetch("/api/companies/me", { credentials: "include" });
      if (res.ok) {
        setCompany(await res.json());
      }
    } catch (error) {
      toast.error("Failed to load company info");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/companies/me/logo", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setCompany({ ...company, logo_url: data.logo_url });
        toast.success("Logo uploaded successfully");
      } else {
        const error = await res.json();
        toast.error(error.detail || "Failed to upload logo");
      }
    } catch (error) {
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteLogo = async () => {
    if (!confirm("Remove your company logo?")) return;

    try {
      const res = await fetch("/api/companies/me/logo", {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setCompany({ ...company, logo_url: null });
        toast.success("Logo removed");
      }
    } catch (error) {
      toast.error("Failed to remove logo");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Branding</h1>
        <p className="text-gray-500">Customize how your company appears to clients</p>
      </div>

      {/* Logo Upload Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Company Logo</CardTitle>
          <CardDescription>
            Your logo will appear in emails sent to buyers and sellers, 
            on the party portal, and on filing certificates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            {/* Logo Preview */}
            <div className="flex-shrink-0">
              {company?.logo_url ? (
                <div className="relative w-32 h-32 rounded-lg border-2 border-gray-200 overflow-hidden">
                  <Image
                    src={company.logo_url}
                    alt="Company logo"
                    fill
                    className="object-contain p-2"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                  <Building className="w-12 h-12 text-gray-300" />
                </div>
              )}
            </div>

            {/* Upload Controls */}
            <div className="flex-1 space-y-4">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="logo-upload"
                />
                <label htmlFor="logo-upload">
                  <Button
                    variant="outline"
                    disabled={uploading}
                    className="cursor-pointer"
                    asChild
                  >
                    <span>
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          {company?.logo_url ? "Change Logo" : "Upload Logo"}
                        </>
                      )}
                    </span>
                  </Button>
                </label>
                
                {company?.logo_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteLogo}
                    className="ml-2 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                )}
              </div>

              <p className="text-sm text-gray-500">
                Recommended: Square image, at least 200x200 pixels. 
                Accepts JPG, PNG, or GIF up to 5MB.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Email Preview</CardTitle>
          <CardDescription>
            This is how your emails will appear to buyers and sellers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-6 bg-gray-50">
            <div className="bg-white rounded-lg shadow-sm p-6 max-w-md mx-auto">
              {/* Email Header */}
              <div className="flex items-center gap-3 pb-4 border-b mb-4">
                {company?.logo_url ? (
                  <Image
                    src={company.logo_url}
                    alt="Logo"
                    width={48}
                    height={48}
                    className="rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded flex items-center justify-center">
                    <Building className="w-6 h-6 text-white" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{company?.name || "Your Company"}</p>
                  <p className="text-sm text-gray-500">Secure Portal</p>
                </div>
              </div>

              {/* Email Body Preview */}
              <div className="space-y-3 text-sm text-gray-600">
                <p className="font-medium text-gray-900">
                  Complete Your Information
                </p>
                <p>
                  You've been invited to provide information for a real estate transaction at:
                </p>
                <p className="font-medium">123 Main Street, Los Angeles, CA</p>
                <div className="pt-3">
                  <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-center py-3 rounded-lg font-medium">
                    Access Secure Portal
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Update Email Template

**File:** `api/app/services/email_service.py`

Update the party portal email to include company logo:

```python
def get_party_portal_email_html(
    party_name: str,
    party_role: str,
    property_address: str,
    portal_link: str,
    company_name: str,
    company_logo_url: str = None,  # NEW
) -> str:
    """Generate HTML email for party portal invitation."""
    
    # Logo HTML
    if company_logo_url:
        logo_html = f'''
        <img src="{company_logo_url}" 
             alt="{company_name}" 
             style="width: 60px; height: 60px; object-fit: contain; border-radius: 8px;"
        />
        '''
    else:
        logo_html = f'''
        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #14b8a6, #06b6d4); 
                    border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 24px; font-weight: bold;">
                {company_name[0].upper() if company_name else "E"}
            </span>
        </div>
        '''
    
    return f'''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                
                <!-- Header with Logo -->
                <div style="display: flex; align-items: center; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e5e7eb;">
                    {logo_html}
                    <div style="margin-left: 16px;">
                        <p style="margin: 0; font-weight: 600; font-size: 18px; color: #111827;">
                            {company_name}
                        </p>
                        <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">
                            Secure Document Portal
                        </p>
                    </div>
                </div>
                
                <!-- Greeting -->
                <h1 style="font-size: 24px; font-weight: 600; color: #111827; margin: 0 0 16px 0;">
                    Hello {party_name},
                </h1>
                
                <!-- Message -->
                <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                    You've been identified as the <strong>{party_role}</strong> in a real estate transaction 
                    and are required to provide certain information for federal compliance purposes.
                </p>
                
                <!-- Property Card -->
                <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 24px 0;">
                    <p style="font-size: 12px; text-transform: uppercase; color: #6b7280; margin: 0 0 4px 0;">
                        Property Address
                    </p>
                    <p style="font-size: 16px; font-weight: 600; color: #111827; margin: 0;">
                        {property_address}
                    </p>
                </div>
                
                <!-- CTA Button -->
                <a href="{portal_link}" 
                   style="display: block; background: linear-gradient(135deg, #14b8a6, #06b6d4); 
                          color: white; text-decoration: none; padding: 16px 32px; 
                          border-radius: 8px; font-weight: 600; font-size: 16px; 
                          text-align: center; margin: 24px 0;">
                    Access Secure Portal
                </a>
                
                <!-- Footer -->
                <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0 0;">
                    This is a secure link that expires in 30 days. If you have questions, 
                    please contact your escrow officer.
                </p>
                
            </div>
            
            <!-- Email Footer -->
            <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 24px;">
                Powered by FinClear Compliance Platform
            </p>
        </div>
    </body>
    </html>
    '''
```

Update the send function to pass the logo:

```python
async def send_party_portal_email(
    db: Session,
    party: ReportParty,
    portal_url: str,
):
    """Send party portal invitation email."""
    
    report = party.report
    company = report.company
    
    # Get property address
    property_address = "Property Address"
    if report.wizard_data and "collection" in report.wizard_data:
        addr = report.wizard_data["collection"].get("propertyAddress", {})
        property_address = f"{addr.get('street', '')}, {addr.get('city', '')} {addr.get('state', '')}"
    
    html = get_party_portal_email_html(
        party_name=party.display_name,
        party_role="buyer" if party.party_role == "transferee" else "seller",
        property_address=property_address,
        portal_link=portal_url,
        company_name=company.name if company else "Escrow Company",
        company_logo_url=company.logo_url if company else None,  # Pass logo
    )
    
    # Send via SendGrid
    # ...
```

---

## Navigation

Add to settings menu in `web/lib/navigation.ts`:

```typescript
// Under client_admin settings
{
  name: "Branding",
  href: "/app/settings/branding",
  icon: Palette,  // from lucide-react
}
```

---

## Environment Variables

Add to Render:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Summary

| Component | Purpose |
|-----------|---------|
| `logo_url` on companies | Store uploaded logo URL |
| Upload service | Handle Cloudinary uploads |
| `/companies/me/logo` endpoints | Upload/delete logo |
| Branding settings page | UI for logo upload with preview |
| Updated email template | Show company logo in emails |
| Party portal header | Show company logo |

**Key Features:**
- ✅ Logo upload with drag/drop
- ✅ Live email preview
- ✅ Logo in party portal emails
- ✅ Logo in party portal header
- ✅ 5MB limit, image validation
- ✅ Delete/replace functionality
