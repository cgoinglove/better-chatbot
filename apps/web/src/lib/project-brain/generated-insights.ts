import "server-only";
import { desc, eq } from "drizzle-orm";
import { pgDb } from "@/lib/db/pg/db.pg";
import { ProjectStatusSnapshotTable } from "@/lib/db/pg/schema.pg";
import type { ProjectBrainExtraction } from "./analyze-source";
import {
  TODOS_WIDGET_HTML,
  STATUS_WIDGET_HTML,
  buildTodosRenderData,
  buildStatusRenderData,
} from "./widget-templates";

/**
 * Persist a new project status snapshot.
 *
 * The widget HTML is FIXED (see `widget-templates.ts`) — predefined colors,
 * sizes, and fonts — so the To-dos and Progress widgets always look the same.
 * Only the render-data JSON changes, derived deterministically from the brain
 * extraction. This avoids a second LLM call and keeps the widgets stable.
 */
export async function updateProjectStatusSnapshot(input: {
  projectId: string;
  userId: string;
  extraction: ProjectBrainExtraction;
}) {
  const generatedAt = new Date();

  const todosRenderData = buildTodosRenderData(input.extraction, generatedAt);
  const statusRenderData = buildStatusRenderData(input.extraction, generatedAt);

  const [snapshot] = await pgDb
    .insert(ProjectStatusSnapshotTable)
    .values({
      projectId: input.projectId,
      userId: input.userId,
      todosHtml: TODOS_WIDGET_HTML,
      statusHtml: STATUS_WIDGET_HTML,
      todosRenderData,
      statusRenderData,
      summary: input.extraction.status.shortSummary || input.extraction.summary,
      health: input.extraction.status.health,
      generatedAt,
    })
    .returning();

  return snapshot;
}

export async function getLatestProjectStatusSnapshot(projectId: string) {
  const [snapshot] = await pgDb
    .select()
    .from(ProjectStatusSnapshotTable)
    .where(eq(ProjectStatusSnapshotTable.projectId, projectId))
    .orderBy(desc(ProjectStatusSnapshotTable.generatedAt))
    .limit(1);

  return snapshot ?? null;
}
