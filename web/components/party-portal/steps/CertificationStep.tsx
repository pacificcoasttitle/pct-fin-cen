"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Shield, FileText, Send, Loader2 } from "lucide-react";
import { type PartySubmissionData, type AddressData } from "../types";

interface CertificationStepProps {
  entityType: "individual" | "entity" | "trust";
  partyRole: "transferee" | "transferor" | "beneficial_owner";
  data: Partial<PartySubmissionData>;
  onChange: (data: Partial<PartySubmissionData>) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  disabled?: boolean;
}

export function CertificationStep({
  entityType,
  partyRole,
  data,
  onChange,
  onSubmit,
  isSubmitting,
  disabled,
}: CertificationStepProps) {
  const [expandedReview, setExpandedReview] = useState(true);

  const update = <K extends keyof PartySubmissionData>(field: K, value: PartySubmissionData[K]) => {
    onChange({ ...data, [field]: value });
  };

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Get display name
  const displayName = entityType === "individual"
    ? `${data.first_name || ""} ${data.last_name || ""}`.trim()
    : entityType === "entity"
      ? data.entity_name || ""
      : data.trust_name || "";

  // Get role display
  const roleDisplay = partyRole === "transferee" ? "buyer/transferee" : "seller/transferor";

  // Build address summary
  const address = data.address as AddressData | undefined;
  const addressSummary = address
    ? `${address.street || ""}${address.unit ? `, ${address.unit}` : ""}, ${address.city || ""}, ${address.state || ""} ${address.zip || ""}`
    : "Not provided";

  const allChecked = data.certified === true && !!data.certification_signature;

  return (
    <div className="space-y-6">
      {/* Review Summary */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setExpandedReview(!expandedReview)}>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-teal-600" />
            Review Your Information
          </CardTitle>
          <CardDescription>
            Please verify everything is correct before certifying.
          </CardDescription>
        </CardHeader>
        {expandedReview && (
          <CardContent className="space-y-4">
            {/* Personal/Entity/Trust Info */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-sm text-gray-800 mb-2">
                {entityType === "individual" ? "Personal Information" : entityType === "entity" ? "Entity Information" : "Trust Information"}
              </h4>
              <div className="text-sm text-gray-600 space-y-1">
                {entityType === "individual" ? (
                  <>
                    <p><strong>Name:</strong> {data.first_name} {data.middle_name ? `${data.middle_name} ` : ""}{data.last_name}{data.suffix ? `, ${data.suffix}` : ""}</p>
                    {data.date_of_birth && <p><strong>Date of Birth:</strong> {data.date_of_birth}</p>}
                    {data.ssn && <p><strong>SSN:</strong> ***-**-{data.ssn.slice(-4)}</p>}
                    {data.phone && <p><strong>Phone:</strong> {data.phone}</p>}
                  </>
                ) : entityType === "entity" ? (
                  <>
                    <p><strong>Entity:</strong> {data.entity_name}</p>
                    {data.entity_type && <p><strong>Type:</strong> {data.entity_type}</p>}
                    {data.ein && <p><strong>EIN:</strong> **-***{data.ein.slice(-4)}</p>}
                    {data.formation_state && <p><strong>State:</strong> {data.formation_state}</p>}
                    {data.signer_name && <p><strong>Auth Rep:</strong> {data.signer_name}{data.signer_title ? `, ${data.signer_title}` : ""}</p>}
                  </>
                ) : (
                  <>
                    <p><strong>Trust:</strong> {data.trust_name}</p>
                    {data.trust_type && <p><strong>Type:</strong> {data.trust_type}</p>}
                    {data.trust_date && <p><strong>Date Executed:</strong> {data.trust_date}</p>}
                    {data.signer_name && <p><strong>Trustee:</strong> {data.signer_name}</p>}
                  </>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-sm text-gray-800 mb-2">Address</h4>
              <p className="text-sm text-gray-600">{addressSummary}</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Certification */}
      <Card className="border-2 border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <Shield className="w-5 h-5" />
            Certification &amp; Acknowledgment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
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

          {/* Single Certification Checkbox */}
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id="cert-acknowledge"
                checked={data.certified || false}
                onCheckedChange={(checked) => {
                  if (checked === true) {
                    onChange({ ...data, certified: true, certification_date: today });
                  } else {
                    onChange({ ...data, certified: false });
                  }
                }}
                className="mt-1"
                disabled={disabled}
              />
              <label htmlFor="cert-acknowledge" className="text-sm text-gray-700 leading-relaxed cursor-pointer select-none">
                I certify that all information I have provided is <strong>true, accurate, and complete</strong> to
                the best of my knowledge. I understand that I am responsible for the accuracy of this information.
                I am authorized to provide this information as the {roleDisplay} or as an authorized
                representative. I consent to the submission of this information to the Financial Crimes
                Enforcement Network (FinCEN) as required by federal regulations.
              </label>
            </div>
          </div>

          {/* Electronic Signature */}
          {data.certified && (
            <div className="pt-4 border-t border-amber-200 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cert-signature">Electronic Signature (Type Full Legal Name) *</Label>
                  <Input
                    id="cert-signature"
                    value={data.certification_signature || ""}
                    onChange={(e) => update("certification_signature", e.target.value)}
                    placeholder={displayName || "John A. Smith"}
                    disabled={disabled}
                    className="font-medium"
                  />
                </div>
                <div>
                  <Label htmlFor="cert-date">Date</Label>
                  <Input
                    id="cert-date"
                    value={today}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              {data.certification_signature && (
                <div className="flex items-center gap-2 text-green-700 bg-green-100 rounded-lg p-3">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Electronically signed by {data.certification_signature}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        onClick={onSubmit}
        disabled={!allChecked || isSubmitting || disabled}
        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 py-6 text-lg rounded-xl shadow-lg shadow-green-500/25"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="w-5 h-5 mr-2" />
            I Certify This Information Is Accurate — Submit
          </>
        )}
      </Button>

      {!allChecked && (
        <p className="text-center text-sm text-amber-600">
          Please check the certification box and sign above to submit.
        </p>
      )}
    </div>
  );
}
