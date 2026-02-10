"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Palette,
  Upload,
  Trash2,
  Building2,
  Loader2,
  CheckCircle,
  ImageIcon,
  Mail,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

interface CompanyData {
  id: string
  name: string
  code: string
  status: string
  logo_url: string | null
  logo_updated_at: string | null
  primary_color: string | null
  secondary_color: string | null
}

export default function BrandingPage() {
  const { toast } = useToast()
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchCompany = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/companies/me`, {
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        setCompany(data)
      }
    } catch (error) {
      console.error("Failed to fetch company:", error)
      toast({
        title: "Error",
        description: "Failed to load company information",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchCompany()
  }, [fetchCompany])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file (JPG, PNG, GIF, or WebP)",
        variant: "destructive",
      })
      return
    }

    // Validate size
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      })
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`${API_BASE_URL}/companies/me/logo`, {
        method: "POST",
        credentials: "include",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setCompany((prev) =>
          prev ? { ...prev, logo_url: data.logo_url } : prev
        )
        toast({
          title: "Logo Uploaded",
          description: "Your company logo has been updated successfully",
        })
      } else {
        const err = await response.json()
        toast({
          title: "Upload Failed",
          description: err.detail || "Failed to upload logo",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Logo upload error:", error)
      toast({
        title: "Upload Failed",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDeleteLogo = async () => {
    if (!confirm("Remove your company logo? This cannot be undone.")) return

    setDeleting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/companies/me/logo`, {
        method: "DELETE",
        credentials: "include",
      })

      if (response.ok) {
        setCompany((prev) =>
          prev ? { ...prev, logo_url: null, logo_updated_at: null } : prev
        )
        toast({
          title: "Logo Removed",
          description: "Your company logo has been removed",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to remove logo",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-80" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="mx-auto max-w-2xl text-center py-12">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">No company found</h2>
        <p className="text-muted-foreground">
          Your account is not associated with a company.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Branding</h1>
        <p className="text-slate-500">
          Customize how your company appears to clients in emails and portals
        </p>
      </div>

      {/* Logo Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Company Logo
          </CardTitle>
          <CardDescription>
            Your logo will appear in emails sent to buyers and sellers, on the
            party portal, and on filing certificates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            {/* Logo Preview */}
            <div className="flex-shrink-0">
              {company.logo_url ? (
                <div className="relative w-32 h-32 rounded-lg border-2 border-slate-200 overflow-hidden bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={company.logo_url}
                    alt="Company logo"
                    className="w-full h-full object-contain p-2"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center bg-slate-50 gap-1">
                  <Building2 className="w-10 h-10 text-slate-300" />
                  <span className="text-xs text-slate-400">No logo</span>
                </div>
              )}
            </div>

            {/* Upload Controls */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="logo-upload"
                />
                <Button
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {company.logo_url ? "Change Logo" : "Upload Logo"}
                    </>
                  )}
                </Button>

                {company.logo_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteLogo}
                    disabled={deleting}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-1" />
                    )}
                    Remove
                  </Button>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                Recommended: Square image, at least 200x200 pixels. Accepts JPG,
                PNG, GIF, or WebP up to 5MB.
              </p>

              {company.logo_url && (
                <div className="flex items-center gap-1.5 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Logo uploaded
                  {company.logo_updated_at && (
                    <span className="text-muted-foreground ml-1">
                      &middot;{" "}
                      {new Date(company.logo_updated_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Preview
          </CardTitle>
          <CardDescription>
            This is how your emails will appear to buyers and sellers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-6 bg-slate-50">
            <div className="bg-white rounded-lg shadow-sm p-6 max-w-md mx-auto">
              {/* Email Header */}
              <div className="flex items-center gap-3 pb-4 border-b mb-4">
                {company.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={company.logo_url}
                    alt="Logo"
                    className="w-12 h-12 rounded object-contain"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-500 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {company.name?.[0]?.toUpperCase() || "C"}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-slate-900">
                    {company.name || "Your Company"}
                  </p>
                  <p className="text-sm text-slate-500">Secure Portal</p>
                </div>
              </div>

              {/* Email Body Preview */}
              <div className="space-y-3 text-sm text-slate-600">
                <p className="font-medium text-slate-900">
                  Complete Your Information
                </p>
                <p>
                  You&apos;ve been invited to provide information for a real
                  estate transaction at:
                </p>
                <p className="font-medium">
                  123 Main Street, Los Angeles, CA 90012
                </p>
                <div className="pt-3">
                  <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white text-center py-3 rounded-lg font-medium text-sm">
                    Complete Your Information &rarr;
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
