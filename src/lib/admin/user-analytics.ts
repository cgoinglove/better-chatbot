import type { AdminAnalyticsPoint } from "app-types/admin";
import { format, parseISO, subDays } from "date-fns";

export interface ActiveUserDay {
  date: string;
  userId: string;
}

interface ActiveUserAnalytics {
  activeUsers: AdminAnalyticsPoint[];
  twoDayStreakUsers: AdminAnalyticsPoint[];
  threeDayStreakUsers: AdminAnalyticsPoint[];
}

export function buildActiveUserAnalytics(
  dates: string[],
  activeUserDays: ActiveUserDay[],
): ActiveUserAnalytics {
  const usersByDate = new Map<string, Set<string>>();

  for (const { date, userId } of activeUserDays) {
    const users = usersByDate.get(date) ?? new Set<string>();
    users.add(userId);
    usersByDate.set(date, users);
  }

  const countStreakUsers = (date: string, streakLength: number) => {
    const users = usersByDate.get(date) ?? new Set<string>();
    const previousDates = Array.from({ length: streakLength - 1 }, (_, index) =>
      format(subDays(parseISO(date), index + 1), "yyyy-MM-dd"),
    );

    return [...users].filter((userId) =>
      previousDates.every(
        (previousDate) => usersByDate.get(previousDate)?.has(userId) ?? false,
      ),
    ).length;
  };

  return {
    activeUsers: dates.map((date) => ({
      date,
      count: usersByDate.get(date)?.size ?? 0,
    })),
    twoDayStreakUsers: dates.map((date) => ({
      date,
      count: countStreakUsers(date, 2),
    })),
    threeDayStreakUsers: dates.map((date) => ({
      date,
      count: countStreakUsers(date, 3),
    })),
  };
}
