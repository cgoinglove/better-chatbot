import { NextResponse } from "next/server";
import { withAuth } from "auth/route-guard";
import { pgDb } from "@/lib/db/pg/db.pg";
import { NotificationTable } from "@/lib/db/pg/schema.pg";
import { and, count, desc, eq, isNull } from "drizzle-orm";

/**
 * GET /api/notifications?limit=20
 * Latest notifications for the current user plus the unread count.
 */
export const GET = withAuth(async (request, session) => {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(Number.parseInt(searchParams.get("limit") ?? "20", 10) || 20, 1),
      50,
    );

    const [notifications, [unread]] = await Promise.all([
      pgDb
        .select()
        .from(NotificationTable)
        .where(eq(NotificationTable.userId, session.user.id))
        .orderBy(desc(NotificationTable.createdAt))
        .limit(limit),
      pgDb
        .select({ count: count() })
        .from(NotificationTable)
        .where(
          and(
            eq(NotificationTable.userId, session.user.id),
            isNull(NotificationTable.readAt),
          ),
        ),
    ]);

    return NextResponse.json({
      notifications,
      unreadCount: unread?.count ?? 0,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
});
