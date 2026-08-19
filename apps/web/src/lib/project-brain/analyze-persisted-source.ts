import "server-only";

import { and, eq } from "drizzle-orm";
import { customModelProvider, projectBrainModelId } from "@/lib/ai/models";
import { generateObjectResilient } from "@/lib/ai/resilient-object";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  ProjectBrainRawSourceTable,
  ProjectTable,
  ProjectWidgetTable,
} from "@/lib/db/pg/schema.pg";
import {
  ProjectBrainExtractionSchema,
  type ProjectBrainExtraction,
} from "./extraction-schema";
import { buildExtractionSystemPrompt } from "./prompts";

export async function analyzePersistedProjectBrainSource(input: {
  projectId: string;
  sourceId: string;
  /**
   * Upper bound for this attempt. The caller derives it from the run's
   * remaining budget so extraction cannot outlive the job that owns it.
   */
  timeoutMs?: number;
}): Promise<ProjectBrainExtraction> {
  const [context] = await pgDb
    .select({
      name: ProjectTable.name,
      goal: ProjectTable.goal,
      description: ProjectTable.description,
      systemPrompt: ProjectTable.systemPrompt,
      sourceType: ProjectBrainRawSourceTable.sourceType,
      sourceScope: ProjectBrainRawSourceTable.sourceScope,
      textContent: ProjectBrainRawSourceTable.textContent,
      rawPayload: ProjectBrainRawSourceTable.rawPayload,
    })
    .from(ProjectBrainRawSourceTable)
    .innerJoin(
      ProjectTable,
      eq(ProjectBrainRawSourceTable.projectId, ProjectTable.id),
    )
    .where(
      and(
        eq(ProjectBrainRawSourceTable.id, input.sourceId),
        eq(ProjectBrainRawSourceTable.projectId, input.projectId),
      ),
    )
    .limit(1);

  if (!context) {
    throw new Error("Project brain source not found.");
  }

  // Widgets already materialized for this source scope. Passing them to the
  // model keeps slots stable across syncs (upsert-in-place instead of churn).
  const existingWidgets = context.sourceScope
    ? await pgDb
        .select({
          slot: ProjectWidgetTable.slot,
          kind: ProjectWidgetTable.kind,
          title: ProjectWidgetTable.title,
        })
        .from(ProjectWidgetTable)
        .where(
          and(
            eq(ProjectWidgetTable.projectId, input.projectId),
            eq(ProjectWidgetTable.sourceScope, context.sourceScope),
          ),
        )
    : [];

  const { object } = await generateObjectResilient({
    model: projectBrainModelId,
    fallbackModel: customModelProvider.getModel(),
    label: `project-brain:${input.projectId}:${input.sourceId}`,
    schema: ProjectBrainExtractionSchema,
    abortSignal: input.timeoutMs
      ? AbortSignal.timeout(input.timeoutMs)
      : undefined,
    system: buildExtractionSystemPrompt(),
    prompt: JSON.stringify({
      projectName: context.name,
      projectGoal: context.goal ?? context.description ?? "",
      projectDescription: context.description ?? "",
      projectSystemPrompt: context.systemPrompt ?? "",
      sourceType: context.sourceType,
      existingWidgets,
      sourceText: context.textContent ?? "",
      sourcePayload: context.rawPayload,
    }),
  });

  return object;
}
