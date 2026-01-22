"use client";

import { ToolUIPart } from "ai";
import { DefaultToolName } from "lib/ai/tools";
import equal from "lib/equal";
import { toAny } from "lib/utils";
import { AlertTriangleIcon, SparklesIcon } from "lucide-react";
import { memo, useMemo, type ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "ui/alert";
import { Badge } from "ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "ui/card";
import { Separator } from "ui/separator";
import { Skeleton } from "ui/skeleton";
import { TextShimmer } from "ui/text-shimmer";

import { DefaultToolIcon } from "../default-tool-icon";

type PulseToolResult = {
  workflowId: string;
  scheduleNodeId: string;
  topic: string;
  cron: string;
  timezone: string;
  nextRunAt: string | null;
  numResults: number;
  summaryInstructions?: string | null;
  message?: string | null;
};

interface PulseToolInvocationProps {
  part: ToolUIPart;
}

function PurePulseToolInvocation({ part }: PulseToolInvocationProps) {
  const result = useMemo(() => {
    if (!part.state.startsWith("output")) return null;
    return part.output as PulseToolResult;
  }, [part.output, part.state]);

  if (!part.state.startsWith("output")) {
    return <PulseLoadingCard />;
  }

  if (part.state === "output-error" || !result) {
    return (
      <Alert variant="destructive">
        <AlertTriangleIcon className="size-4" />
        <AlertTitle>Pulse couldn’t be created</AlertTitle>
        <AlertDescription>
          {part.errorText ||
            result?.message ||
            "Something went wrong while setting up your Pulse. Please try again."}
        </AlertDescription>
      </Alert>
    );
  }

  const nextRunDate = result.nextRunAt ? new Date(result.nextRunAt) : null;
  const formattedNextRun = nextRunDate
    ? nextRunDate.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: result.timezone,
      })
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <DefaultToolIcon name={DefaultToolName.Pulse} className="size-4" />
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base">New Pulse created</CardTitle>
            <CardDescription>
              {result.message ??
                "I’ll keep an eye on this and pulse you with updates here."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Detail label="Topic">{result.topic}</Detail>
          <Detail label="Timezone">
            <Badge variant="secondary">{result.timezone}</Badge>
          </Detail>
          <Detail label="Results per pulse">{result.numResults}</Detail>
          <Detail label="Next pulse">
            {formattedNextRun ? (
              <div className="flex flex-col">
                <span>{formattedNextRun}</span>
                <span className="text-xs text-muted-foreground">
                  {nextRunDate?.toLocaleString(undefined, {
                    timeZoneName: "short",
                  })}
                </span>
              </div>
            ) : (
              "Scheduling first pulse…"
            )}
          </Detail>
        </div>

        {result.summaryInstructions && (
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              How I’ll summarize
            </span>
            <p className="text-sm leading-relaxed text-foreground">
              {result.summaryInstructions}
            </p>
          </div>
        )}

        <Alert>
          <SparklesIcon className="size-4" />
          <AlertTitle>What happens next</AlertTitle>
          <AlertDescription className="space-y-1 text-xs">
            <ol className="list-decimal list-inside space-y-1">
              <li>I’ll regularly search the web for your topic.</li>
              <li>I’ll turn what I find into a short, clear summary.</li>
              <li>
                Whenever there’s something new, I’ll pulse you in this chat.
              </li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 items-start">
        <Separator className="w-full" />
        <p className="text-xs text-muted-foreground">
          You can manage all your Pulses anytime in Settings → Workflows.
        </p>
      </CardFooter>
    </Card>
  );
}

function areEqual(
  { part: prevPart }: PulseToolInvocationProps,
  { part: nextPart }: PulseToolInvocationProps,
) {
  if (prevPart.state != nextPart.state) return false;
  if (!equal(prevPart.input, nextPart.input)) return false;
  if (
    prevPart.state.startsWith("output") &&
    !equal(prevPart.output, toAny(nextPart).output)
  )
    return false;
  return true;
}

export const PulseToolInvocation = memo(PurePulseToolInvocation, areEqual);

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="text-sm leading-tight text-foreground">{children}</div>
    </div>
  );
}

function PulseLoadingCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <DefaultToolIcon name={DefaultToolName.Pulse} className="size-4" />
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base">
              <TextShimmer>Creating your Pulse…</TextShimmer>
            </CardTitle>
            <CardDescription>
              I’m setting things up so I can watch this for you.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-5/6" />
      </CardContent>
    </Card>
  );
}
