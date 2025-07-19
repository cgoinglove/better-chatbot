"use client";

import { ToolInvocationUIPart } from "app-types/chat";

import { toAny } from "lib/utils";

import { memo, useMemo } from "react";
import { BrainIcon } from "lucide-react";
import { Card, CardContent } from "ui/card";
import { Badge } from "ui/badge";
import { Separator } from "ui/separator";
import { TextShimmer } from "ui/text-shimmer";
import { SequentialThinkingResult } from "lib/ai/tools/thinking/sequential-thinking";

interface SequentialThinkingToolInvocationProps {
  part: ToolInvocationUIPart["toolInvocation"];
}

function PureSequentialThinkingToolInvocation({
  part,
}: SequentialThinkingToolInvocationProps) {
  const result = useMemo(() => {
    if (part.state !== "result") return null;
    return toAny(part).result as SequentialThinkingResult & {
      isError?: boolean;
      error?: string;
    };
  }, [part.state]);

  const thoughtData = useMemo(() => {
    if (!result) return null;
    return result.thoughtData;
  }, [result]);

  if (part.state !== "result") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <BrainIcon className="size-5 wiggle text-muted-foreground" />
        <TextShimmer>Thinking...</TextShimmer>
      </div>
    );
  }

  if (result?.isError) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <BrainIcon className="size-5 text-destructive" />
          <span className="text-sm font-semibold text-destructive">
            Thinking Error
          </span>
        </div>
        <div className="flex gap-2">
          <div className="px-2.5">
            <Separator
              orientation="vertical"
              className="bg-gradient-to-b from-border to-transparent from-80%"
            />
          </div>
          <div className="flex flex-col gap-2 pb-2">
            <p className="text-xs text-destructive">
              {result.error || "An error occurred during thinking process"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!thoughtData) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <BrainIcon className="size-5 text-muted-foreground" />
        <span>No thinking data available</span>
      </div>
    );
  }

  const getThoughtType = () => {
    if (thoughtData.isRevision) return "revision";
    if (thoughtData.branchFromThought) return "branch";
    return "thought";
  };

  const getThoughtIcon = () => {
    switch (getThoughtType()) {
      case "revision":
        return "🔄";
      case "branch":
        return "🌿";
      default:
        return "💭";
    }
  };

  const getThoughtLabel = () => {
    switch (getThoughtType()) {
      case "revision":
        return `Revision (revising thought ${thoughtData.revisesThought})`;
      case "branch":
        return `Branch (from thought ${thoughtData.branchFromThought}, ID: ${thoughtData.branchId})`;
      default:
        return "Thought";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <BrainIcon className="size-5 text-muted-foreground" />
        <span className="text-sm font-semibold">Sequential Thinking</span>
        <Badge variant="outline" className="text-xs">
          {thoughtData.thoughtNumber}/{thoughtData.totalThoughts}
        </Badge>
        {thoughtData.nextThoughtNeeded && (
          <Badge variant="secondary" className="text-xs">
            More thoughts needed
          </Badge>
        )}
      </div>
      <div className="flex gap-2">
        <div className="px-2.5">
          <Separator
            orientation="vertical"
            className="bg-gradient-to-b from-border to-transparent from-80%"
          />
        </div>
        <div className="flex flex-col gap-2 pb-2 w-full">
          <Card className="w-full">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{getThoughtIcon()}</span>
                <span className="text-sm font-medium">{getThoughtLabel()}</span>
                <Badge variant="outline" className="text-xs">
                  {thoughtData.thoughtNumber}/{thoughtData.totalThoughts}
                </Badge>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <pre className="text-sm whitespace-pre-wrap break-words font-mono">
                  {result?.formattedThought || "No thought content available"}
                </pre>
              </div>
              {thoughtData.needsMoreThoughts && (
                <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    ⚠️ More thoughts are needed to complete this analysis
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function areEqual(
  { part: prevPart }: SequentialThinkingToolInvocationProps,
  { part: nextPart }: SequentialThinkingToolInvocationProps,
) {
  return (
    prevPart.state === nextPart.state &&
    toAny(prevPart).result === toAny(nextPart).result &&
    prevPart.args === nextPart.args
  );
}

export const SequentialThinkingToolInvocation = memo(
  PureSequentialThinkingToolInvocation,
  areEqual,
);
