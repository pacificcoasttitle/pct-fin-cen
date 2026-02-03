// ReceiptId.tsx — Copyable receipt ID display with consistent styling
//
// USAGE:
//   <ReceiptId value="31000123456789" />
//   <ReceiptId value="31000123456789" truncate />
//   <ReceiptId value="31000123456789" size="lg" />

"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

interface ReceiptIdProps {
  value: string;
  size?: "sm" | "md" | "lg";
  truncate?: boolean;
  truncateLength?: number;
  className?: string;
  showLabel?: boolean;
}

export function ReceiptId({
  value,
  size = "sm",
  truncate = false,
  truncateLength = 8,
  className,
  showLabel = false,
}: ReceiptIdProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy receipt ID:", err);
    }
  };

  const displayValue = truncate && value.length > truncateLength
    ? `${value.slice(0, truncateLength)}...`
    : value;

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const iconSizeClasses = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleCopy}
            className={cn(
              "inline-flex items-center gap-1 font-mono text-emerald-600 hover:text-emerald-700 transition-colors",
              sizeClasses[size],
              className
            )}
            title="Click to copy"
          >
            {showLabel && <span className="text-gray-500 font-sans">Receipt ID: </span>}
            <span>{displayValue}</span>
            {copied ? (
              <Check className={cn(iconSizeClasses[size], "text-emerald-500")} />
            ) : (
              <Copy className={cn(iconSizeClasses[size], "opacity-50 hover:opacity-100")} />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? "Copied!" : "Click to copy receipt ID"}</p>
          {truncate && value.length > truncateLength && (
            <p className="font-mono text-xs mt-1">{value}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INLINE RECEIPT ID (non-interactive, for tables)
// ═══════════════════════════════════════════════════════════════════════════
interface InlineReceiptIdProps {
  value: string;
  size?: "sm" | "md";
  className?: string;
}

export function InlineReceiptId({
  value,
  size = "sm",
  className,
}: InlineReceiptIdProps) {
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
  };

  return (
    <span
      className={cn(
        "font-mono text-emerald-600",
        sizeClasses[size],
        className
      )}
    >
      {value}
    </span>
  );
}

export default ReceiptId;
