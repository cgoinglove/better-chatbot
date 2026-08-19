"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RequestInputProps {
  label: string;
  placeholder: string;
  inputType?: "text" | "password" | "number" | "email" | "url";
  onSubmit: (value: string) => void;
}

/**
 * RequestInputUI Component
 *
 * Blocks AI execution to collect user input.
 * Adapted from mastra-hitl for AI SDK 6.
 *
 * Features:
 * - Input field with label and placeholder
 * - Submit button
 * - Submitted state showing the value
 * - Keyboard support (Enter to submit)
 * - Type validation based on inputType
 */
export function RequestInputUI({
  label,
  placeholder,
  inputType = "text",
  onSubmit,
}: RequestInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedValue, setSubmittedValue] = useState("");

  const trimmedInput = inputValue.trim();
  const isInputValid = trimmedInput.length > 0;

  const handleSubmit = useCallback(() => {
    if (!isInputValid) return;

    setSubmittedValue(trimmedInput);
    setIsSubmitted(true);
    onSubmit(trimmedInput);
  }, [trimmedInput, isInputValid, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !isSubmitted && isInputValid) {
        handleSubmit();
      }
    },
    [handleSubmit, isSubmitted, isInputValid],
  );

  return (
    <div className="my-3">
      <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          User Input Required
          {isSubmitted && (
            <span className="ml-auto flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Submitted
            </span>
          )}
        </div>

        <div className="space-y-3 px-4 py-4 text-sm text-muted-foreground">
          <p className="text-foreground">{label}</p>

          {isSubmitted ? (
            <div className="whitespace-pre-wrap rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground">
              {inputType === "password" ? "••••••••" : submittedValue}
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Provide the requested information so the assistant can continue.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type={inputType}
                  className={cn(
                    "h-10 rounded-md border-border bg-background text-sm text-foreground",
                    "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  )}
                  aria-label={label}
                  placeholder={placeholder}
                  onChange={(e) => setInputValue(e.target.value)}
                  value={inputValue}
                  disabled={isSubmitted}
                  onKeyDown={handleKeyDown}
                />
                <Button
                  type="button"
                  className="sm:self-start"
                  onClick={handleSubmit}
                  disabled={!isInputValid || isSubmitted}
                >
                  Submit
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
