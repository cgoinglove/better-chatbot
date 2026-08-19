import { NextResponse } from "next/server";
import { withAuth } from "auth/route-guard";
import { pgDb } from "@/lib/db/pg/db.pg";
import { ScheduledTaskTable, AgentTable } from "@/lib/db/pg/schema.pg";
import { eq, and, asc } from "drizzle-orm";
import { agentRepository } from "@/lib/db/repository";
import {
  ScheduledTaskCreateSchema,
  computeNextRunAt,
  isValidCron,
} from "@/lib/scheduled-tasks/schedule-validation";

/**
 * GET /api/scheduled-tasks
 * List all scheduled tasks for the current user
 */
export const GET = withAuth(async (request, session) => {
  try {
    // Optional ?agentId= filter. Previously this query took `(_request, session)`
    // and ignored the caller's agentId entirely, so an agent's edit page (which
    // requests ?agentId=<id> and then reads tasks[0]) could be handed a
    // DIFFERENT agent's schedule. Filter on it, and order deterministically so
    // "first" is stable.
    const agentId = new URL(request.url).searchParams.get("agentId");

    const tasks = await pgDb
      .select({
        id: ScheduledTaskTable.id,
        userId: ScheduledTaskTable.userId,
        taskType: ScheduledTaskTable.taskType,
        agentId: ScheduledTaskTable.agentId,
        key: ScheduledTaskTable.key,
        name: ScheduledTaskTable.name,
        description: ScheduledTaskTable.description,
        cronExpression: ScheduledTaskTable.cronExpression,
        timezone: ScheduledTaskTable.timezone,
        inputPrompt: ScheduledTaskTable.inputPrompt,
        enabled: ScheduledTaskTable.enabled,
        lastRunAt: ScheduledTaskTable.lastRunAt,
        lastRunStatus: ScheduledTaskTable.lastRunStatus,
        lastRunError: ScheduledTaskTable.lastRunError,
        lastChatThreadId: ScheduledTaskTable.lastChatThreadId,
        runCount: ScheduledTaskTable.runCount,
        successCount: ScheduledTaskTable.successCount,
        failureCount: ScheduledTaskTable.failureCount,
        createdAt: ScheduledTaskTable.createdAt,
        updatedAt: ScheduledTaskTable.updatedAt,
        agentName: AgentTable.name,
      })
      .from(ScheduledTaskTable)
      .leftJoin(AgentTable, eq(ScheduledTaskTable.agentId, AgentTable.id))
      .where(
        agentId
          ? and(
              eq(ScheduledTaskTable.userId, session.user.id),
              eq(ScheduledTaskTable.agentId, agentId),
            )
          : eq(ScheduledTaskTable.userId, session.user.id),
      )
      .orderBy(asc(ScheduledTaskTable.createdAt), asc(ScheduledTaskTable.id));

    // Computed server-side so clients never need cron math.
    const now = new Date();
    const tasksWithNextRun = tasks.map((task) => ({
      ...task,
      nextRunAt: task.enabled
        ? computeNextRunAt(task.cronExpression, task.timezone, now)
        : null,
    }));

    return NextResponse.json({ tasks: tasksWithNextRun });
  } catch (error) {
    console.error("Error fetching scheduled tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch scheduled tasks" },
      { status: 500 },
    );
  }
});

/**
 * POST /api/scheduled-tasks
 * Create a new scheduled task
 */
export const POST = withAuth(async (request, session) => {
  try {
    const body = await request.json();
    const parsed = ScheduledTaskCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid scheduled task payload" },
        { status: 400 },
      );
    }
    const {
      agentId,
      key,
      name,
      description,
      cronExpression,
      timezone,
      inputPrompt,
      enabled,
    } = parsed.data;

    if (!isValidCron(cronExpression, timezone)) {
      return NextResponse.json(
        { error: "Invalid cron expression or timezone" },
        { status: 400 },
      );
    }

    // Access check, org-scoped. Uses the repository's shared predicate so an
    // org-shared agent can be scheduled (the old `userId === caller` check made
    // shared agents impossible to schedule), while still failing closed for
    // agents the caller can't reach.
    const activeOrganizationId = (
      session.session as { activeOrganizationId?: string | null } | undefined
    )?.activeOrganizationId;
    const hasAccess = await agentRepository.checkAccess(
      agentId,
      session.user.id,
      false,
      activeOrganizationId,
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Agent not found or access denied" },
        { status: 404 },
      );
    }

    const [agentRow] = await pgDb
      .select({ name: AgentTable.name })
      .from(AgentTable)
      .where(eq(AgentTable.id, agentId))
      .limit(1);

    // Upsert on (agent_id, key): re-saving a schedule updates it in place
    // instead of piling up duplicate rows.
    const [task] = await pgDb
      .insert(ScheduledTaskTable)
      .values({
        userId: session.user.id,
        taskType: "agent",
        agentId,
        key,
        name: name || `Scheduled ${agentRow?.name ?? "agent"}`,
        description: description || null,
        cronExpression,
        timezone,
        inputPrompt: inputPrompt || null,
        enabled,
        nextRunAt: computeNextRunAt(cronExpression, timezone),
      })
      .onConflictDoUpdate({
        target: [ScheduledTaskTable.agentId, ScheduledTaskTable.key],
        set: {
          name: name || `Scheduled ${agentRow?.name ?? "agent"}`,
          description: description || null,
          cronExpression,
          timezone,
          inputPrompt: inputPrompt || null,
          enabled,
          nextRunAt: computeNextRunAt(cronExpression, timezone),
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("Error creating scheduled task:", error);
    return NextResponse.json(
      { error: "Failed to create scheduled task" },
      { status: 500 },
    );
  }
});
