"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepCard } from "../shared";
import { WizardState } from "../types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, 
  MapPin, 
  DollarSign, 
  Calendar,
  Users,
  Building2,
  AlertCircle,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { fileReport } from "@/lib/api";
import { toast } from "sonner";

interface ReviewAndFileStepProps {
  reportId: string;
  wizardData: WizardState;
}

export function ReviewAndFileStep({ reportId, wizardData }: ReviewAndFileStepProps) {
  const router = useRouter();
  const [isCertified, setIsCertified] = useState(false);
  const [isFiling, setIsFiling] = useState(false);
  const [filingResult, setFilingResult] = useState<{
    success: boolean;
    receiptId?: string;
    message?: string;
  } | null>(null);
  
  const collection = wizardData.collection;
  const determination = wizardData.determination;
  
  const handleFile = async () => {
    if (!isCertified) {
      toast.error("Please certify the information before filing");
      return;
    }
    
    setIsFiling(true);
    try {
      const result = await fileReport(reportId);
      
      if (result.ok) {
        setFilingResult({
          success: true,
          receiptId: result.receipt_id,
          message: result.message,
        });
        toast.success("Report filed successfully!");
      } else {
        setFilingResult({
          success: false,
          message: result.message || "Filing failed",
        });
        toast.error(result.message || "Filing failed");
      }
    } catch (error: any) {
      setFilingResult({
        success: false,
        message: error.message || "An error occurred",
      });
      toast.error("Failed to file report");
    } finally {
      setIsFiling(false);
    }
  };
  
  // Filing Success View
  if (filingResult?.success) {
    return (
      <StepCard title="Filing Complete">
        <div className="text-center space-y-6 py-8">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold">Report Submitted Successfully</h3>
            <p className="text-muted-foreground mt-2">
              Your FinCEN Real Estate Report has been submitted for processing.
            </p>
          </div>
          
          {filingResult.receiptId && (
            <div className="bg-muted/50 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-muted-foreground">Receipt ID</p>
              <p className="font-mono font-semibold">{filingResult.receiptId}</p>
            </div>
          )}
          
          <Button onClick={() => router.push("/app/requests")}>
            Back to Requests
          </Button>
        </div>
      </StepCard>
    );
  }
  
  return (
    <StepCard
      title="Review & File"
      description="Review the information below and submit your FinCEN Real Estate Report."
    >
      <div className="space-y-6">
        {/* Transaction Summary */}
        <Card className="p-4">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Transaction Summary
          </h3>
          
          <div className="grid gap-4 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Property</p>
                <p className="text-muted-foreground">
                  {collection.propertyAddress?.street}, {collection.propertyAddress?.city}, {collection.propertyAddress?.state} {collection.propertyAddress?.zip}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Purchase Price</p>
                <p className="text-muted-foreground">
                  ${collection.purchasePrice?.toLocaleString() || "N/A"}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Closing Date</p>
                <p className="text-muted-foreground">
                  {collection.closingDate || "N/A"}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Buyer Type</p>
                <p className="text-muted-foreground capitalize">
                  {determination.buyerType || "N/A"}
                  {determination.isStatutoryTrust && " (Statutory Trust)"}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Reporting Person</p>
                <p className="text-muted-foreground">
                  {collection.reportingPerson?.companyName || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Filing Error */}
        {filingResult && !filingResult.success && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {filingResult.message || "Filing failed. Please try again."}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Certification */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="certify"
              checked={isCertified}
              onCheckedChange={(checked) => setIsCertified(!!checked)}
            />
            <div className="space-y-1">
              <Label htmlFor="certify" className="cursor-pointer font-medium">
                I certify this information is accurate
              </Label>
              <p className="text-xs text-muted-foreground">
                By checking this box, I certify that to the best of my knowledge, 
                the information provided is complete and accurate. I understand that 
                filing false information with FinCEN may result in civil or criminal penalties.
              </p>
            </div>
          </div>
        </div>
        
        {/* File Button */}
        <Button
          onClick={handleFile}
          disabled={!isCertified || isFiling}
          className="w-full"
          size="lg"
        >
          {isFiling ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Filing Report...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Submit FinCEN Report
            </>
          )}
        </Button>
        
        <p className="text-xs text-center text-muted-foreground">
          Reports are submitted securely via FinCEN&apos;s SDTM system.
        </p>
      </div>
    </StepCard>
  );
}
