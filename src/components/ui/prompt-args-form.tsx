"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type MCPPromptArg } from "@/lib/hooks/use-mcp-prompts";

interface PromptArgsFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (args: Record<string, any>) => void;
  promptName: string;
  serverName: string;
  args: MCPPromptArg[];
}

export function PromptArgsForm({
  isOpen,
  onClose,
  onSubmit,
  promptName,
  serverName,
  args,
}: PromptArgsFormProps) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when opened with a new prompt
  useEffect(() => {
    if (isOpen) {
      setValues({});
      setErrors({});
    }
  }, [isOpen, promptName, serverName]);

  const handleChange = (name: string, value: any) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when field is updated
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required arguments
    const newErrors: Record<string, string> = {};
    args.forEach((arg) => {
      if (
        arg.required &&
        (!values[arg.name] || values[arg.name].toString().trim() === "")
      ) {
        newErrors[arg.name] = "This field is required";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(values);
  };

  // Render the appropriate input control based on argument description
  const renderField = (arg: MCPPromptArg) => {
    const isLongText = arg.description?.includes("multiline") || 
                       arg.description?.includes("text area") ||
                       arg.name.toLowerCase().includes("content") ||
                       arg.name.toLowerCase().includes("description");

    return (
      <div key={arg.name} className="space-y-2 mb-4">
        <Label htmlFor={`arg-${arg.name}`} className="flex items-center">
          {arg.name}
          {arg.required && <span className="text-red-500 ml-1">*</span>}
        </Label>

        {arg.description && (
          <p className="text-sm text-muted-foreground">{arg.description}</p>
        )}

        {isLongText ? (
          <Textarea
            id={`arg-${arg.name}`}
            value={values[arg.name] || ""}
            onChange={(e) => handleChange(arg.name, e.target.value)}
            className={errors[arg.name] ? "border-red-500" : ""}
            placeholder={`Enter ${arg.name}...`}
            rows={4}
          />
        ) : (
          <Input
            id={`arg-${arg.name}`}
            value={values[arg.name] || ""}
            onChange={(e) => handleChange(arg.name, e.target.value)}
            className={errors[arg.name] ? "border-red-500" : ""}
            placeholder={`Enter ${arg.name}...`}
          />
        )}

        {errors[arg.name] && (
          <p className="text-sm text-red-500">{errors[arg.name]}</p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {promptName}
            <span className="text-xs text-muted-foreground ml-2">
              from {serverName}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {args.map(renderField)}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Execute Prompt</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}