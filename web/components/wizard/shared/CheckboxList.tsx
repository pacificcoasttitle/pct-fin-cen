import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CheckboxOption {
  id: string;
  label: string;
  description?: string;
}

interface CheckboxListProps {
  options: readonly CheckboxOption[] | CheckboxOption[];
  value: string[];
  onChange: (id: string, checked: boolean) => void;
  disabled?: boolean;
}

export function CheckboxList({
  options,
  value,
  onChange,
  disabled = false,
}: CheckboxListProps) {
  return (
    <div className="space-y-3">
      {options.map((option) => (
        <div key={option.id} className="flex items-start space-x-3">
          <Checkbox
            id={option.id}
            checked={value.includes(option.id)}
            onCheckedChange={(checked) => onChange(option.id, !!checked)}
            disabled={disabled}
            className="mt-0.5"
          />
          <div className="space-y-0.5">
            <Label
              htmlFor={option.id}
              className="cursor-pointer font-normal leading-tight"
            >
              {option.label}
            </Label>
            {option.description && (
              <p className="text-xs text-muted-foreground">
                {option.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
