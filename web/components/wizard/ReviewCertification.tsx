"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Building, 
  User, 
  Users, 
  CreditCard, 
  MapPin, 
  Lock,
  CheckCircle,
  FileText,
  Edit3,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Party {
  id: string;
  display_name: string;
  party_role: "transferee" | "transferor";
  entity_type: string;
  email: string;
  party_data?: {
    // Individual fields
    first_name?: string;
    last_name?: string;
    ssn?: string;
    date_of_birth?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
    // Entity fields
    entity_name?: string;
    ein?: string;
    entity_type?: string;
    beneficial_owners?: Array<{
      first_name: string;
      last_name: string;
      ownership_percentage: number;
      ssn?: string;
    }>;
    // Trust fields
    trust_name?: string;
    trust_ein?: string;
    trustees?: Array<{
      first_name: string;
      last_name: string;
    }>;
  };
  status: string;
}

interface PaymentSource {
  method: string;
  institution_name?: string;
  amount: number;
}

interface TransactionData {
  propertyAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    county?: string;
  };
  closingDate: string;
  purchasePrice: number;
}

interface ReviewCertificationProps {
  transaction: TransactionData;
  buyers: Party[];
  sellers: Party[];
  paymentSources: PaymentSource[];
  reportingPerson: {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
  };
  onRequestCorrection: (partyId: string) => void;
  onCertify: (certification: CertificationData) => void;
  onBack: () => void;
  certifierName: string;
  isSubmitting?: boolean;
}

export interface CertificationData {
  certified_by_name: string;
  certified_by_email: string;
  certified_at: string;
  certification_checkboxes: {
    reviewed_transaction: boolean;
    reviewed_parties: boolean;
    reviewed_payment: boolean;
    accuracy_confirmed: boolean;
  };
  ip_address?: string;
}

export function ReviewCertification({
  transaction,
  buyers,
  sellers,
  paymentSources,
  reportingPerson,
  onRequestCorrection,
  onCertify,
  onBack,
  certifierName,
  isSubmitting = false,
}: ReviewCertificationProps) {
  const [checkboxes, setCheckboxes] = useState({
    reviewed_transaction: false,
    reviewed_parties: false,
    reviewed_payment: false,
    accuracy_confirmed: false,
  });

  const allChecked = Object.values(checkboxes).every(Boolean);

  const handleCheckbox = (key: keyof typeof checkboxes) => {
    setCheckboxes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCertify = () => {
    const certification: CertificationData = {
      certified_by_name: certifierName,
      certified_by_email: reportingPerson.email,
      certified_at: new Date().toISOString(),
      certification_checkboxes: checkboxes,
    };
    onCertify(certification);
  };

  const maskSSN = (ssn?: string) => {
    if (!ssn) return "Not provided";
    return `***-**-${ssn.slice(-4)}`;
  };

  const maskEIN = (ein?: string) => {
    if (!ein) return "Not provided";
    return `**-***${ein.slice(-4)}`;
  };

  const formatAddress = (addr?: { street?: string; city?: string; state?: string; zip?: string }) => {
    if (!addr) return "Not provided";
    return `${addr.street || ""}, ${addr.city || ""}, ${addr.state || ""} ${addr.zip || ""}`.trim();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Review & Certify</h1>
        <p className="text-gray-600 mt-2">
          Please review all information before filing with FinCEN
        </p>
      </div>

      {/* Read-Only Notice */}
      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
        <Lock className="w-4 h-4 flex-shrink-0" />
        <span>
          Party-submitted information is locked. Use &quot;Request Correction&quot; if changes are needed.
        </span>
      </div>

      {/* Transaction Details */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="w-5 h-5 text-gray-500" />
              Transaction Details
            </CardTitle>
            <Badge variant="outline" className="text-green-600 border-green-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Property Address</p>
              <p className="font-medium">{formatAddress(transaction.propertyAddress)}</p>
              {transaction.propertyAddress.county && (
                <p className="text-sm text-gray-500">County: {transaction.propertyAddress.county}</p>
              )}
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-500">Closing Date</p>
                <p className="font-medium">{transaction.closingDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Purchase Price</p>
                <p className="font-medium">{formatCurrency(transaction.purchasePrice)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buyers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-gray-500" />
            Buyer(s) / Transferee(s)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {buyers.map((buyer) => (
            <div key={buyer.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {buyer.entity_type === "individual" ? (
                    <User className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Building className="w-4 h-4 text-gray-500" />
                  )}
                  <span className="font-semibold">{buyer.display_name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {buyer.entity_type}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRequestCorrection(buyer.id)}
                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                >
                  <Edit3 className="w-4 h-4 mr-1" />
                  Request Correction
                </Button>
              </div>
              
              {buyer.party_data && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {buyer.entity_type === "individual" ? (
                    <>
                      <div>
                        <p className="text-gray-500">SSN</p>
                        <p className="font-medium">{maskSSN(buyer.party_data.ssn)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Date of Birth</p>
                        <p className="font-medium">{buyer.party_data.date_of_birth || "Not provided"}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-gray-500">Address</p>
                        <p className="font-medium">{formatAddress(buyer.party_data.address)}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-gray-500">EIN</p>
                        <p className="font-medium">{maskEIN(buyer.party_data.ein || buyer.party_data.trust_ein)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Entity Type</p>
                        <p className="font-medium">{buyer.party_data.entity_type || buyer.entity_type}</p>
                      </div>
                      
                      {/* Beneficial Owners */}
                      {buyer.party_data.beneficial_owners && buyer.party_data.beneficial_owners.length > 0 && (
                        <div className="md:col-span-2 mt-2">
                          <p className="text-gray-500 mb-2">Beneficial Owners</p>
                          <div className="space-y-2">
                            {buyer.party_data.beneficial_owners.map((bo, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border">
                                <span className="font-medium">{bo.first_name} {bo.last_name}</span>
                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                  <span>{bo.ownership_percentage}% ownership</span>
                                  <span>SSN: {maskSSN(bo.ssn)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Trustees for trusts */}
                      {buyer.party_data.trustees && buyer.party_data.trustees.length > 0 && (
                        <div className="md:col-span-2 mt-2">
                          <p className="text-gray-500 mb-2">Trustees</p>
                          <div className="space-y-1">
                            {buyer.party_data.trustees.map((trustee, idx) => (
                              <p key={idx} className="font-medium">
                                {trustee.first_name} {trustee.last_name}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          {buyers.length === 0 && (
            <p className="text-sm text-gray-500 italic">No buyer information submitted yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Sellers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5 text-gray-500" />
            Seller(s) / Transferor(s)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sellers.map((seller) => (
            <div key={seller.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {seller.entity_type === "individual" ? (
                    <User className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Building className="w-4 h-4 text-gray-500" />
                  )}
                  <span className="font-semibold">{seller.display_name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {seller.entity_type}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRequestCorrection(seller.id)}
                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                >
                  <Edit3 className="w-4 h-4 mr-1" />
                  Request Correction
                </Button>
              </div>
              
              {seller.party_data && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {seller.entity_type === "individual" ? (
                    <>
                      <div>
                        <p className="text-gray-500">SSN</p>
                        <p className="font-medium">{maskSSN(seller.party_data.ssn)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Address</p>
                        <p className="font-medium">{formatAddress(seller.party_data.address)}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-gray-500">EIN</p>
                        <p className="font-medium">{maskEIN(seller.party_data.ein)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Entity Type</p>
                        <p className="font-medium">{seller.party_data.entity_type || seller.entity_type}</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          {sellers.length === 0 && (
            <p className="text-sm text-gray-500 italic">No seller information submitted yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Payment Sources */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5 text-gray-500" />
            Payment Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {paymentSources.map((payment, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{payment.method}</p>
                  {payment.institution_name && (
                    <p className="text-sm text-gray-500">{payment.institution_name}</p>
                  )}
                </div>
                <p className="font-semibold">{formatCurrency(payment.amount)}</p>
              </div>
            ))}
            {paymentSources.length === 0 && (
              <p className="text-sm text-gray-500 italic">No payment source information available.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reporting Person */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building className="w-5 h-5 text-gray-500" />
            Reporting Person
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Company</p>
              <p className="font-medium">{reportingPerson.companyName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Contact</p>
              <p className="font-medium">{reportingPerson.contactName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{reportingPerson.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">{reportingPerson.phone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certification Section */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-blue-900">
            <CheckCircle className="w-5 h-5" />
            Certification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={checkboxes.reviewed_transaction}
                onCheckedChange={() => handleCheckbox("reviewed_transaction")}
                className="mt-1"
              />
              <span className="text-sm text-gray-700">
                I have reviewed the transaction details including property address, closing date, and purchase price.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={checkboxes.reviewed_parties}
                onCheckedChange={() => handleCheckbox("reviewed_parties")}
                className="mt-1"
              />
              <span className="text-sm text-gray-700">
                I have reviewed all buyer and seller information, including beneficial ownership details where applicable.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={checkboxes.reviewed_payment}
                onCheckedChange={() => handleCheckbox("reviewed_payment")}
                className="mt-1"
              />
              <span className="text-sm text-gray-700">
                I have reviewed the payment source information and confirmed it accurately reflects the transaction.
              </span>
            </label>

            <div className="border-t pt-3 mt-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={checkboxes.accuracy_confirmed}
                  onCheckedChange={() => handleCheckbox("accuracy_confirmed")}
                  className="mt-1"
                />
                <span className="text-sm font-medium text-gray-900">
                  I certify that I have reviewed the above information and confirm it is accurate and complete to the best of my knowledge. I understand that this information will be submitted to FinCEN as required by federal law.
                </span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600">
              <strong>Certified by:</strong> {certifierName}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Date:</strong> {new Date().toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          &larr; Back to Review
        </Button>
        <Button
          onClick={handleCertify}
          disabled={!allChecked || isSubmitting}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
        >
          {isSubmitting ? (
            <>Submitting...</>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Certify &amp; File with FinCEN
            </>
          )}
        </Button>
      </div>

      {!allChecked && (
        <p className="text-center text-sm text-amber-600">
          Please check all boxes above to certify and file.
        </p>
      )}
    </div>
  );
}
