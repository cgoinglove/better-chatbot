import { and, eq, notInArray } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import { inngest } from "../client";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  ProjectBrainRunTable,
  ProjectConnectedToolTable,
  ProjectTable,
} from "@/lib/db/pg/schema.pg";
import { analyzePersistedProjectBrainSource } from "@/lib/project-brain/analyze-persisted-source";
import { PROJECT_BRAIN_RUN_EVENT } from "@/lib/project-brain/enqueue";
import { materializeProjectBrainRun } from "@/lib/project-brain/materialize-run";
import { persistProjectBrainExtraction } from "@/lib/project-brain/persist-extraction";
import {
  assertRunBudgetRemaining,
  extractionTimeoutMs,
  ProjectBrainBudgetError,
} from "@/lib/project-brain/run-budget";
import {
  connectorStatusForSourceError,
  isPermanentSourceError,
  loadAndPersistProjectBrainRunSource,
  resolveSourceError,
} from "@/lib/project-brain/run-source";

/** Statuses that already represent a finished run and must not be overwritten. */
const TERMINAL_STATUSES: (typeof ProjectBrainRunTable.$inferSelect)["status"][] =
  ["succeeded", "partial", "skipped", "failed"];

async function updateRun(
  runId: string,
  data: Partial<typeof ProjectBrainRunTable.$inferInsert>,
) {
  await pgDb
    .update(ProjectBrainRunTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(ProjectBrainRunTable.id, runId));
}

export const projectBrainIngestRun = inngest.createFunction(
  {
    id: "project-brain-ingest-run",
    retries: 3,
    idempotency: "event.data.runId",
    concurrency: { limit: 1, key: "event.data.projectId" },
    // Backstop only: the pipeline enforces its own shorter budget (see
    // run-budget.ts) so it fails in-band and settles the row, rather than
    // being cancelled here and orphaning it at "running".
    timeouts: { finish: "15m" },
    // `load-run` and `mark-running` sit outside the pipeline's try/catch, so a
    // failure there would otherwise leave the row untouched.
    onFailure: async ({ event }) => {
      const runId = event.data.event?.data?.runId as string | undefined;
      if (!runId) return;
      await pgDb
        .update(ProjectBrainRunTable)
        .set({
          status: "failed",
          stage: "complete",
          errorCode: "pipeline_failed",
          errorMessage: "The background job failed and was not retried.",
          finishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(ProjectBrainRunTable.id, runId),
            notInArray(ProjectBrainRunTable.status, TERMINAL_STATUSES),
          ),
        );
    },
  },
  { event: PROJECT_BRAIN_RUN_EVENT },
  async ({ event, step }) => {
    const runId = event.data.runId as string;
    const [loadedRun] = await step.run("load-run", () =>
      pgDb
        .select()
        .from(ProjectBrainRunTable)
        .where(eq(ProjectBrainRunTable.id, runId))
        .limit(1),
    );

    const run = loadedRun as unknown as
      | typeof ProjectBrainRunTable.$inferSelect
      | undefined;

    if (!run || ["succeeded", "partial", "skipped"].includes(run.status)) {
      return { skipped: true };
    }

    await step.run("mark-running", () =>
      updateRun(runId, {
        status: "running",
        stage: "loading_source",
        attempts: run.attempts + 1,
        startedAt: run.startedAt ?? new Date(),
        errorCode: null,
        errorMessage: null,
      }),
    );

    // Anchored to createdAt: Inngest replays memoized step output, so the
    // `run` snapshot keeps its first-attempt values and the budget therefore
    // covers every retry in aggregate rather than resetting on each one.
    const budgetAnchor = run.createdAt;

    try {
      assertRunBudgetRemaining(budgetAnchor, "loading the source");
      const source = await step.run("load-source", async () => {
        try {
          return await loadAndPersistProjectBrainRunSource(run);
        } catch (error) {
          // A revoked or re-authorised connector fails the same way on every
          // attempt. Retrying it through Inngest's backoff spends the run's
          // whole budget to reach the same answer, which is what previously
          // left nothing for extraction.
          if (isPermanentSourceError(error)) {
            throw new NonRetriableError((error as Error).message, {
              cause: error,
            });
          }
          throw error;
        }
      });

      if (source.unchanged && run.trigger !== "rebuild") {
        await updateRun(runId, {
          status: "skipped",
          stage: "complete",
          errorCode: "source_unchanged",
          finishedAt: new Date(),
        });
        return { runId, status: "skipped" };
      }

      const remainingMs = assertRunBudgetRemaining(budgetAnchor, "extracting");
      await updateRun(runId, { stage: "extracting" });
      const extraction = await step.run("extract", () =>
        analyzePersistedProjectBrainSource({
          projectId: run.projectId,
          sourceId: source.sourceId,
          timeoutMs: extractionTimeoutMs(remainingMs),
        }),
      );

      const [project] = await pgDb
        .select({ memoryEnabled: ProjectTable.memoryEnabled })
        .from(ProjectTable)
        .where(eq(ProjectTable.id, run.projectId))
        .limit(1);

      if (!project) throw new Error("Project not found.");

      await updateRun(runId, { stage: "persisting" });
      const persisted = await step.run("persist", () =>
        persistProjectBrainExtraction({
          runId,
          projectId: run.projectId,
          sourceId: source.sourceId,
          sourceScope: run.sourceScope,
          extraction,
          persistKnowledge: project.memoryEnabled,
        }),
      );

      await updateRun(runId, { stage: "materializing" });
      const materialized = await step.run("materialize", () =>
        materializeProjectBrainRun({
          projectId: run.projectId,
          runId,
          sourceId: source.sourceId,
          sourceScope: run.sourceScope,
          pageIds: persisted.pageIds,
          widgets: extraction.widgets,
          todos: extraction.todos,
          status: extraction.status,
        }),
      );

      const status = materialized.warnings.length ? "partial" : "succeeded";

      await updateRun(runId, {
        status,
        stage: "complete",
        metrics: {
          entities: persisted.entities,
          facts: persisted.facts,
          relations: persisted.relations,
          chunks: materialized.chunks,
          widgets: materialized.widgets,
          warnings: materialized.warnings,
        },
        finishedAt: new Date(),
      });

      return { runId, status };
    } catch (error) {
      // The source error may be wrapped as a NonRetriableError's cause, so
      // unwrap it rather than reporting everything as "pipeline_failed".
      const sourceError = resolveSourceError(error);
      const errorMessage = (
        error instanceof Error ? error.message : String(error)
      ).slice(0, 4000);

      await updateRun(runId, {
        status: "failed",
        stage: "complete",
        errorCode:
          sourceError?.code ??
          (error instanceof ProjectBrainBudgetError
            ? error.code
            : "pipeline_failed"),
        errorMessage,
        finishedAt: new Date(),
      });

      // Surface a dead connector on the connector itself so the Brain tab can
      // prompt a reconnect and the daily cycle stops retrying it. Reattaching
      // through the tool picker resets the status to "connected".
      const connectorStatus = sourceError
        ? connectorStatusForSourceError(sourceError.code)
        : null;
      if (connectorStatus && run.connectedToolId) {
        await pgDb
          .update(ProjectConnectedToolTable)
          .set({
            status: connectorStatus,
            lastSyncError: errorMessage,
            updatedAt: new Date(),
          })
          .where(eq(ProjectConnectedToolTable.id, run.connectedToolId));
      }

      throw error;
    }
  },
);
