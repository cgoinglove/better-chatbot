"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { SchedulerNodeData } from "lib/ai/workflow/workflow.interface";
import { useReactFlow } from "@xyflow/react";
import { Label } from "ui/label";
import { Input } from "ui/input";
import { Textarea } from "ui/textarea";
import { Switch } from "ui/switch";
import { useTranslations } from "next-intl";
import { InfoIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { cn } from "lib/utils";

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export const SchedulerNodeConfig = memo(function SchedulerNodeConfig({
  data,
}: {
  data: SchedulerNodeData;
}) {
  const t = useTranslations();
  const { updateNodeData } = useReactFlow();
  const [payloadText, setPayloadText] = useState(() =>
    JSON.stringify(data.payload ?? {}, null, 2),
  );
  const [payloadError, setPayloadError] = useState<string | null>(null);

  const cronHelper = useMemo(() => {
    return (
      t("Workflow.schedulerCronHelper") ||
      "Use standard 5-field cron syntax. Examples: '0 * * * *' or '0 9 * * MON'."
    );
  }, [t]);

  const timezoneHelper = useMemo(() => {
    return (
      t("Workflow.schedulerTimezoneHelper") ||
      "Use an IANA timezone like 'UTC' or 'America/New_York'."
    );
  }, [t]);

  const payloadHelper = useMemo(() => {
    return (
      t("Workflow.schedulerPayloadDescription") ||
      "JSON payload supplied as workflow input when the schedule triggers."
    );
  }, [t]);

  const handleCronChange = useCallback(
    (cron: string) => {
      updateNodeData(data.id, { cron });
    },
    [data.id, updateNodeData],
  );

  const handleTimezoneChange = useCallback(
    (timezone: string) => {
      updateNodeData(data.id, { timezone });
    },
    [data.id, updateNodeData],
  );

  const handleEnabledChange = useCallback(
    (enabled: boolean) => {
      updateNodeData(data.id, { enabled });
    },
    [data.id, updateNodeData],
  );

  const handlePayloadChange = useCallback(
    (value: string) => {
      setPayloadText(value);
      if (!value.trim()) {
        updateNodeData(data.id, { payload: {} });
        setPayloadError(null);
        return;
      }

      try {
        const parsed = JSON.parse(value);
        setPayloadError(null);
        updateNodeData(data.id, { payload: parsed });
      } catch {
        setPayloadError(t("Workflow.schedulerInvalidJson"));
      }
    },
    [data.id, t, updateNodeData],
  );

  return (
    <div className="flex flex-col gap-4 px-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm">
            {t("Workflow.schedulerCronExpression")}*
          </Label>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <InfoIcon className="size-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-72 whitespace-pre-wrap text-xs">
              {cronHelper}
            </TooltipContent>
          </Tooltip>
        </div>
        <Input
          value={data.cron ?? ""}
          placeholder="0 * * * *"
          onChange={(event) => handleCronChange(event.target.value)}
        />
        <a
          className="text-xs text-blue-500 hover:underline"
          href="https://crontab.guru/"
          target="_blank"
          rel="noreferrer"
        >
          {t("Workflow.schedulerCronDocs") ?? "Open crontab.guru"}
        </a>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm">{t("Workflow.schedulerTimezone")}</Label>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <InfoIcon className="size-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-72 whitespace-pre-wrap text-xs">
              {timezoneHelper}
            </TooltipContent>
          </Tooltip>
        </div>
        <Input
          list={`${data.id}-timezone-list`}
          value={data.timezone ?? ""}
          placeholder="UTC"
          onChange={(event) => handleTimezoneChange(event.target.value)}
        />
        <datalist id={`${data.id}-timezone-list`}>
          {COMMON_TIMEZONES.map((zone) => (
            <option key={zone} value={zone} />
          ))}
        </datalist>
      </div>

      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <div>
          <Label className="text-sm">{t("Workflow.schedulerEnabled")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("Workflow.schedulerEnabledDescription") ??
              "Paused schedules will not run."}
          </p>
        </div>
        <Switch
          checked={data.enabled ?? true}
          onCheckedChange={handleEnabledChange}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm">{t("Workflow.schedulerPayload")}</Label>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <InfoIcon className="size-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-72 whitespace-pre-wrap text-xs">
              {payloadHelper}
            </TooltipContent>
          </Tooltip>
        </div>
        <Textarea
          className={cn(payloadError && "border-destructive")}
          rows={8}
          value={payloadText}
          onChange={(event) => handlePayloadChange(event.target.value)}
          spellCheck={false}
        />
        {payloadError && (
          <p className="text-xs text-destructive">{payloadError}</p>
        )}
      </div>
    </div>
  );
});
SchedulerNodeConfig.displayName = "SchedulerNodeConfig";

export const SchedulerNodeStack = memo(function SchedulerNodeStack({
  data,
}: {
  data: SchedulerNodeData;
}) {
  const t = useTranslations();
  const enabled = data.enabled ?? true;
  return (
    <div className="flex flex-col gap-1 px-4 mt-4 text-xs text-muted-foreground">
      <div className="border bg-input rounded px-2 py-1 flex items-center gap-2">
        <span className="font-semibold">
          {t("Workflow.schedulerStackCronLabel") || "Cron"}
        </span>
        <span className="ml-auto text-foreground font-mono">
          {data.cron || "-"}
        </span>
      </div>
      <div className="border bg-input rounded px-2 py-1 flex items-center gap-2">
        <span className="font-semibold">
          {t("Workflow.schedulerStackTimezoneLabel") || "TZ"}
        </span>
        <span className="ml-auto text-foreground font-mono">
          {data.timezone || "UTC"}
        </span>
      </div>
      <div className="border bg-input rounded px-2 py-1 flex items-center gap-2">
        <span className="font-semibold">
          {t("Workflow.schedulerStackStatusLabel") || "Status"}
        </span>
        <span
          className={cn(
            "ml-auto font-medium",
            enabled ? "text-emerald-500" : "text-muted-foreground",
          )}
        >
          {enabled
            ? t("Workflow.schedulerStatusActive") || "Active"
            : t("Workflow.schedulerStatusPaused") || "Paused"}
        </span>
      </div>
    </div>
  );
});
SchedulerNodeStack.displayName = "SchedulerNodeStack";
