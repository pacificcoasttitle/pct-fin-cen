# 🎨 Party Portal UX Overhaul — Guided Stepper + Mobile + Certification

## Overview

Redesign the party portal (what buyers/sellers see when they click their email link) with:
1. **Vertical guided stepper** — Visual progress showing completed/current/remaining steps
2. **Mobile-first design** — Must work perfectly on phones
3. **Certification language** — Party is accountable for their information
4. **Dynamic forms** — Different fields based on entity type
5. **Company branding** — Show escrow company logo (if uploaded)

---

## Current State

The party portal is at `web/app/p/[token]/page.tsx` and uses components from `web/components/party-portal/`.

---

## Design Mockup

```
┌─────────────────────────────────────────────────────────────┐
│  [Company Logo]                                              │
│  Pacific Coast Title                                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Complete Your Information                                   │
│  Property: 123 Main St, Los Angeles, CA                     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  ✓ Personal Information                    COMPLETE    │ │
│  │    ─────────────────────────────────────────────────   │ │
│  │    Name, Date of Birth, SSN                           │ │
│  │                                                        │ │
│  │  ● Address Details                         CURRENT     │ │
│  │    ─────────────────────────────────────────────────   │ │
│  │    ┌──────────────────────────────────────────────┐   │ │
│  │    │  Street Address                              │   │ │
│  │    │  [123 Oak Avenue                         ]   │   │ │
│  │    │                                              │   │ │
│  │    │  City              State       ZIP           │   │ │
│  │    │  [Los Angeles   ]  [CA ▼]     [90001    ]   │   │ │
│  │    └──────────────────────────────────────────────┘   │ │
│  │                                                        │ │
│  │  ○ Identification Documents                 PENDING    │ │
│  │    ─────────────────────────────────────────────────   │ │
│  │    Upload ID verification                             │ │
│  │                                                        │ │
│  │  ○ Review & Certify                         PENDING    │ │
│  │    ─────────────────────────────────────────────────   │ │
│  │    Confirm accuracy and submit                        │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│           [← Previous]              [Save & Continue →]      │
│                                                              │
│  ────────────────────────────────────────────────────────── │
│  Your progress is automatically saved.                       │
│  Questions? Contact: escrow@pacificcoasttitle.com           │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation

### Step 1: Create Vertical Stepper Component

**File:** `web/components/party-portal/VerticalStepper.tsx`

```tsx
"use client";

import { Check, Circle, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  id: string;
  title: string;
  description: string;
  status: "complete" | "current" | "pending";
}

interface VerticalStepperProps {
  steps: Step[];
  currentStepIndex: number;
  children: React.ReactNode;
}

export function VerticalStepper({ steps, currentStepIndex, children }: VerticalStepperProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      {/* Stepper Sidebar - Mobile: Horizontal, Desktop: Vertical */}
      <div className="lg:w-64 flex-shrink-0">
        {/* Mobile: Horizontal progress bar */}
        <div className="lg:hidden mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
            <span className="text-sm text-gray-500">
              {steps[currentStepIndex]?.title}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-teal-500 to-cyan-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Desktop: Vertical stepper */}
        <nav className="hidden lg:block sticky top-6">
          <ol className="space-y-1">
            {steps.map((step, index) => (
              <li key={step.id} className="relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div 
                    className={cn(
                      "absolute left-4 top-10 w-0.5 h-full -ml-px",
                      step.status === "complete" ? "bg-teal-500" : "bg-gray-200"
                    )}
                  />
                )}
                
                <div className={cn(
                  "relative flex items-start gap-3 p-3 rounded-lg transition-colors",
                  step.status === "current" && "bg-teal-50 border border-teal-200",
                  step.status === "complete" && "opacity-75"
                )}>
                  {/* Status icon */}
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                    step.status === "complete" && "bg-teal-500 text-white",
                    step.status === "current" && "bg-teal-500 text-white ring-4 ring-teal-100",
                    step.status === "pending" && "bg-gray-200 text-gray-500"
                  )}>
                    {step.status === "complete" ? (
                      <Check className="w-4 h-4" />
                    ) : step.status === "current" ? (
                      <CircleDot className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </div>
                  
                  {/* Step info */}
                  <div className="min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      step.status === "current" ? "text-teal-900" : "text-gray-700"
                    )}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Main content area */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
```

---

### Step 2: Create Step Components by Entity Type

**File:** `web/components/party-portal/steps/PersonalInfoStep.tsx`

```tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Calendar, CreditCard } from "lucide-react";

interface PersonalInfoStepProps {
  entityType: "individual" | "entity" | "trust";
  data: any;
  onChange: (data: any) => void;
  errors?: Record<string, string>;
}

export function PersonalInfoStep({ entityType, data, onChange, errors }: PersonalInfoStepProps) {
  const handleChange = (field: string, value: string) => {
    onChange({ ...data, [field]: value });
  };

  if (entityType === "individual") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-teal-600" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Please provide your legal name as it appears on government-issued ID.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={data.firstName || ""}
                onChange={(e) => handleChange("firstName", e.target.value)}
                placeholder="John"
                className={errors?.firstName ? "border-red-500" : ""}
              />
              {errors?.firstName && (
                <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={data.lastName || ""}
                onChange={(e) => handleChange("lastName", e.target.value)}
                placeholder="Smith"
                className={errors?.lastName ? "border-red-500" : ""}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="middleName">Middle Name (Optional)</Label>
            <Input
              id="middleName"
              value={data.middleName || ""}
              onChange={(e) => handleChange("middleName", e.target.value)}
              placeholder="Michael"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateOfBirth" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date of Birth *
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={data.dateOfBirth || ""}
                onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                className={errors?.dateOfBirth ? "border-red-500" : ""}
              />
            </div>
            <div>
              <Label htmlFor="ssn" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Social Security Number *
              </Label>
              <Input
                id="ssn"
                type="password"
                value={data.ssn || ""}
                onChange={(e) => handleChange("ssn", e.target.value)}
                placeholder="XXX-XX-XXXX"
                maxLength={11}
                className={errors?.ssn ? "border-red-500" : ""}
              />
              <p className="text-xs text-gray-500 mt-1">
                Your SSN is encrypted and securely stored.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (entityType === "entity") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-teal-600" />
            Entity Information
          </CardTitle>
          <CardDescription>
            Please provide your company's legal information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="entityName">Legal Entity Name *</Label>
            <Input
              id="entityName"
              value={data.entityName || ""}
              onChange={(e) => handleChange("entityName", e.target.value)}
              placeholder="ABC Holdings LLC"
              className={errors?.entityName ? "border-red-500" : ""}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="entityType">Entity Type *</Label>
              <select
                id="entityType"
                value={data.entityType || ""}
                onChange={(e) => handleChange("entityType", e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select type...</option>
                <option value="llc">LLC</option>
                <option value="corporation">Corporation</option>
                <option value="partnership">Partnership</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="ein">EIN (Tax ID) *</Label>
              <Input
                id="ein"
                value={data.ein || ""}
                onChange={(e) => handleChange("ein", e.target.value)}
                placeholder="XX-XXXXXXX"
                maxLength={10}
                className={errors?.ein ? "border-red-500" : ""}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="stateOfFormation">State of Formation *</Label>
            <Input
              id="stateOfFormation"
              value={data.stateOfFormation || ""}
              onChange={(e) => handleChange("stateOfFormation", e.target.value)}
              placeholder="California"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Trust
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-teal-600" />
          Trust Information
        </CardTitle>
        <CardDescription>
          Please provide the trust's legal information.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="trustName">Trust Name *</Label>
          <Input
            id="trustName"
            value={data.trustName || ""}
            onChange={(e) => handleChange("trustName", e.target.value)}
            placeholder="The Smith Family Trust"
            className={errors?.trustName ? "border-red-500" : ""}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="trustDate">Date of Trust *</Label>
            <Input
              id="trustDate"
              type="date"
              value={data.trustDate || ""}
              onChange={(e) => handleChange("trustDate", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="trustEin">Trust EIN (if applicable)</Label>
            <Input
              id="trustEin"
              value={data.trustEin || ""}
              onChange={(e) => handleChange("trustEin", e.target.value)}
              placeholder="XX-XXXXXXX"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### Step 3: Create Certification Step

**File:** `web/components/party-portal/steps/CertificationStep.tsx`

```tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Shield, FileText } from "lucide-react";

interface CertificationStepProps {
  partyName: string;
  partyRole: "buyer" | "seller";
  summary: {
    personalInfo: Record<string, any>;
    address: Record<string, any>;
    documents?: any[];
  };
  onCertify: () => void;
  isSubmitting: boolean;
}

export function CertificationStep({
  partyName,
  partyRole,
  summary,
  onCertify,
  isSubmitting,
}: CertificationStepProps) {
  const [checkboxes, setCheckboxes] = useState({
    infoAccurate: false,
    understandPenalties: false,
    authorizedToSign: false,
    consentToSubmit: false,
  });

  const allChecked = Object.values(checkboxes).every(Boolean);

  const handleCheckbox = (key: keyof typeof checkboxes) => {
    setCheckboxes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            Review Your Information
          </CardTitle>
          <CardDescription>
            Please review all information before certifying.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Personal Information</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Name:</strong> {summary.personalInfo.firstName} {summary.personalInfo.lastName}</p>
              {summary.personalInfo.dateOfBirth && (
                <p><strong>Date of Birth:</strong> {summary.personalInfo.dateOfBirth}</p>
              )}
              {summary.personalInfo.ssn && (
                <p><strong>SSN:</strong> ***-**-{summary.personalInfo.ssn.slice(-4)}</p>
              )}
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Address</h4>
            <div className="text-sm text-gray-600">
              <p>{summary.address.street}</p>
              <p>{summary.address.city}, {summary.address.state} {summary.address.zip}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certification Card */}
      <Card className="border-2 border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <Shield className="w-5 h-5" />
            Certification & Acknowledgment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-amber-100 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Important Notice</p>
              <p>
                Federal law requires accurate reporting of real estate transactions. 
                Providing false or misleading information may result in civil and criminal penalties.
              </p>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-4 pt-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={checkboxes.infoAccurate}
                onCheckedChange={() => handleCheckbox("infoAccurate")}
                className="mt-1"
              />
              <span className="text-sm text-gray-700">
                <strong>Accuracy:</strong> I certify that all information I have provided is true, accurate, 
                and complete to the best of my knowledge. I understand that I am responsible for the 
                accuracy of this information.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={checkboxes.understandPenalties}
                onCheckedChange={() => handleCheckbox("understandPenalties")}
                className="mt-1"
              />
              <span className="text-sm text-gray-700">
                <strong>Penalties:</strong> I understand that willfully providing false or fraudulent 
                information may subject me to criminal penalties under federal law, including fines 
                and imprisonment.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={checkboxes.authorizedToSign}
                onCheckedChange={() => handleCheckbox("authorizedToSign")}
                className="mt-1"
              />
              <span className="text-sm text-gray-700">
                <strong>Authorization:</strong> I am authorized to provide this information as the 
                {partyRole === "buyer" ? " buyer/transferee" : " seller/transferor"} or as an 
                authorized representative of the {partyRole === "buyer" ? "buyer/transferee" : "seller/transferor"}.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={checkboxes.consentToSubmit}
                onCheckedChange={() => handleCheckbox("consentToSubmit")}
                className="mt-1"
              />
              <span className="text-sm text-gray-700">
                <strong>Consent:</strong> I consent to the submission of this information to the 
                Financial Crimes Enforcement Network (FinCEN) as required by federal regulations 
                governing real estate transactions.
              </span>
            </label>
          </div>

          {/* Signature block */}
          <div className="pt-4 border-t border-amber-200">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Electronic Signature:</strong> {partyName}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Date:</strong> {new Date().toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        onClick={onCertify}
        disabled={!allChecked || isSubmitting}
        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 py-6 text-lg"
      >
        {isSubmitting ? (
          "Submitting..."
        ) : (
          <>
            <CheckCircle className="w-5 h-5 mr-2" />
            I Certify This Information Is Accurate — Submit
          </>
        )}
      </Button>

      {!allChecked && (
        <p className="text-center text-sm text-amber-600">
          Please check all certification boxes above to submit.
        </p>
      )}
    </div>
  );
}
```

---

### Step 4: Create Branded Header Component

**File:** `web/components/party-portal/BrandedHeader.tsx`

```tsx
"use client";

import Image from "next/image";
import { Building } from "lucide-react";

interface BrandedHeaderProps {
  companyName: string;
  companyLogo?: string | null;
  propertyAddress: string;
}

export function BrandedHeader({ companyName, companyLogo, propertyAddress }: BrandedHeaderProps) {
  return (
    <div className="border-b bg-white sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Company */}
          <div className="flex items-center gap-3">
            {companyLogo ? (
              <Image
                src={companyLogo}
                alt={companyName}
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
              <p className="font-semibold text-gray-900">{companyName}</p>
              <p className="text-sm text-gray-500">Secure Portal</p>
            </div>
          </div>

          {/* Property Badge */}
          <div className="hidden sm:block text-right">
            <p className="text-xs text-gray-500">Property</p>
            <p className="text-sm font-medium text-gray-700 max-w-xs truncate">
              {propertyAddress}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### Step 5: Main Portal Page Rewrite

**File:** `web/app/p/[token]/page.tsx`

Rewrite the main portal page to use these components:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { VerticalStepper, Step } from "@/components/party-portal/VerticalStepper";
import { BrandedHeader } from "@/components/party-portal/BrandedHeader";
import { PersonalInfoStep } from "@/components/party-portal/steps/PersonalInfoStep";
import { AddressStep } from "@/components/party-portal/steps/AddressStep";
import { DocumentsStep } from "@/components/party-portal/steps/DocumentsStep";
import { CertificationStep } from "@/components/party-portal/steps/CertificationStep";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { getParty, updatePartyData, submitParty } from "@/lib/api";

export default function PartyPortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [party, setParty] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Define steps based on entity type
  const getSteps = (entityType: string): Step[] => {
    const baseSteps = [
      {
        id: "personal",
        title: entityType === "individual" ? "Personal Information" : 
               entityType === "trust" ? "Trust Information" : "Entity Information",
        description: entityType === "individual" ? "Name, DOB, SSN" :
                     entityType === "trust" ? "Trust name and details" : "Company name, EIN",
        status: "pending" as const,
      },
      {
        id: "address",
        title: "Address Details",
        description: "Current mailing address",
        status: "pending" as const,
      },
      {
        id: "documents",
        title: "Identification",
        description: "Upload ID verification",
        status: "pending" as const,
      },
      {
        id: "certify",
        title: "Review & Certify",
        description: "Confirm and submit",
        status: "pending" as const,
      },
    ];

    // Mark completed steps
    return baseSteps.map((step, index) => ({
      ...step,
      status: index < currentStep ? "complete" : index === currentStep ? "current" : "pending",
    }));
  };

  useEffect(() => {
    const fetchParty = async () => {
      try {
        const data = await getParty(token);
        setParty(data);
        setFormData(data.party_data || {});
        
        if (data.status === "submitted") {
          setSubmitted(true);
        }
      } catch (error) {
        console.error("Failed to fetch party:", error);
        toast.error("Invalid or expired link");
      } finally {
        setLoading(false);
      }
    };
    fetchParty();
  }, [token]);

  const handleSaveAndContinue = async () => {
    setSaving(true);
    try {
      await updatePartyData(token, formData);
      toast.success("Progress saved");
      setCurrentStep(prev => prev + 1);
    } catch (error) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitParty(token, formData);
      setSubmitted(true);
      toast.success("Information submitted successfully!");
    } catch (error) {
      toast.error("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!party) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Not Found</h1>
          <p className="text-gray-600">This link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <BrandedHeader
          companyName={party.company_name}
          companyLogo={party.company_logo}
          propertyAddress={party.property_address}
        />
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Thank You!
          </h1>
          <p className="text-gray-600 mb-6">
            Your information has been submitted successfully. The escrow team will be in touch if they need anything else.
          </p>
          <p className="text-sm text-gray-500">
            You can safely close this page.
          </p>
        </div>
      </div>
    );
  }

  const steps = getSteps(party.entity_type);
  const entityType = party.entity_type || "individual";

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <PersonalInfoStep
            entityType={entityType}
            data={formData}
            onChange={setFormData}
          />
        );
      case 1:
        return (
          <AddressStep
            data={formData}
            onChange={setFormData}
          />
        );
      case 2:
        return (
          <DocumentsStep
            data={formData}
            onChange={setFormData}
          />
        );
      case 3:
        return (
          <CertificationStep
            partyName={formData.firstName ? `${formData.firstName} ${formData.lastName}` : party.display_name}
            partyRole={party.party_role === "transferee" ? "buyer" : "seller"}
            summary={{
              personalInfo: formData,
              address: formData.address || {},
            }}
            onCertify={handleSubmit}
            isSubmitting={submitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <BrandedHeader
        companyName={party.company_name}
        companyLogo={party.company_logo}
        propertyAddress={party.property_address}
      />

      <main className="max-w-4xl mx-auto px-4 py-6 lg:py-8">
        <VerticalStepper steps={steps} currentStepIndex={currentStep}>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            {renderCurrentStep()}

            {/* Navigation - hide on certification step (has its own button) */}
            {currentStep < 3 && (
              <div className="flex justify-between mt-8 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  disabled={currentStep === 0 || saving}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <Button
                  onClick={handleSaveAndContinue}
                  disabled={saving}
                  className="bg-gradient-to-r from-teal-500 to-cyan-600"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Save & Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </VerticalStepper>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Your progress is automatically saved.</p>
          <p className="mt-1">
            Questions? Contact: <a href={`mailto:${party.contact_email}`} className="text-teal-600 hover:underline">{party.contact_email}</a>
          </p>
        </div>
      </main>
    </div>
  );
}
```

---

### Step 6: Create Missing Step Components

**File:** `web/components/party-portal/steps/AddressStep.tsx`

```tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { US_STATES } from "@/lib/constants";

interface AddressStepProps {
  data: any;
  onChange: (data: any) => void;
  errors?: Record<string, string>;
}

export function AddressStep({ data, onChange, errors }: AddressStepProps) {
  const address = data.address || {};

  const handleChange = (field: string, value: string) => {
    onChange({
      ...data,
      address: { ...address, [field]: value },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-teal-600" />
          Mailing Address
        </CardTitle>
        <CardDescription>
          Please provide your current mailing address.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="street">Street Address *</Label>
          <Input
            id="street"
            value={address.street || ""}
            onChange={(e) => handleChange("street", e.target.value)}
            placeholder="123 Main Street, Apt 4B"
            className={errors?.street ? "border-red-500" : ""}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={address.city || ""}
              onChange={(e) => handleChange("city", e.target.value)}
              placeholder="Los Angeles"
            />
          </div>
          <div>
            <Label htmlFor="state">State *</Label>
            <select
              id="state"
              value={address.state || ""}
              onChange={(e) => handleChange("state", e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">Select...</option>
              {US_STATES.map(state => (
                <option key={state.code} value={state.code}>
                  {state.code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="zip">ZIP Code *</Label>
            <Input
              id="zip"
              value={address.zip || ""}
              onChange={(e) => handleChange("zip", e.target.value)}
              placeholder="90001"
              maxLength={10}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### Step 7: Backend — Add Company Logo to Party Response

**File:** `api/app/routes/parties.py`

Update the party fetch to include company branding:

```python
@router.get("/party/{token}")
async def get_party_by_token(token: str, db: Session = Depends(get_db)):
    """Get party data by portal token."""
    
    link = get_valid_link(db, token)
    if not link:
        raise HTTPException(404, "Invalid or expired link")
    
    party = link.party
    report = party.report
    company = report.company
    
    # Get property address
    property_address = ""
    if report.wizard_data and "collection" in report.wizard_data:
        addr = report.wizard_data["collection"].get("propertyAddress", {})
        property_address = f"{addr.get('street', '')}, {addr.get('city', '')} {addr.get('state', '')}"
    
    return {
        "id": str(party.id),
        "display_name": party.display_name,
        "party_role": party.party_role,
        "entity_type": party.entity_type,
        "email": party.email,
        "status": party.status,
        "party_data": party.party_data or {},
        "property_address": property_address,
        # Company branding
        "company_name": company.name if company else "Escrow Company",
        "company_logo": company.logo_url if company and hasattr(company, 'logo_url') else None,
        "contact_email": company.billing_email if company else None,
    }
```

---

## Summary

| Component | Purpose |
|-----------|---------|
| `VerticalStepper.tsx` | Progress indicator (vertical on desktop, horizontal on mobile) |
| `BrandedHeader.tsx` | Company logo + property address header |
| `PersonalInfoStep.tsx` | Dynamic form based on entity type |
| `AddressStep.tsx` | Mailing address collection |
| `CertificationStep.tsx` | Review + certification checkboxes |
| Updated portal page | Main page orchestrating the flow |

**Key Features:**
- ✅ Vertical guided stepper with completion status
- ✅ Mobile-first (horizontal progress bar on mobile)
- ✅ Entity-specific forms (individual vs entity vs trust)
- ✅ Certification language with 4 required checkboxes
- ✅ Company branding in header
- ✅ Auto-save on step completion
