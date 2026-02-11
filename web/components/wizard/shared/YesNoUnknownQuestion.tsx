import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { YesNoUnknown } from "../types";

interface YesNoUnknownQuestionProps {
  question: string;
  description?: string;
  value: YesNoUnknown;
  onChange: (value: "yes" | "no" | "unknown") => void;
  yesLabel?: string;
  noLabel?: string;
  unknownLabel?: string;
  disabled?: boolean;
}

export function YesNoUnknownQuestion({
  question,
  description,
  value,
  onChange,
  yesLabel = "Yes",
  noLabel = "No",
  unknownLabel = "Unknown",
  disabled = false,
}: YesNoUnknownQuestionProps) {
  // Create a stable id from the question text
  const id = question.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "").toLowerCase();

  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium text-base">{question}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      <RadioGroup
        value={value || undefined}
        onValueChange={(v) => onChange(v as "yes" | "no" | "unknown")}
        className="flex gap-6"
        disabled={disabled}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="yes" id={`${id}-yes`} />
          <Label htmlFor={`${id}-yes`} className="cursor-pointer font-normal">
            {yesLabel}
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="no" id={`${id}-no`} />
          <Label htmlFor={`${id}-no`} className="cursor-pointer font-normal">
            {noLabel}
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="unknown" id={`${id}-unknown`} />
          <Label htmlFor={`${id}-unknown`} className="cursor-pointer font-normal">
            {unknownLabel}
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
