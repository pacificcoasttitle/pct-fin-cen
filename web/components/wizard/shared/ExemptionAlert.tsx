import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ExemptionAlertProps {
  type: "exempt" | "reportable";
  title?: string;
  description: string;
}

export function ExemptionAlert({ type, title, description }: ExemptionAlertProps) {
  if (type === "exempt") {
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">
          {title || "This transfer appears to be exempt"}
        </AlertTitle>
        <AlertDescription className="text-amber-700">
          {description}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-green-200 bg-green-50">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-800">
        {title || "FinCEN Report Required"}
      </AlertTitle>
      <AlertDescription className="text-green-700">
        {description}
      </AlertDescription>
    </Alert>
  );
}
