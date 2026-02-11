import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { YesNo } from "../types";

interface YesNoQuestionProps {
  question: string;
  description?: string;
  value: YesNo;
  onChange: (value: "yes" | "no") => void;
  yesLabel?: string;
  noLabel?: string;
  disabled?: boolean;
}

export function YesNoQuestion({
  question,
  description,
  value,
  onChange,
  yesLabel = "Yes",
  noLabel = "No",
  disabled = false,
}: YesNoQuestionProps) {
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
        onValueChange={(v) => onChange(v as "yes" | "no")}
        className="flex gap-6"
        disabled={disabled}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="yes" id={`${id}-yes`} />
          <Label
            htmlFor={`${id}-yes`}
            className="cursor-pointer font-normal"
          >
            {yesLabel}
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="no" id={`${id}-no`} />
          <Label
            htmlFor={`${id}-no`}
            className="cursor-pointer font-normal"
          >
            {noLabel}
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
