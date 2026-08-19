"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Mail, Pencil, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { markdownToHtmlEmail } from "@/lib/email/email-body-format";

export type EmailPreviewOutcome = "approved" | "rejected";

interface EmailPreviewProps {
  to: string;
  subject: string;
  body: string;
  onApprove?: (editedBody: string) => void;
  onReject?: () => void;
  isLoading?: boolean;
  /**
   * Set once the tool call has a result. The card then renders read-only —
   * a settled draft is a record of what was sent, not something to edit.
   */
  outcome?: EmailPreviewOutcome;
}

/**
 * EmailPreviewUI Component
 *
 * Displays an email draft for user review before it is handed to an email
 * tool. The draft arrives as markdown-flavoured text, which no mail client
 * renders — so the card shows the *rendered* body by default and keeps the
 * raw text behind an explicit Edit toggle.
 *
 * Features:
 * - Rendered preview matching what the recipient will see
 * - Editable email body (textarea)
 * - Approve & Send / Reject
 * - Loading state during generation
 * - Read-only completed state after approval/rejection
 */
export function EmailPreviewUI({
  to,
  subject,
  body: initialBody,
  onApprove,
  onReject,
  isLoading = false,
  outcome,
}: EmailPreviewProps) {
  const [body, setBody] = useState(initialBody);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleApprove = useCallback(() => {
    setIsConfirmed(true);
    onApprove?.(body);
  }, [body, onApprove]);

  const handleReject = useCallback(() => {
    setIsRejected(true);
    onReject?.();
  }, [onReject]);

  const isCompleted = Boolean(outcome) || isConfirmed || isRejected;
  const approved = outcome ? outcome === "approved" : isConfirmed;
  const rejected = outcome ? outcome === "rejected" : isRejected;

  const renderedBody = useMemo(() => markdownToHtmlEmail(body), [body]);

  const headerStatus = isCompleted
    ? {
        Icon: approved ? CheckCircle2 : AlertCircle,
        label: approved ? "Email Approved" : "Email Rejected",
        className: approved ? "text-emerald-600" : "text-red-600",
      }
    : null;

  return (
    <div
      className={cn(
        "my-3 overflow-hidden rounded-lg border bg-background shadow-sm",
        rejected ? "border-destructive" : "border-border",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Mail className="h-3.5 w-3.5" aria-hidden />
        Email Creator
        {headerStatus && (
          <span
            className={cn(
              "ml-auto flex items-center gap-1 text-xs font-semibold",
              headerStatus.className,
            )}
          >
            <headerStatus.Icon className="h-4 w-4" aria-hidden />
            {headerStatus.label}
          </span>
        )}
      </div>

      {/* Email Details */}
      <div className="divide-y divide-border text-sm text-foreground">
        {/* To Field */}
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            To
          </span>
          <span className="ml-4 flex-1 break-words text-right text-foreground">
            {to}
          </span>
        </div>

        {/* Subject Field */}
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Subject
          </span>
          <span className="ml-4 flex-1 break-words text-right text-foreground">
            {subject}
          </span>
        </div>

        {/* Body Field */}
        <div className="px-4 py-4">
          {isLoading ? (
            <div className="space-y-2" aria-live="polite" aria-busy="true">
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
              <span className="sr-only">Generating email body…</span>
            </div>
          ) : isEditing && !isCompleted ? (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full resize-none whitespace-pre-wrap rounded border border-input bg-background p-2 text-sm leading-relaxed text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              rows={Math.min(body.split("\n").length + 1, 15)}
              placeholder="Email body..."
              autoFocus
            />
          ) : (
            // Safe: markdownToHtmlEmail escapes the draft before it adds any
            // markup, and only emits inline-styled block/emphasis tags.
            <div
              className="email-preview-body text-sm leading-relaxed text-foreground [&_a]:underline [&_li]:list-disc [&_ol_li]:list-decimal [&_p:last-child]:mb-0"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: content is escaped in markdownToHtmlEmail
              dangerouslySetInnerHTML={{ __html: renderedBody }}
            />
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {!isCompleted && (
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mr-auto"
            onClick={() => setIsEditing((editing) => !editing)}
            disabled={isLoading}
          >
            {isEditing ? (
              <>
                <Eye className="h-3.5 w-3.5" aria-hidden />
                Preview
              </>
            ) : (
              <>
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Edit
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReject}
            disabled={isLoading}
          >
            Reject
          </Button>
          <Button type="button" onClick={handleApprove} disabled={isLoading}>
            Approve & Send
          </Button>
        </div>
      )}
    </div>
  );
}
