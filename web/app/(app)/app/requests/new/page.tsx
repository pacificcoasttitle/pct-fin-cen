"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDemo } from "@/hooks/use-demo";
import { 
  ArrowLeft, 
  ArrowRight,
  Send, 
  Loader2, 
  MapPin, 
  DollarSign, 
  User, 
  Users, 
  FileText,
  Calendar,
  Building2,
  Shield,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  Home,
  Check
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const STEPS = [
  { id: 1, icon: Home, label: "Property", description: "Property address & escrow details" },
  { id: 2, icon: DollarSign, label: "Transaction", description: "Price, date & financing" },
  { id: 3, icon: User, label: "Buyer", description: "Buyer information" },
  { id: 4, icon: Users, label: "Seller", description: "Seller information" },
];

interface FormData {
  escrowNumber: string;
  propertyAddress: string;
  city: string;
  state: string;
  zip: string;
  closingDate: string;
  purchasePrice: string;
  financingType: string;
  propertyType: string;  // NEW: For determination
  buyerName: string;
  buyerType: string;
  entitySubtype: string;  // NEW: For determination when buyer is entity
  buyerEmail: string;
  buyerPhone: string;
  sellerName: string;
  sellerEmail: string;
  sellerPhone: string;
  notes: string;
}

// Property types for determination
const PROPERTY_TYPES = [
  { value: "single_family", label: "Single Family Residence", exempt: false },
  { value: "condo", label: "Condominium", exempt: false },
  { value: "townhouse", label: "Townhouse", exempt: false },
  { value: "multi_family", label: "Multi-Family (2-4 units)", exempt: false },
  { value: "commercial", label: "Commercial Property", exempt: true },
  { value: "land", label: "Vacant Land", exempt: true },
  { value: "mixed_use", label: "Mixed Use", exempt: false },
];

// Entity subtypes for determination (when buyer is entity)
const ENTITY_SUBTYPES = [
  { value: "llc", label: "LLC (Limited Liability Company)", exempt: false },
  { value: "corporation", label: "Corporation", exempt: false },
  { value: "partnership", label: "Partnership", exempt: false },
  { value: "public_company", label: "Publicly Traded Company (SEC Reporting)", exempt: true },
  { value: "bank", label: "Bank or Credit Union", exempt: true },
  { value: "broker_dealer", label: "Registered Broker/Dealer", exempt: true },
  { value: "insurance", label: "Insurance Company", exempt: true },
  { value: "government", label: "Government Entity", exempt: true },
  { value: "nonprofit", label: "501(c) Nonprofit Organization", exempt: true },
  { value: "investment_company", label: "Registered Investment Company", exempt: true },
];

// Financing types with exemption info
const FINANCING_TYPES = [
  { value: "cash", label: "All Cash", description: "No financing involved", exempt: false },
  { value: "conventional", label: "Conventional Mortgage", description: "Traditional bank mortgage", exempt: true },
  { value: "fha_va", label: "FHA/VA Loan", description: "Government-backed loan", exempt: true },
  { value: "seller_financing", label: "Seller Financing", description: "Seller carries the loan", exempt: true },
  { value: "other_financing", label: "Other Financing", description: "Other loan or financing arrangement", exempt: true },
];

// ============================================================================
// Input Formatting Utilities
// ============================================================================

/**
 * Format phone number as user types: (555) 123-4567
 */
function formatPhoneNumber(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, "");
  
  // Limit to 10 digits
  const limited = digits.slice(0, 10);
  
  // Format based on length
  if (limited.length === 0) return "";
  if (limited.length <= 3) return `(${limited}`;
  if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
  return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
}

/**
 * Format currency with commas: 1,500,000
 */
function formatCurrency(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, "");
  
  if (digits.length === 0) return "";
  
  // Convert to number and format with commas
  const num = parseInt(digits, 10);
  return num.toLocaleString("en-US");
}

/**
 * Parse formatted currency back to number string
 */
function parseCurrency(formatted: string): number {
  const digits = formatted.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

/**
 * Format ZIP code: 12345 or 12345-6789
 */
function formatZipCode(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, "");
  
  // Limit to 9 digits
  const limited = digits.slice(0, 9);
  
  // Format with dash if more than 5 digits
  if (limited.length <= 5) return limited;
  return `${limited.slice(0, 5)}-${limited.slice(5)}`;
}

export default function NewRequestPage() {
  const router = useRouter();
  const { user } = useDemo();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // NEW: Track determination result for success screen
  const [determinationResult, setDeterminationResult] = useState<string | null>(null);
  const [exemptionReasons, setExemptionReasons] = useState<Array<{code: string; display: string}>>([]);
  const [certificateId, setCertificateId] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    escrowNumber: "",
    propertyAddress: "",
    city: "",
    state: "CA",
    zip: "",
    closingDate: "",
    purchasePrice: "",
    financingType: "",
    propertyType: "",
    buyerName: "",
    buyerType: "",
    entitySubtype: "",
    buyerEmail: "",
    buyerPhone: "",
    sellerName: "",
    sellerEmail: "",
    sellerPhone: "",
    notes: "",
  });

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Formatted field handlers
  const handlePhoneChange = (field: "buyerPhone" | "sellerPhone", value: string) => {
    updateField(field, formatPhoneNumber(value));
  };

  const handleCurrencyChange = (value: string) => {
    updateField("purchasePrice", formatCurrency(value));
  };

  const handleZipChange = (value: string) => {
    updateField("zip", formatZipCode(value));
  };

  // Step validation
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.escrowNumber && formData.propertyAddress && 
                  formData.city && formData.state && formData.zip);
      case 2:
        return !!(formData.closingDate && formData.purchasePrice && 
                  formData.financingType && formData.propertyType);
      case 3:
        // If buyer is entity, also require entity subtype
        const baseValid = !!(formData.buyerName && formData.buyerType && formData.buyerEmail);
        if (formData.buyerType === "entity") {
          return baseValid && !!formData.entitySubtype;
        }
        return baseValid;
      case 4:
        return !!formData.sellerName;
      default:
        return false;
    }
  };

  const canGoBack = currentStep > 1;
  const canGoNext = currentStep < STEPS.length && isStepValid(currentStep);
  const isLastStep = currentStep === STEPS.length;

  const handleSubmit = async () => {
    if (!isStepValid(currentStep)) return;
    
    setIsSubmitting(true);
    setError(null);

    // Parse purchase price (remove formatting and convert to cents)
    const purchasePriceDollars = parseCurrency(formData.purchasePrice);
    const purchasePriceCents = purchasePriceDollars * 100;

    // Build payload matching API schema exactly
    const payload = {
      property_address: {
        street: formData.propertyAddress.trim(),
        city: formData.city.trim(),
        state: formData.state,
        zip: formData.zip.replace(/-/g, "").slice(0, 5), // Remove dash, keep 5 digits
        county: null,
      },
      purchase_price_cents: purchasePriceCents,
      expected_closing_date: formData.closingDate, // Already in YYYY-MM-DD from date input
      escrow_number: formData.escrowNumber.trim() || null,
      financing_type: formData.financingType.toLowerCase(),
      property_type: formData.propertyType || null,  // NEW: For determination
      buyer_name: formData.buyerName.trim(),
      buyer_email: formData.buyerEmail.trim().toLowerCase(),
      buyer_type: formData.buyerType.toLowerCase(),
      entity_subtype: formData.entitySubtype || null,  // NEW: For determination
      seller_name: formData.sellerName.trim(),
      seller_email: formData.sellerEmail.trim().toLowerCase() || null,
      seller_type: "individual", // Default for now
      notes: formData.notes.trim() || null,
    };

    // Debug logging
    console.log("=== SUBMISSION DEBUG ===");
    console.log("Form data:", formData);
    console.log("Payload being sent:", JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(`${API_BASE_URL}/submission-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API error response:", errorData);
        
        // Format validation errors for display
        if (errorData.detail && Array.isArray(errorData.detail)) {
          const messages = errorData.detail.map((err: { loc?: string[]; msg: string }) => {
            const field = err.loc?.slice(-1)[0] || "Field";
            return `${field}: ${err.msg}`;
          }).join("\n");
          throw new Error(messages);
        }
        
        throw new Error(errorData.detail || `Failed to submit request: ${response.status}`);
      }

      const result = await response.json();
      console.log("Success! Request ID:", result.id);
      console.log("Determination result:", result.determination_result);
      
      setRequestId(result.id);
      setDeterminationResult(result.determination_result);
      setExemptionReasons(result.exemption_reasons_display || []);
      setCertificateId(result.exemption_certificate_id);
      setIsSuccess(true);
    } catch (err) {
      console.error("Submission error:", err);
      setError(err instanceof Error ? err.message : "An error occurred while submitting");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success overlay - Different UI for EXEMPT vs REPORTABLE
  if (isSuccess) {
    const isExempt = determinationResult === "exempt";
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm overflow-y-auto py-8">
        <div className="text-center space-y-6 p-8 max-w-2xl mx-4">
          {/* Header Icon - Green for exempt, Blue for reportable */}
          <div className="relative mx-auto w-24 h-24">
            <div className={cn(
              "absolute inset-0 rounded-full animate-ping",
              isExempt ? "bg-green-500/20" : "bg-blue-500/20"
            )} />
            <div className={cn(
              "relative w-24 h-24 rounded-full flex items-center justify-center shadow-xl",
              isExempt 
                ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/30" 
                : "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30"
            )}>
              {isExempt ? (
                <Shield className="h-12 w-12 text-white" />
              ) : (
                <CheckCircle className="h-12 w-12 text-white" />
              )}
            </div>
          </div>
          
          {/* Main Title - Different for exempt vs reportable */}
          <div className="space-y-2">
            {isExempt ? (
              <>
                <h2 className="text-2xl font-bold text-green-800">No FinCEN Report Required</h2>
                <p className="text-muted-foreground">
                  Based on the information provided, this transaction is <strong className="text-green-700">exempt</strong> from 
                  FinCEN Real Estate Reporting requirements.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-blue-800">Request Submitted Successfully!</h2>
                <p className="text-muted-foreground">
                  Your compliance request has been received. This transaction <strong className="text-blue-700">requires FinCEN reporting</strong>.
                </p>
              </>
            )}
          </div>
          
          {/* Request/Certificate ID */}
          <div className={cn(
            "border rounded-xl p-4 inline-block shadow-sm",
            isExempt ? "bg-green-50 border-green-200" : "bg-white border-blue-200"
          )}>
            <p className="text-sm text-muted-foreground">
              {isExempt ? "Exemption Certificate" : "Request ID"}
            </p>
            <p className={cn(
              "text-xl font-mono font-bold",
              isExempt ? "text-green-700" : "text-blue-700"
            )}>
              {isExempt && certificateId ? certificateId : requestId?.slice(0, 8).toUpperCase() || "..."}
            </p>
          </div>

          {/* Exemption Reasons (only for exempt) */}
          {isExempt && exemptionReasons.length > 0 && (
            <Card className="text-left border-green-200 bg-green-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-green-800">
                  <Shield className="h-5 w-5" />
                  Exemption Reason(s)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {exemptionReasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-green-700">
                      <Check className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                      <span>{reason.display}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* What happens next */}
          <div className="bg-muted/50 rounded-xl p-5 text-left space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-blue-500" />
              What happens next?
            </h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              {isExempt ? (
                <>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                    <span><strong>No further action needed</strong> for this transaction</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                    <span>Save or print the <strong>exemption certificate</strong> for your records</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                    <span>Certificate is <strong>available anytime</strong> in your dashboard</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                    <span>FinClear staff will review your submission within <strong>1 business day</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                    <span>Buyer and seller will receive <strong>secure links</strong> to provide required information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                    <span>You can <strong>track progress</strong> anytime in your dashboard</span>
                  </li>
                </>
              )}
            </ul>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            {isExempt && (
              <Button 
                variant="outline" 
                className="gap-2 border-green-300 text-green-700 hover:bg-green-50"
                onClick={() => window.print()}
              >
                <FileText className="h-4 w-4" />
                Print Certificate
              </Button>
            )}
            <Button variant="outline" asChild className="gap-2">
              <Link href="/app/requests">
                <FileText className="h-4 w-4" />
                View My Requests
              </Link>
            </Button>
            <Button asChild className="gap-2">
              <Link href="/app/requests/new" onClick={() => {
                setIsSuccess(false);
                setRequestId("");
                setDeterminationResult(null);
                setExemptionReasons([]);
                setCertificateId(null);
                setCurrentStep(1);
                setFormData({
                  escrowNumber: "",
                  propertyAddress: "",
                  city: "",
                  state: "CA",
                  zip: "",
                  closingDate: "",
                  purchasePrice: "",
                  financingType: "",
                  propertyType: "",
                  buyerName: "",
                  buyerType: "",
                  entitySubtype: "",
                  buyerEmail: "",
                  buyerPhone: "",
                  sellerName: "",
                  sellerEmail: "",
                  sellerPhone: "",
                  notes: "",
                });
              }}>
                <Send className="h-4 w-4" />
                Submit Another Request
              </Link>
            </Button>
          </div>
          
          {/* Footer note */}
          <p className="text-xs text-muted-foreground text-center mt-4">
            {isExempt 
              ? `This determination is based on information provided as of ${new Date().toLocaleDateString()}. If transaction details change, please submit a new request.`
              : `Request submitted on ${new Date().toLocaleDateString()}`
            }
          </p>
        </div>
      </div>
    );
  }

  // Step Content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="escrowNumber" className="text-sm font-medium flex items-center gap-1">
                Escrow Number <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                </div>
                <Input
                  id="escrowNumber"
                  placeholder="e.g., DTE-2026-001"
                  value={formData.escrowNumber}
                  onChange={(e) => updateField("escrowNumber", e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
              <p className="text-xs text-muted-foreground">Your internal reference number</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Property Address
              </div>
              
              <div className="relative p-5 rounded-xl border border-muted-foreground/10 bg-muted/30 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="propertyAddress" className="text-sm">Street Address *</Label>
                  <Input 
                    id="propertyAddress"
                    placeholder="123 Main Street" 
                    value={formData.propertyAddress}
                    onChange={(e) => updateField("propertyAddress", e.target.value)}
                    className="bg-background"
                  />
                </div>
                
                <div className="grid gap-4 sm:grid-cols-6">
                  <div className="sm:col-span-3 space-y-2">
                    <Label htmlFor="city" className="text-sm">City *</Label>
                    <Input 
                      id="city" 
                      placeholder="Los Angeles"
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      className="bg-background" 
                    />
                  </div>
                  <div className="sm:col-span-1 space-y-2">
                    <Label htmlFor="state" className="text-sm">State *</Label>
                    <Select value={formData.state} onValueChange={(v) => updateField("state", v)}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CA">CA</SelectItem>
                        <SelectItem value="NV">NV</SelectItem>
                        <SelectItem value="AZ">AZ</SelectItem>
                        <SelectItem value="OR">OR</SelectItem>
                        <SelectItem value="WA">WA</SelectItem>
                        <SelectItem value="TX">TX</SelectItem>
                        <SelectItem value="FL">FL</SelectItem>
                        <SelectItem value="NY">NY</SelectItem>
                        <SelectItem value="CO">CO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="zip" className="text-sm">ZIP Code *</Label>
                    <Input 
                      id="zip" 
                      placeholder="90001"
                      value={formData.zip}
                      onChange={(e) => handleZipChange(e.target.value)}
                      maxLength={10}
                      className="bg-background" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="closingDate" className="text-sm font-medium flex items-center gap-1">
                  Expected Closing Date <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <Input 
                    id="closingDate"
                    type="date" 
                    value={formData.closingDate}
                    onChange={(e) => updateField("closingDate", e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="purchasePrice" className="text-sm font-medium flex items-center gap-1">
                  Purchase Price <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                    $
                  </div>
                  <Input
                    id="purchasePrice"
                    type="text"
                    inputMode="numeric"
                    placeholder="1,500,000"
                    value={formData.purchasePrice}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                    className="pl-7 h-12 text-lg font-semibold tracking-wide"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                    USD
                  </div>
                </div>
                {formData.purchasePrice && (
                  <p className="text-xs text-muted-foreground">
                    ${parseCurrency(formData.purchasePrice).toLocaleString("en-US")} dollars
                  </p>
                )}
              </div>
            </div>

            {/* Property Type - Important for determination */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                Property Type <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.propertyType} onValueChange={(v) => updateField("propertyType", v)}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value} className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{pt.label}</span>
                        {pt.exempt && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                            Exempt
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.propertyType && PROPERTY_TYPES.find(p => p.value === formData.propertyType)?.exempt && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Commercial/land properties are typically exempt from FinCEN reporting
                </p>
              )}
            </div>

            {/* Financing Type - Key determination question */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                Financing Type <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.financingType} onValueChange={(v) => updateField("financingType", v)}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select financing type" />
                </SelectTrigger>
                <SelectContent>
                  {FINANCING_TYPES.map((ft) => (
                    <SelectItem key={ft.value} value={ft.value} className="py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-1.5 rounded",
                          ft.exempt ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
                        )}>
                          {ft.exempt ? <Building2 className="h-3.5 w-3.5" /> : <DollarSign className="h-3.5 w-3.5" />}
                        </div>
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            {ft.label}
                            {ft.exempt && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                Exempt
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{ft.description}</p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.financingType === "cash" && (
              <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
                <div className="flex gap-4">
                  <div className="shrink-0">
                    <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-amber-900">Cash Transaction</h4>
                    <p className="text-sm text-amber-800">
                      All-cash transactions may require FinCEN reporting depending on 
                      the buyer type and property. We&apos;ll determine the exact requirements.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {FINANCING_TYPES.find(f => f.value === formData.financingType)?.exempt && (
              <div className="relative overflow-hidden rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4">
                <div className="flex gap-4">
                  <div className="shrink-0">
                    <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center">
                      <Shield className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-green-900">Financing Detected</h4>
                    <p className="text-sm text-green-800">
                      Transactions with financing (mortgages, loans) are typically <strong>exempt</strong> from 
                      FinCEN Real Estate Reporting requirements.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="buyerName" className="text-sm font-medium flex items-center gap-1">
                Buyer Name <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <User className="h-4 w-4" />
                </div>
                <Input 
                  id="buyerName"
                  placeholder="Full legal name or entity name"
                  value={formData.buyerName}
                  onChange={(e) => updateField("buyerName", e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Buyer Type <span className="text-destructive">*</span>
              </Label>
              
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  { 
                    value: "individual", 
                    icon: User, 
                    label: "Individual", 
                    description: "Person buying property",
                    exempt: true,
                    bgSelected: "bg-green-500",
                    bgUnselected: "bg-green-100",
                    textSelected: "text-white",
                    textUnselected: "text-green-600",
                    borderSelected: "border-green-500",
                  },
                  { 
                    value: "entity", 
                    icon: Building2, 
                    label: "Entity", 
                    description: "LLC, Corp, Partnership",
                    exempt: false,
                    bgSelected: "bg-purple-500",
                    bgUnselected: "bg-purple-100",
                    textSelected: "text-white",
                    textUnselected: "text-purple-600",
                    borderSelected: "border-purple-500",
                  },
                  { 
                    value: "trust", 
                    icon: Shield, 
                    label: "Trust", 
                    description: "Trust or estate",
                    exempt: false,
                    bgSelected: "bg-amber-500",
                    bgUnselected: "bg-amber-100",
                    textSelected: "text-white",
                    textUnselected: "text-amber-600",
                    borderSelected: "border-amber-500",
                  },
                ].map((option) => {
                  const isSelected = formData.buyerType === option.value;
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "relative flex flex-col items-center p-5 rounded-xl border-2 cursor-pointer",
                        "transition-all duration-200 ease-out",
                        "hover:shadow-md hover:scale-[1.02]",
                        isSelected 
                          ? `${option.borderSelected} bg-gradient-to-br from-background to-muted/50 shadow-lg` 
                          : "border-muted hover:border-muted-foreground/30"
                      )}
                    >
                      <input
                        type="radio"
                        name="buyerType"
                        value={option.value}
                        checked={isSelected}
                        onChange={(e) => {
                          updateField("buyerType", e.target.value);
                          // Clear entity subtype when switching away from entity
                          if (e.target.value !== "entity") {
                            updateField("entitySubtype", "");
                          }
                        }}
                        className="sr-only"
                      />
                      
                      <div className={cn(
                        "absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        "transition-all duration-200",
                        isSelected 
                          ? `${option.borderSelected} ${option.bgSelected}` 
                          : "border-muted-foreground/30"
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      
                      {/* Exempt badge */}
                      {option.exempt && (
                        <Badge 
                          variant="secondary" 
                          className="absolute top-2 left-2 text-xs bg-green-100 text-green-700 border border-green-200"
                        >
                          Exempt
                        </Badge>
                      )}
                      
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center mb-3",
                        "transition-all duration-200",
                        isSelected 
                          ? `${option.bgSelected} ${option.textSelected}` 
                          : `${option.bgUnselected} ${option.textUnselected}`
                      )}>
                        <option.icon className="h-6 w-6" />
                      </div>
                      
                      <span className="font-semibold">{option.label}</span>
                      <span className="text-xs text-muted-foreground text-center mt-1">
                        {option.description}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Individual buyer exempt notice */}
            {formData.buyerType === "individual" && (
              <div className="relative overflow-hidden rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4">
                <div className="flex gap-4">
                  <div className="shrink-0">
                    <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center">
                      <Shield className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-green-900">Individual Buyer</h4>
                    <p className="text-sm text-green-800">
                      Transactions where the buyer is an <strong>individual person</strong> (not an entity or trust) 
                      are typically <strong>exempt</strong> from FinCEN reporting.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Entity subtype selection - only show when buyer type is entity */}
            {formData.buyerType === "entity" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  Entity Type <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={formData.entitySubtype} 
                  onValueChange={(v) => updateField("entitySubtype", v)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select the type of entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_SUBTYPES.map((et) => (
                      <SelectItem key={et.value} value={et.value} className="py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{et.label}</span>
                          {et.exempt && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                              Exempt
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.entitySubtype && ENTITY_SUBTYPES.find(e => e.value === formData.entitySubtype)?.exempt && (
                  <div className="relative overflow-hidden rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4 mt-3">
                    <div className="flex gap-4">
                      <div className="shrink-0">
                        <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center">
                          <Shield className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold text-green-900">Exempt Entity Type</h4>
                        <p className="text-sm text-green-800">
                          This type of entity is typically <strong>exempt</strong> from FinCEN Real Estate Reporting.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="buyerEmail" className="text-sm font-medium flex items-center gap-1">
                  Buyer Email <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="buyerEmail"
                  type="email" 
                  placeholder="buyer@example.com"
                  value={formData.buyerEmail}
                  onChange={(e) => updateField("buyerEmail", e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyerPhone" className="text-sm font-medium text-muted-foreground">
                  Buyer Phone <span className="text-xs">(optional)</span>
                </Label>
                <Input 
                  id="buyerPhone" 
                  type="tel" 
                  placeholder="(555) 123-4567"
                  value={formData.buyerPhone}
                  onChange={(e) => handlePhoneChange("buyerPhone", e.target.value)}
                  maxLength={14}
                  className="h-11"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="sellerName" className="text-sm font-medium flex items-center gap-1">
                Seller Name <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <User className="h-4 w-4" />
                </div>
                <Input 
                  id="sellerName"
                  placeholder="Full legal name or entity name"
                  value={formData.sellerName}
                  onChange={(e) => updateField("sellerName", e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sellerEmail" className="text-sm font-medium text-muted-foreground">
                  Seller Email <span className="text-xs">(optional)</span>
                </Label>
                <Input 
                  id="sellerEmail"
                  type="email" 
                  placeholder="seller@example.com"
                  value={formData.sellerEmail}
                  onChange={(e) => updateField("sellerEmail", e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellerPhone" className="text-sm font-medium text-muted-foreground">
                  Seller Phone <span className="text-xs">(optional)</span>
                </Label>
                <Input 
                  id="sellerPhone" 
                  type="tel" 
                  placeholder="(555) 123-4567"
                  value={formData.sellerPhone}
                  onChange={(e) => handlePhoneChange("sellerPhone", e.target.value)}
                  maxLength={14}
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="notes" className="text-sm font-medium">
                Additional Notes <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="notes"
                placeholder="e.g., Rush closing needed, buyer is relocating from overseas, multiple beneficial owners expected..."
                rows={4}
                maxLength={1000}
                value={formData.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                className="resize-none"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Optional but helpful for our team</span>
                <span>{formData.notes.length}/1000</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 via-background to-background -m-6">
      {/* Sticky Header */}
      <div className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto py-4 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild className="hover:bg-muted">
                <Link href="/app/requests">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="font-semibold text-lg">New FinCEN Request</h1>
                <p className="text-sm text-muted-foreground">{user?.companyName || "Your Company"}</p>
              </div>
            </div>
            
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              <FileText className="h-3 w-3 mr-1" />
              Step {currentStep} of {STEPS.length}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content - Centered */}
      <div className="max-w-2xl mx-auto py-8 px-6">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => {
              const isComplete = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              
              return (
                <div key={step.id} className="flex flex-col items-center relative flex-1">
                  {index > 0 && (
                    <div className={cn(
                      "absolute right-[calc(50%+24px)] top-5 w-[calc(100%-48px)] h-0.5 -z-10 hidden sm:block",
                      isComplete ? "bg-primary" : "bg-muted"
                    )} />
                  )}
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    isComplete && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "border-primary text-primary",
                    !isComplete && !isCurrent && "border-muted text-muted-foreground"
                  )}>
                    {isComplete ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <step.icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs mt-2 font-medium hidden sm:block",
                    isCurrent && "text-primary",
                    !isCurrent && "text-muted-foreground"
                  )}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
          <Progress value={(currentStep / STEPS.length) * 100} className="h-2" />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="relative overflow-hidden rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-5 mb-6">
            <div className="flex gap-4">
              <div className="shrink-0">
                <div className="w-11 h-11 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30">
                  <AlertCircle className="h-5 w-5" />
                </div>
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="font-semibold text-red-900">Submission Error</h4>
                <p className="text-sm text-red-800 whitespace-pre-line">{error}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setError(null)}
                className="text-red-700 hover:bg-red-100"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Info Callout - Only show on first step */}
        {currentStep === 1 && (
          <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 p-5 mb-6">
            <div className="flex gap-4">
              <div className="shrink-0">
                <div className="w-11 h-11 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <HelpCircle className="h-5 w-5" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-blue-900">Why do we need this information?</h4>
                <p className="text-sm text-blue-800">
                  FinCEN requires detailed information about all-cash real estate transactions 
                  to prevent money laundering. We&apos;ll guide you through the process.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step Card */}
        <Card className="relative overflow-hidden border-0 shadow-xl shadow-black/5">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20 pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
          
          <CardHeader className="relative pb-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
                {(() => {
                  const StepIcon = STEPS[currentStep - 1].icon;
                  return <StepIcon className="h-6 w-6" />;
                })()}
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  {STEPS[currentStep - 1].label}
                  {currentStep <= 3 && (
                    <Badge variant="outline" className="text-xs font-normal">Required</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {STEPS[currentStep - 1].description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="relative">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(s => s - 1)}
            disabled={!canGoBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {isLastStep ? (
            <Button 
              onClick={handleSubmit}
              disabled={!isStepValid(currentStep) || isSubmitting}
              className={cn(
                "min-w-[160px]",
                "bg-gradient-to-r from-primary to-primary/90",
                "hover:from-primary/90 hover:to-primary/80",
                "shadow-lg shadow-primary/25"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Request
                  <Send className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentStep(s => s + 1)}
              disabled={!canGoNext}
              className="gap-2"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Step indicator text */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          {!isStepValid(currentStep) && currentStep < 4 && "Complete all required fields to continue"}
          {isStepValid(currentStep) && !isLastStep && "Ready to continue to next step"}
          {isLastStep && isStepValid(currentStep) && "Ready to submit your request"}
        </p>
      </div>
    </div>
  );
}
