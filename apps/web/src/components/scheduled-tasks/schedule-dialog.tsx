"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  type ScheduleFrequency,
  getCommonTimezones,
  getUserTimezone,
  timeToCron,
  cronToScheduleInput,
} from "@/lib/scheduled-tasks/time-to-cron";

/**
 * Schedule config captured before the agent exists (create flow). The parent
 * holds it and submits it right after the agent is created.
 */
export type DeferredScheduleConfig = {
  cronExpression: string;
  timezone: string;
  inputPrompt: string | null;
  enabled: true;
};

export interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskType: "agent";
  /** Absent while the agent is being created — the dialog defers the config. */
  taskId?: string;
  taskName?: string;
  existingSchedule?: any;
  /**
   * Name of the schedule within the agent. New schedules pass a fresh key so
   * they upsert as a distinct row instead of overwriting the "default" one.
   */
  scheduleKey?: string;
  onScheduleCreated?: () => void;
  /** Called instead of the API when taskId is absent (create flow). */
  onSubmitDeferred?: (config: DeferredScheduleConfig) => void;
}

export function ScheduleDialog({
  open,
  onOpenChange,
  taskType,
  taskId,
  taskName,
  existingSchedule,
  scheduleKey,
  onScheduleCreated,
  onSubmitDeferred,
}: ScheduleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [frequency, setFrequency] = useState<ScheduleFrequency>("daily");
  const [time, setTime] = useState("09:00");
  const [dayOfWeek, setDayOfWeek] = useState<number>(1); // Monday
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [timezone, setTimezone] = useState(getUserTimezone());
  const [inputPrompt, setInputPrompt] = useState("");

  // Pre-fill form with existing schedule data (a stored task or a pending
  // deferred config from the create flow — both carry the same fields).
  useEffect(() => {
    if (existingSchedule) {
      setInputPrompt(existingSchedule.inputPrompt || "");
      setTimezone(existingSchedule.timezone || getUserTimezone());

      // Parse cron back to form fields
      const parsed = cronToScheduleInput(existingSchedule.cronExpression);
      if (parsed) {
        if (parsed.frequency) setFrequency(parsed.frequency);
        if (parsed.time) setTime(parsed.time);
        if (parsed.dayOfWeek !== undefined) setDayOfWeek(parsed.dayOfWeek);
        if (parsed.dayOfMonth !== undefined) setDayOfMonth(parsed.dayOfMonth);
      }
    }
  }, [existingSchedule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let cronExpression: string;
    try {
      cronExpression = timeToCron({
        frequency,
        time: frequency === "hourly" ? undefined : time,
        dayOfWeek: frequency === "weekly" ? dayOfWeek : undefined,
        dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
        timezone,
      });
    } catch {
      toast.error("Invalid schedule. Please check time and frequency.");
      return;
    }

    // Create flow: the agent does not exist yet, hand the config to the
    // parent, which saves it right after the agent is created.
    if (!taskId) {
      onSubmitDeferred?.({
        cronExpression,
        timezone,
        inputPrompt: inputPrompt || null,
        enabled: true,
      });
      onOpenChange(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        taskType,
        agentId: taskId,
        // Preserve the schedule's key on edit; new schedules use the passed key
        // (or "default"). The POST route upserts on (agentId, key).
        key: existingSchedule?.key ?? scheduleKey ?? "default",
        cronExpression,
        timezone,
        inputPrompt,
        enabled: true,
      };

      const url = existingSchedule?.id
        ? `/api/scheduled-tasks/${existingSchedule.id}`
        : "/api/scheduled-tasks";
      const method = existingSchedule?.id ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          existingSchedule?.id
            ? "Failed to update schedule"
            : "Failed to create schedule",
        );
      }

      onOpenChange(false);
      onScheduleCreated?.();
    } catch (error) {
      console.error("Error creating schedule:", error);
      toast.error(
        existingSchedule?.id
          ? "Failed to update the schedule. Please try again."
          : "Failed to create the schedule. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule {taskName || "Task"}</DialogTitle>
          <DialogDescription>
            Choose when this {taskType} should run automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Input Prompt — the user message of every scheduled run */}
          <div className="space-y-2">
            <Label htmlFor="inputPrompt">
              What should the agent do each run?{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="inputPrompt"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="e.g. Summarize yesterday's meeting transcripts and extract all todos"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Sent to the agent as the user message on every scheduled run. If
              empty, the agent runs with a generic prompt.
            </p>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select
              value={frequency}
              onValueChange={(value) =>
                setFrequency(value as ScheduleFrequency)
              }
            >
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Every Hour</SelectItem>
                <SelectItem value="daily">Every Day</SelectItem>
                <SelectItem value="weekly">Every Week</SelectItem>
                <SelectItem value="monthly">Every Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Time (not shown for hourly) */}
          {frequency !== "hourly" && (
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          )}

          {/* Day of Week (only for weekly) */}
          {frequency === "weekly" && (
            <div className="space-y-2">
              <Label htmlFor="dayOfWeek">Day of Week</Label>
              <Select
                value={dayOfWeek.toString()}
                onValueChange={(value) => setDayOfWeek(Number.parseInt(value))}
              >
                <SelectTrigger id="dayOfWeek">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Day of Month (only for monthly) */}
          {frequency === "monthly" && (
            <div className="space-y-2">
              <Label htmlFor="dayOfMonth">Day of Month</Label>
              <Select
                value={dayOfMonth.toString()}
                onValueChange={(value) => setDayOfMonth(Number.parseInt(value))}
              >
                <SelectTrigger id="dayOfMonth">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {dayOfMonth > 28 && (
                <p className="text-xs text-muted-foreground">
                  Only runs in months that have day {dayOfMonth}.
                </p>
              )}
            </div>
          )}

          {/* Timezone */}
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* Render the stored timezone even if it isn't one of the
                    common options (API/voice-created tasks accept any IANA
                    zone), so editing never silently rewrites it. */}
                {!getCommonTimezones().some((tz) => tz.value === timezone) && (
                  <SelectItem value={timezone}>{timezone}</SelectItem>
                )}
                {getCommonTimezones().map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? existingSchedule
                  ? "Updating..."
                  : "Creating..."
                : existingSchedule
                  ? "Update Schedule"
                  : !taskId
                    ? "Set Schedule"
                    : "Create Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
