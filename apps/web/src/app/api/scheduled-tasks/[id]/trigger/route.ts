import { NextResponse } from "next/server";
import { withAuth } from "auth/route-guard";
import { pgDb } from "@/lib/db/pg/db.pg";
import { ScheduledTaskTable } from "@/lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";

/**
 * POST /api/scheduled-tasks/[id]/trigger
 * Manually trigger a scheduled task
 */
export const POST = withAuth(
  async (
    _request,
    session,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    try {
      const { id } = await params;

      // Verify task exists and user owns it
      const [task] = await pgDb
        .select()
        .from(ScheduledTaskTable)
        .where(
          and(
            eq(ScheduledTaskTable.id, id),
            eq(ScheduledTaskTable.userId, session.user.id),
          ),
        )
        .limit(1);

      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      // Send event to Inngest to trigger the task. No event id on purpose:
      // manual triggers always run (scheduled fires carry a deterministic id
      // for dedup). userId feeds the executor's per-user concurrency key.
      await inngest.send({
        name: "scheduled-task/trigger",
        data: { taskId: id, userId: task.userId },
      });

      return NextResponse.json({
        success: true,
        message: "Task triggered successfully",
      });
    } catch (error) {
      console.error("Error triggering scheduled task:", error);
      return NextResponse.json(
        { error: "Failed to trigger scheduled task" },
        { status: 500 },
      );
    }
  },
);
