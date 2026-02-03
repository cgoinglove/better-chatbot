import { createWorkflowExecutor } from "./executor/workflow-executor";
import { withWorkflowContext } from "./workflow.interface";
import { computeNextRunDate } from "./scheduler-utils";
import { workflowRepository, userRepository } from "lib/db/repository";
import { pgDb } from "lib/db/pg/db.pg";
import { WorkflowScheduleTable } from "lib/db/pg/schema.pg";
import { and, asc, eq, isNull, isNotNull, lte, lt, or } from "drizzle-orm";
import { generateUUID } from "lib/utils";
import logger from "logger";
import { colorize } from "consola/utils";

const DEFAULT_LIMIT = 5;
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

type WorkflowScheduleRow = typeof WorkflowScheduleTable.$inferSelect;

export type WorkflowSchedulerDispatchOptions = {
  limit?: number;
  dryRun?: boolean;
  workerId?: string;
};

export type WorkflowSchedulerDispatchResult = {
  scanned: number;
  locked: number;
  success: number;
  failed: number;
  skipped: number;
  errors: { scheduleId: string; message: string }[];
};

export async function dispatchWorkflowSchedules(
  options: WorkflowSchedulerDispatchOptions = {},
): Promise<WorkflowSchedulerDispatchResult> {
  const { limit = DEFAULT_LIMIT, dryRun = false } = options;
  const workerId = options.workerId ?? generateUUID();

  const now = new Date();
  const dueSchedules = await pgDb
    .select()
    .from(WorkflowScheduleTable)
    .where(
      and(
        eq(WorkflowScheduleTable.enabled, true),
        isNotNull(WorkflowScheduleTable.nextRunAt),
        lte(WorkflowScheduleTable.nextRunAt, now),
      ),
    )
    .orderBy(asc(WorkflowScheduleTable.nextRunAt))
    .limit(limit);

  const summary: WorkflowSchedulerDispatchResult = {
    scanned: dueSchedules.length,
    locked: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  for (const schedule of dueSchedules) {
    const locked = await lockSchedule(schedule.id, workerId, now);
    if (!locked) {
      summary.skipped += 1;
      continue;
    }

    summary.locked += 1;

    if (dryRun) {
      await releaseScheduleLock(schedule.id);
      summary.skipped += 1;
      continue;
    }

    const runResult = await executeSchedule(locked).catch((error: any) => ({
      ok: false,
      error,
    }));

    if (runResult.ok) {
      summary.success += 1;
    } else {
      summary.failed += 1;
      summary.errors.push({
        scheduleId: schedule.id,
        message: runResult.error?.message || "Unknown error",
      });
    }
  }

  return summary;
}

async function lockSchedule(scheduleId: string, workerId: string, now: Date) {
  const lockExpiry = new Date(now.getTime() - LOCK_TIMEOUT_MS);
  const [row] = await pgDb
    .update(WorkflowScheduleTable)
    .set({
      lockedAt: new Date(),
      lockedBy: workerId,
    })
    .where(
      and(
        eq(WorkflowScheduleTable.id, scheduleId),
        eq(WorkflowScheduleTable.enabled, true),
        lte(WorkflowScheduleTable.nextRunAt, now),
        or(
          isNull(WorkflowScheduleTable.lockedAt),
          lt(WorkflowScheduleTable.lockedAt, lockExpiry),
          eq(WorkflowScheduleTable.lockedBy, workerId),
        ),
      ),
    )
    .returning();

  return row ?? null;
}

async function releaseScheduleLock(scheduleId: string) {
  await pgDb
    .update(WorkflowScheduleTable)
    .set({ lockedAt: null, lockedBy: null })
    .where(eq(WorkflowScheduleTable.id, scheduleId));
}

async function executeSchedule(schedule: WorkflowScheduleRow) {
  const wfLogger = logger.withDefaults({
    message: colorize(
      "cyan",
      `Scheduler[${schedule.workflowId}] node(${schedule.workflowNodeId})`,
    ),
  });

  const workflow = await workflowRepository.selectStructureById(
    schedule.workflowId,
  );
  if (!workflow) {
    await finalizeScheduleRun(schedule, {
      errorMessage: "Workflow not found",
      recordRun: false,
    });
    return { ok: false, error: new Error("Workflow not found") };
  }

  if (!workflow.isPublished) {
    await finalizeScheduleRun(schedule, {
      errorMessage: "Workflow is not published",
      skipNextComputation: false,
      recordRun: false,
    });
    return { ok: false, error: new Error("Workflow is not published") };
  }

  const payloadValue = schedule.payload as
    | Record<string, unknown>
    | null
    | undefined;
  const schedulePayload = payloadValue ?? {};

  const owner = workflow.userId
    ? await userRepository.getUserById(workflow.userId)
    : null;

  const workflowContext = owner
    ? {
        user: {
          id: owner.id,
          email: owner.email,
          name: owner.name,
        },
      }
    : undefined;

  const runtimeQuery = withWorkflowContext(schedulePayload, workflowContext);

  try {
    const executor = createWorkflowExecutor({
      nodes: workflow.nodes,
      edges: workflow.edges,
      logger: wfLogger,
    });

    const result = await executor.run(
      { query: runtimeQuery },
      {
        disableHistory: true,
        timeout: 1000 * 60 * 5,
      },
    );

    if (!result.isOk) {
      throw result.error || new Error("Workflow execution failed");
    }

    await finalizeScheduleRun(schedule, {});
    return { ok: true };
  } catch (error) {
    await finalizeScheduleRun(schedule, {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error };
  }
}

async function finalizeScheduleRun(
  schedule: WorkflowScheduleRow,
  options: {
    errorMessage?: string | null;
    skipNextComputation?: boolean;
    recordRun?: boolean;
  },
) {
  const runCompletedAt = new Date();
  const nextRunAt =
    schedule.enabled && !options.skipNextComputation
      ? computeNextRunDate(schedule.cron, schedule.timezone, runCompletedAt)
      : null;
  const lastRunValue =
    options.recordRun === false ? schedule.lastRunAt : runCompletedAt;

  await pgDb
    .update(WorkflowScheduleTable)
    .set({
      lastRunAt: lastRunValue,
      nextRunAt,
      lastError: options.errorMessage ?? null,
      lockedAt: null,
      lockedBy: null,
      updatedAt: runCompletedAt,
    })
    .where(eq(WorkflowScheduleTable.id, schedule.id));
}
