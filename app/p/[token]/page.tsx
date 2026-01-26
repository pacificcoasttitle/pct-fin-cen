"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Shield,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Building2,
  User,
  FileText,
  Clock,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getParty, saveParty, submitParty, type PartyData } from "@/lib/api";

const AUTOSAVE_DELAY = 1500;

interface PartyFormData {
  // Individual Info
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  date_of_birth?: string;
  ssn_last_four?: string;
  
  // Entity Info (for trusts/LLCs)
  entity_name?: string;
  entity_type?: string;
  ein?: string;
  formation_state?: string;
  
  // Address
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  
  // Contact
  email?: string;
  phone?: string;
  
  // ID Document
  id_type?: string;
  id_number?: string;
  id_state?: string;
  id_expiration?: string;
}

export default function PartyPortalPage() {
  const params = useParams();
  const token = params.token as string;

  // State
  const [partyData, setPartyData] = useState<PartyData | null>(null);
  const [formData, setFormData] = useState<PartyFormData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Autosave timer ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load party data
  useEffect(() => {
    const loadParty = async () => {
      try {
        setLoading(true);
        const data = await getParty(token);
        setPartyData(data);
        setFormData((data.party_data as PartyFormData) || {});
        if (data.status === "submitted") {
          setSubmitted(true);
        }
      } catch (err) {
        if (err instanceof Error) {
          if (err.message.includes("expired")) {
            setError("This link has expired. Please contact the title company for a new link.");
          } else if (err.message.includes("not found") || err.message.includes("Invalid")) {
            setError("This link is invalid or has already been used.");
          } else {
            setError(err.message);
          }
        } else {
          setError("Failed to load party information");
        }
      } finally {
        setLoading(false);
      }
    };
    loadParty();
  }, [token]);

  // Autosave function
  const performSave = useCallback(async (data: PartyFormData) => {
    if (submitted) return;
    try {
      setSaving(true);
      setSaved(false);
      await saveParty(token, data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Autosave failed:", err);
    } finally {
      setSaving(false);
    }
  }, [token, submitted]);

  // Debounced save on data change
  const updateFormData = useCallback((updates: Partial<PartyFormData>) => {
    if (submitted) return;
    setFormData((prev) => {
      const newData = { ...prev, ...updates };
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        performSave(newData);
      }, AUTOSAVE_DELAY);
      
      return newData;
    });
  }, [performSave, submitted]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Handle submit
  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      // Save any pending data first
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      await saveParty(token, formData);
      
      // Submit
      await submitParty(token);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !partyData) {
    return (
      <div className="min-h-screen bg-background">
        {/* Simple Header */}
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <span className="font-bold text-foreground">PCT FinCEN</span>
                <span className="font-medium text-muted-foreground"> Solutions</span>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-12 max-w-lg">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Link Error</h2>
                <p className="text-muted-foreground">{error}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        {/* Simple Header */}
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <span className="font-bold text-foreground">PCT FinCEN</span>
                <span className="font-medium text-muted-foreground"> Solutions</span>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-12 max-w-lg">
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">
                  Information Submitted
                </h2>
                <p className="text-muted-foreground mb-6">
                  Thank you! Your information has been successfully submitted.
                </p>
                {partyData && (
                  <div className="bg-muted/50 rounded-lg p-4 text-left">
                    <p className="text-sm text-muted-foreground mb-1">Property</p>
                    <p className="font-medium">{partyData.report_summary.property_address || "Address pending"}</p>
                    <p className="text-sm text-muted-foreground mt-3 mb-1">Your Role</p>
                    <p className="font-medium capitalize">{partyData.party_role}</p>
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-6">
                  You may close this window. The title company will contact you if additional information is needed.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Simple Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <span className="font-bold text-foreground">PCT FinCEN</span>
                <span className="font-medium text-muted-foreground"> Solutions</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saving && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              )}
              {saved && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Saved
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Transaction Info */}
        {partyData && (
          <Card className="mb-6 bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{partyData.report_summary.property_address || "Property Address Pending"}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge variant="outline" className="capitalize">{partyData.party_role}</Badge>
                    {partyData.report_summary.closing_date && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Closing: {new Date(partyData.report_summary.closing_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg mb-6">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
              Dismiss
            </Button>
          </div>
        )}

        {/* Personal Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>Your legal name as it appears on government-issued ID</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name || ""}
                  onChange={(e) => updateFormData({ first_name: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="middle_name">Middle Name</Label>
                <Input
                  id="middle_name"
                  value={formData.middle_name || ""}
                  onChange={(e) => updateFormData({ middle_name: e.target.value })}
                  placeholder="William"
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name || ""}
                  onChange={(e) => updateFormData({ last_name: e.target.value })}
                  placeholder="Smith"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date_of_birth">Date of Birth *</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth || ""}
                  onChange={(e) => updateFormData({ date_of_birth: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="ssn_last_four">Last 4 of SSN</Label>
                <Input
                  id="ssn_last_four"
                  value={formData.ssn_last_four || ""}
                  onChange={(e) => updateFormData({ ssn_last_four: e.target.value })}
                  placeholder="1234"
                  maxLength={4}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Current Address
            </CardTitle>
            <CardDescription>Your current residential address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address_line1">Address Line 1 *</Label>
              <Input
                id="address_line1"
                value={formData.address_line1 || ""}
                onChange={(e) => updateFormData({ address_line1: e.target.value })}
                placeholder="123 Main Street"
              />
            </div>
            <div>
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input
                id="address_line2"
                value={formData.address_line2 || ""}
                onChange={(e) => updateFormData({ address_line2: e.target.value })}
                placeholder="Apt 4B"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="col-span-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city || ""}
                  onChange={(e) => updateFormData({ city: e.target.value })}
                  placeholder="Los Angeles"
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={formData.state || ""}
                  onChange={(e) => updateFormData({ state: e.target.value })}
                  placeholder="CA"
                  maxLength={2}
                />
              </div>
              <div>
                <Label htmlFor="zip_code">ZIP Code *</Label>
                <Input
                  id="zip_code"
                  value={formData.zip_code || ""}
                  onChange={(e) => updateFormData({ zip_code: e.target.value })}
                  placeholder="90210"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ID Document */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Identification Document
            </CardTitle>
            <CardDescription>Government-issued photo ID information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="id_type">ID Type *</Label>
                <Select
                  value={formData.id_type || ""}
                  onValueChange={(value) => updateFormData({ id_type: value })}
                >
                  <SelectTrigger id="id_type">
                    <SelectValue placeholder="Select ID type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="drivers_license">Driver&apos;s License</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="state_id">State ID</SelectItem>
                    <SelectItem value="military_id">Military ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="id_number">ID Number *</Label>
                <Input
                  id="id_number"
                  value={formData.id_number || ""}
                  onChange={(e) => updateFormData({ id_number: e.target.value })}
                  placeholder="D1234567"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="id_state">Issuing State/Country</Label>
                <Input
                  id="id_state"
                  value={formData.id_state || ""}
                  onChange={(e) => updateFormData({ id_state: e.target.value })}
                  placeholder="CA"
                />
              </div>
              <div>
                <Label htmlFor="id_expiration">Expiration Date</Label>
                <Input
                  id="id_expiration"
                  type="date"
                  value={formData.id_expiration || ""}
                  onChange={(e) => updateFormData({ id_expiration: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>How we can reach you if needed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => updateFormData({ email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) => updateFormData({ phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                By submitting, you certify that all information provided is accurate and complete.
              </p>
              <Button 
                onClick={handleSubmit} 
                disabled={submitting}
                size="lg"
                className="w-full sm:w-auto bg-[#C9A227] hover:bg-[#B8911F] text-[#1E293B] font-semibold"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit Information
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
