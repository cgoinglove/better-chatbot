"use client";

import { ToolUIPart } from "ai";
import { BarChart2, Loader } from "lucide-react";
import { Button } from "ui/button";
import { appStore } from "@/app/store";
import type { E2BExecutionResult } from "lib/e2b/types";
import { generateUUID } from "lib/utils";

interface ExecutePythonInvocationProps {
  part: ToolUIPart;
}

export function ExecutePythonInvocation({
  part,
}: ExecutePythonInvocationProps) {
  const mutate = appStore((s) => s.mutate);

  const isRunning =
    part.state === "input-streaming" || part.state === "input-available";
  const isComplete = part.state === "output-available";

  const result = isComplete ? (part.output as E2BExecutionResult) : null;
  const input = part.input as { code?: string; fileName?: string } | undefined;

  const handleViewResults = () => {
    if (!result || !input?.code) return;
    mutate({
      activeArtifact: {
        id: part.toolCallId ?? generateUUID(),
        code: input.code,
        stdout: result.stdout,
        stderr: result.stderr,
        images: result.images,
        title: input.fileName
          ? `${input.fileName} analysis`
          : "Python analysis",
        sessionId: result.sessionId,
      },
    });
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm my-1">
      <div className="flex items-center gap-2.5">
        {isRunning ? (
          <Loader className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <BarChart2 className="size-4 text-muted-foreground" />
        )}
        <div>
          <p className="font-medium leading-tight">
            {isRunning ? "Running analysis..." : "Data Analysis Complete"}
          </p>
          {input?.fileName && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {input.fileName}
            </p>
          )}
        </div>
      </div>
      {isComplete && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleViewResults}
          className="h-7 text-xs"
        >
          View Results
        </Button>
      )}
    </div>
  );
}
