"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  FileText,
  User,
  Building2,
  Shield,
  CreditCard,
  RefreshCw,
  Send,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// Types
interface PartyData {
  // Individual fields
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  suffix?: string;
  date_of_birth?: string;
  ssn?: string;
  citizenship?: string;
  id_type?: string;
  id_number?: string;
  id_jurisdiction?: string;
  
  // Address
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;
  
  // Entity fields
  entity_name?: string;
  entity_type?: string;
  ein?: string;
  formation_state?: string;
  formation_date?: string;
  
  // Trust fields
  trust_name?: string;
  trust_type?: string;
  trust_date?: string;
  trust_tin?: string;
  
  // Contact (from portal)
  email?: string;
  phone?: string;
  
  // Beneficial owners (for entity buyers)
  beneficial_owners?: BeneficialOwner[];
  
  // Payment (for buyers)
  payment_sources?: PaymentSource[];
  
  // Certification
  certified?: boolean;
  certification_signature?: string;
  certification_date?: string;
}

interface BeneficialOwner {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  ssn: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  citizenship: string;
  id_type: string;
  id_number: string;
  ownership_percentage?: number;
  control_type?: string[];
}

interface PaymentSource {
  source_type: string;
  amount: number;
  payment_method: string;
  institution_name?: string;
  account_last_four?: string;
}

interface Party {
  id: string;
  party_role: string;
  entity_type: string;
  display_name: string | null;
  email: string | null;
  status: string;
  submitted_at: string | null;
  token?: string;
  link?: string;
  created_at: string;
}

interface ReportPartiesResponse {
  report_id: string;
  property_address: string | null;
  parties: Party[];
  summary: {
    total: number;
    submitted: number;
    pending: number;
    all_complete: boolean;
  };
}

// We need to fetch party_data separately since the current API doesn't include it
// For now, we'll work with what's available and show a message for pending data
interface PartyWithData extends Party {
  party_data?: PartyData;
}

// Helper: Mask sensitive data
function maskSSN(ssn?: string): string {
  if (!ssn) return "Not provided";
  // Show only last 4 digits
  const cleaned = ssn.replace(/\D/g, "");
  if (cleaned.length < 4) return "•••-••-••••";
  return `•••-••-${cleaned.slice(-4)}`;
}

function maskAccountNumber(num?: string): string {
  if (!num) return "";
  return `****${num.slice(-4)}`;
}

// Helper: Format date
function formatDate(dateStr?: string): string {
  if (!dateStr) return "Not provided";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// Helper: Format currency
function formatCurrency(cents?: number): string {
  if (cents === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

// Component: Data Row
function DataRow({ label, value, masked = false }: { 
  label: string; 
  value?: string | null; 
  masked?: boolean 
}) {
  return (
    <div className="flex justify-between py-1.5 border-b border-muted last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium text-right", masked && "font-mono")}>
        {value || "Not provided"}
      </span>
    </div>
  );
}

// Component: Individual Party Card
function IndividualPartyCard({ party }: { party: PartyWithData }) {
  const [isOpen, setIsOpen] = useState(true);
  const data = party.party_data || {};
  
  const fullName = [
    data.first_name,
    data.middle_name,
    data.last_name,
    data.suffix,
  ].filter(Boolean).join(" ") || party.display_name;
  
  const fullAddress = [
    data.address_street,
    data.address_city,
    data.address_state,
    data.address_zip,
  ].filter(Boolean).join(", ");

  const isSubmitted = party.status === "submitted";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn(
        "transition-all",
        !isSubmitted && "opacity-60 border-dashed"
      )}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  isSubmitted ? "bg-primary/10" : "bg-muted"
                )}>
                  <User className={cn(
                    "h-5 w-5",
                    isSubmitted ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {party.display_name || fullName || "Individual"}
                  </CardTitle>
                  <CardDescription className="capitalize">
                    {party.party_role.replace("_", " ")} • Individual
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isSubmitted ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Submitted
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    Pending
                  </Badge>
                )}
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {!isSubmitted ? (
              <div className="text-center py-6 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                <p>Waiting for party to submit their information</p>
                {party.email && (
                  <p className="text-sm mt-1">Email sent to: {party.email}</p>
                )}
              </div>
            ) : Object.keys(data).length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>Party data submitted but details not yet loaded.</p>
                <p className="text-sm mt-1">Refresh to see full details.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div>
                  <h4 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                    Personal Information
                  </h4>
                  <div className="space-y-1">
                    <DataRow label="Full Name" value={fullName} />
                    <DataRow label="Date of Birth" value={formatDate(data.date_of_birth)} />
                    <DataRow label="SSN/ITIN" value={maskSSN(data.ssn)} masked />
                    <DataRow label="Citizenship" value={data.citizenship} />
                  </div>
                </div>
                
                {/* Identification */}
                <div>
                  <h4 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                    Identification
                  </h4>
                  <div className="space-y-1">
                    <DataRow label="ID Type" value={data.id_type} />
                    <DataRow label="ID Number" value={maskSSN(data.id_number)} masked />
                    <DataRow label="Issuing Jurisdiction" value={data.id_jurisdiction} />
                  </div>
                </div>
                
                {/* Contact */}
                <div>
                  <h4 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                    Contact
                  </h4>
                  <div className="space-y-1">
                    <DataRow label="Email" value={data.email || party.email} />
                    <DataRow label="Phone" value={data.phone} />
                  </div>
                </div>
                
                {/* Address */}
                <div>
                  <h4 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                    Address
                  </h4>
                  <div className="space-y-1">
                    <DataRow label="Street" value={data.address_street} />
                    <DataRow 
                      label="City, State ZIP" 
                      value={data.address_city ? `${data.address_city}, ${data.address_state || ""} ${data.address_zip || ""}` : null} 
                    />
                    <DataRow label="Country" value={data.address_country || "United States"} />
                  </div>
                </div>
              </div>
            )}
            
            {/* Certification */}
            {data.certified && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Certification Provided</span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  Signed by {data.certification_signature} on {formatDate(data.certification_date)}
                </p>
              </div>
            )}
            
            {/* Submitted timestamp */}
            {party.submitted_at && (
              <div className="mt-4 text-xs text-muted-foreground">
                Submitted: {formatDate(party.submitted_at)}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// Component: Entity Party Card
function EntityPartyCard({ party }: { party: PartyWithData }) {
  const [isOpen, setIsOpen] = useState(true);
  const data = party.party_data || {};
  const isSubmitted = party.status === "submitted";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn(
        "transition-all",
        !isSubmitted && "opacity-60 border-dashed"
      )}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  isSubmitted ? "bg-blue-100" : "bg-muted"
                )}>
                  <Building2 className={cn(
                    "h-5 w-5",
                    isSubmitted ? "text-blue-600" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {data.entity_name || party.display_name || "Entity"}
                  </CardTitle>
                  <CardDescription className="capitalize">
                    {party.party_role.replace("_", " ")} • {party.entity_type || "Entity"}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isSubmitted ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Submitted
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    Pending
                  </Badge>
                )}
                {data.beneficial_owners && data.beneficial_owners.length > 0 && (
                  <Badge variant="secondary">
                    {data.beneficial_owners.length} BO{data.beneficial_owners.length > 1 ? "s" : ""}
                  </Badge>
                )}
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            {!isSubmitted ? (
              <div className="text-center py-6 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                <p>Waiting for party to submit their information</p>
                {party.email && (
                  <p className="text-sm mt-1">Email sent to: {party.email}</p>
                )}
              </div>
            ) : Object.keys(data).length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>Party data submitted but details not yet loaded.</p>
                <p className="text-sm mt-1">Refresh to see full details.</p>
              </div>
            ) : (
              <>
                {/* Entity Information */}
                <div>
                  <h4 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Entity Details
                  </h4>
                  <div className="grid md:grid-cols-2 gap-x-6">
                    <DataRow label="Legal Name" value={data.entity_name} />
                    <DataRow label="Entity Type" value={data.entity_type} />
                    <DataRow label="EIN" value={data.ein} />
                    <DataRow label="Formation State" value={data.formation_state} />
                    <DataRow label="Formation Date" value={formatDate(data.formation_date)} />
                  </div>
                  <div className="mt-3">
                    <DataRow label="Principal Address" value={[
                      data.address_street,
                      data.address_city,
                      data.address_state,
                      data.address_zip
                    ].filter(Boolean).join(", ") || null} />
                  </div>
                </div>
                
                {/* Beneficial Owners */}
                {data.beneficial_owners && data.beneficial_owners.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Beneficial Owners ({data.beneficial_owners.length})
                    </h4>
                    <div className="space-y-4">
                      {data.beneficial_owners.map((bo, index) => (
                        <div key={index} className="p-4 bg-muted/30 rounded-lg border">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-medium">
                                {bo.first_name} {bo.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {bo.ownership_percentage ? `${bo.ownership_percentage}% ownership` : ""}
                                {bo.control_type?.length ? ` • ${bo.control_type.join(", ")}` : ""}
                              </p>
                            </div>
                            <Badge variant="outline">BO #{index + 1}</Badge>
                          </div>
                          <div className="grid md:grid-cols-2 gap-x-6 text-sm">
                            <DataRow label="DOB" value={formatDate(bo.date_of_birth)} />
                            <DataRow label="SSN" value={maskSSN(bo.ssn)} masked />
                            <DataRow label="Citizenship" value={bo.citizenship} />
                            <DataRow label="ID" value={bo.id_type ? `${bo.id_type}: ${maskSSN(bo.id_number)}` : null} />
                            <DataRow 
                              label="Address" 
                              value={bo.address_street ? `${bo.address_street}, ${bo.address_city}, ${bo.address_state} ${bo.address_zip}` : null} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Payment Sources (for buyers) */}
                {data.payment_sources && data.payment_sources.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Payment Information
                    </h4>
                    <div className="space-y-3">
                      {data.payment_sources.map((source, index) => (
                        <div key={index} className="p-4 bg-muted/30 rounded-lg border">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium capitalize">{source.source_type.replace("_", " ")}</span>
                            <span className="text-lg font-semibold">{formatCurrency(source.amount * 100)}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {source.payment_method} 
                            {source.institution_name && ` via ${source.institution_name}`}
                            {source.account_last_four && ` (****${source.account_last_four})`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Certification */}
                {data.certified && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">Certification Provided</span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      Signed by {data.certification_signature} on {formatDate(data.certification_date)}
                    </p>
                  </div>
                )}
              </>
            )}
            
            {/* Submitted timestamp */}
            {party.submitted_at && (
              <div className="mt-4 text-xs text-muted-foreground">
                Submitted: {formatDate(party.submitted_at)}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// Main Page Component
export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  
  const [data, setData] = useState<ReportPartiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewCertified, setReviewCertified] = useState(false);
  
  useEffect(() => {
    async function fetchParties() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/reports/${reportId}/parties`
        );
        if (!response.ok) throw new Error("Failed to fetch party data");
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    
    fetchParties();
  }, [reportId]);
  
  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/reports/${reportId}/parties`
      );
      if (!response.ok) throw new Error("Failed to fetch party data");
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading party submissions...</p>
        </div>
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="container max-w-4xl py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700 mb-4">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">{error || "Failed to load data"}</span>
            </div>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const sellers = data.parties.filter(p => p.party_role === "transferor");
  const buyers = data.parties.filter(p => p.party_role === "transferee");
  const beneficialOwners = data.parties.filter(p => p.party_role === "beneficial_owner");
  
  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Wizard
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Review Party Submissions</h1>
            <p className="text-muted-foreground mt-1">
              {data.property_address || "Property address pending"}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Badge 
              variant={data.summary.all_complete ? "default" : "secondary"}
              className={cn(
                "text-sm py-1 px-3",
                data.summary.all_complete ? "bg-green-600" : ""
              )}
            >
              {data.summary.submitted} / {data.summary.total} Submitted
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Summary Card */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-primary">{data.summary.total}</p>
              <p className="text-sm text-muted-foreground">Total Parties</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">{data.summary.submitted}</p>
              <p className="text-sm text-muted-foreground">Submitted</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-amber-600">{data.summary.pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* No parties message */}
      {data.parties.length === 0 && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No parties have been created yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Generate party links from the wizard to start collecting information.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Sellers Section */}
      {sellers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            Sellers / Transferors ({sellers.length})
          </h2>
          <div className="space-y-4">
            {sellers.map((party) => (
              party.entity_type === "individual" ? (
                <IndividualPartyCard key={party.id} party={party} />
              ) : (
                <EntityPartyCard key={party.id} party={party} />
              )
            ))}
          </div>
        </div>
      )}
      
      {/* Buyers Section */}
      {buyers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Buyers / Transferees ({buyers.length})
          </h2>
          <div className="space-y-4">
            {buyers.map((party) => (
              party.entity_type === "individual" ? (
                <IndividualPartyCard key={party.id} party={party} />
              ) : (
                <EntityPartyCard key={party.id} party={party} />
              )
            ))}
          </div>
        </div>
      )}
      
      {/* Beneficial Owners Section (if collected separately) */}
      {beneficialOwners.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Beneficial Owners ({beneficialOwners.length})
          </h2>
          <div className="space-y-4">
            {beneficialOwners.map((party) => (
              <IndividualPartyCard key={party.id} party={party} />
            ))}
          </div>
        </div>
      )}
      
      {/* Staff Certification */}
      {data.parties.length > 0 && (
        <Card className="mb-8 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Staff Review Certification</CardTitle>
            <CardDescription>
              Confirm you have reviewed all party submissions before proceeding to file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <Checkbox
                id="review-cert"
                checked={reviewCertified}
                onCheckedChange={(checked) => setReviewCertified(checked as boolean)}
                disabled={!data.summary.all_complete}
              />
              <label 
                htmlFor="review-cert" 
                className={cn(
                  "text-sm leading-relaxed cursor-pointer",
                  !data.summary.all_complete && "text-muted-foreground"
                )}
              >
                I have reviewed all party submissions and confirm the information appears 
                complete and accurate to the best of my knowledge. I understand that any 
                errors or omissions may result in filing rejection or penalties.
              </label>
            </div>
            {!data.summary.all_complete && (
              <p className="text-sm text-amber-600 mt-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                All parties must submit before you can certify and proceed.
              </p>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Wizard
        </Button>
        
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            disabled={!data.summary.all_complete}
            onClick={() => {
              // TODO: Implement request corrections flow
              alert("Request Corrections feature coming soon")
            }}
          >
            <Send className="h-4 w-4 mr-2" />
            Request Corrections
          </Button>
          
          <Button 
            disabled={!data.summary.all_complete || !reviewCertified}
            asChild
          >
            <Link href={`/app/reports/${reportId}/wizard`}>
              <FileText className="h-4 w-4 mr-2" />
              Proceed to File
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
