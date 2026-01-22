import CronExpressionParser from "cron-parser";

export function computeNextRunDate(
  cron: string,
  timezone?: string,
  fromDate?: Date,
): Date | null {
  try {
    const interval = CronExpressionParser.parse(cron, {
      currentDate: fromDate ?? new Date(),
      tz: timezone || "UTC",
    });
    return interval.next().toDate();
  } catch {
    return null;
  }
}
