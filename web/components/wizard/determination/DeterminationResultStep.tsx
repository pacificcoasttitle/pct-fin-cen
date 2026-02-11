"use client";

import { useRouter } from "next/navigation";
import { StepCard } from "../shared";
import { DeterminationState, DeterminationResult } from "../types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  ArrowRight, 
  FileText,
  Home 
} from "lucide-react";
import { determine } from "@/lib/api";
import { useState } from "react";

interface DeterminationResultStepProps {
  determination: DeterminationState;
  determinationResult: DeterminationResult | null;
  reportId: string;
  onBeginCollection: () => void;
  onFlush?: () => Promise<void>;
}

export function DeterminationResultStep({
  determination,
  determinationResult,
  reportId,
  onBeginCollection,
  onFlush,
}: DeterminationResultStepProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  if (!determinationResult) {
    return (
      <StepCard
        title="Determination"
        description="Complete the previous steps to see the result."
      >
        <div className="text-center py-8 text-muted-foreground">
          Please answer all required questions.
        </div>
      </StepCard>
    );
  }
  
  const { isReportable, reason } = determinationResult;
  
  const handleBeginCollection = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Flush auto-save to ensure DB has latest wizard data
      if (onFlush) await onFlush();
      // 2. Trigger backend to set status to determination_complete
      await determine(reportId);
      // 3. Tell parent to update local status + navigate to collection
      onBeginCollection();
    } catch (err: any) {
      console.error("Failed to trigger determination:", err);
      setError(err?.message || "Failed to begin data collection. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleViewCertificate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Flush auto-save to ensure DB has latest wizard data
      if (onFlush) await onFlush();
      // 2. Trigger backend to set exempt status
      await determine(reportId);
      // 3. Navigate to certificate page
      router.push(`/app/reports/${reportId}/certificate`);
    } catch (err: any) {
      console.error("Failed:", err);
      setError(err?.message || "Failed to generate certificate. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isReportable) {
    return (
      <StepCard title="Determination Complete">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
              <FileText className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          
          <div>
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
              FinCEN Report Required
            </Badge>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold">This transaction requires a FinCEN report</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              {reason}
            </p>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4 text-left max-w-md mx-auto">
            <p className="text-sm text-muted-foreground">
              <strong>Next steps:</strong> You&apos;ll need to collect information from 
              the buyer and seller(s) to complete the FinCEN Real Estate Report. 
              Reports must be filed within 30 days of closing.
            </p>
          </div>
          
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {error}
            </p>
          )}
          
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push("/app/requests")}
            >
              <Home className="h-4 w-4 mr-2" />
              Back to Requests
            </Button>
            <Button 
              onClick={handleBeginCollection}
              disabled={isLoading}
            >
              Begin Data Collection
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </StepCard>
    );
  }
  
  // EXEMPT
  return (
    <StepCard title="Determination Complete">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div>
          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
            No Report Required
          </Badge>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold">This transaction is exempt</h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            {reason}
          </p>
        </div>
        
        <div className="bg-muted/50 rounded-lg p-4 text-left max-w-md mx-auto">
          <p className="text-sm text-muted-foreground">
            No FinCEN Real Estate Report is required for this transaction. 
            You can download an exemption certificate for your records.
          </p>
        </div>
        
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {error}
          </p>
        )}
        
        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push("/app/requests")}
          >
            <Home className="h-4 w-4 mr-2" />
            Back to Requests
          </Button>
          <Button 
            variant="secondary"
            onClick={handleViewCertificate}
            disabled={isLoading}
          >
            <FileText className="h-4 w-4 mr-2" />
            View Certificate
          </Button>
        </div>
      </div>
    </StepCard>
  );
}
