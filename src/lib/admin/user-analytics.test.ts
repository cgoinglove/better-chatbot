import { describe, expect, it } from "vitest";
import { buildActiveUserAnalytics } from "./user-analytics";

describe("buildActiveUserAnalytics", () => {
  it("counts active users and consecutive-day streaks ending on each day", () => {
    const result = buildActiveUserAnalytics(
      ["2026-07-25", "2026-07-26", "2026-07-27"],
      [
        { date: "2026-07-24", userId: "three-days" },
        { date: "2026-07-25", userId: "three-days" },
        { date: "2026-07-25", userId: "two-days" },
        { date: "2026-07-25", userId: "single-day" },
        { date: "2026-07-26", userId: "three-days" },
        { date: "2026-07-26", userId: "two-days" },
        { date: "2026-07-27", userId: "three-days" },
        { date: "2026-07-27", userId: "new-user" },
      ],
    );

    expect(result.activeUsers.map(({ count }) => count)).toEqual([3, 2, 2]);
    expect(result.twoDayStreakUsers.map(({ count }) => count)).toEqual([
      1, 2, 1,
    ]);
    expect(result.threeDayStreakUsers.map(({ count }) => count)).toEqual([
      0, 1, 1,
    ]);
  });

  it("deduplicates multiple chats from the same user on one day", () => {
    const result = buildActiveUserAnalytics(
      ["2026-07-27"],
      [
        { date: "2026-07-27", userId: "user-1" },
        { date: "2026-07-27", userId: "user-1" },
      ],
    );

    expect(result.activeUsers).toEqual([{ date: "2026-07-27", count: 1 }]);
  });
});
