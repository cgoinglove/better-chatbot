import "server-only";

import { and, eq } from "drizzle-orm";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  ProjectBrainPageTable,
  ProjectBrainRawSourceTable,
  ProjectWidgetTable,
} from "@/lib/db/pg/schema.pg";
import { replaceProjectBrainChunks } from "./chunk";
import type { ProjectBrainExtraction } from "./extraction-schema";
import { buildWidgetRows } from "./widget-rows";

export async function materializeProjectBrainRun(input: {
  projectId: string;
  runId: string;
  sourceId: string;
  sourceScope: string;
  pageIds: string[];
  widgets: ProjectBrainExtraction["widgets"];
  todos?: ProjectBrainExtraction["todos"];
  status?: ProjectBrainExtraction["status"];
}) {
  const warnings: string[] = [];
  let chunks = 0;

  const [source] = await pgDb
    .select({ sourceUserId: ProjectBrainRawSourceTable.sourceUserId })
    .from(ProjectBrainRawSourceTable)
    .where(
      and(
        eq(ProjectBrainRawSourceTable.id, input.sourceId),
        eq(ProjectBrainRawSourceTable.projectId, input.projectId),
      ),
    )
    .limit(1);

  if (!source) {
    return {
      chunks,
      widgets: 0,
      warnings: ["source_not_found"],
    };
  }

  for (const pageId of input.pageIds) {
    try {
      const [page] = await pgDb
        .select()
        .from(ProjectBrainPageTable)
        .where(
          and(
            eq(ProjectBrainPageTable.id, pageId),
            eq(ProjectBrainPageTable.projectId, input.projectId),
          ),
        )
        .limit(1);

      if (!page) continue;

      const rows = await replaceProjectBrainChunks({
        projectId: input.projectId,
        userId: source.sourceUserId,
        pageId: page.id,
        chunkType: "compiled_truth",
        text: [page.title, page.summary, page.compiledTruth]
          .filter(Boolean)
          .join("\n\n"),
        metadata: {
          slug: page.slug,
          type: page.type,
          title: page.title,
        },
      });

      chunks += rows.length;
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : String(error));
    }
  }

  const widgetRows = buildWidgetRows(input);

  let widgets = 0;
  for (const [position, widget] of widgetRows.entries()) {
    try {
      await pgDb
        .insert(ProjectWidgetTable)
        .values({
          projectId: input.projectId,
          userId: source.sourceUserId,
          sourceScope: input.sourceScope,
          sourceRunId: input.runId,
          kind: widget.kind,
          title: widget.title,
          renderData: widget.renderData,
          slot: widget.slot,
          position,
          generatedAt: new Date(),
          staleAt: null,
        })
        .onConflictDoUpdate({
          target: [
            ProjectWidgetTable.projectId,
            ProjectWidgetTable.sourceScope,
            ProjectWidgetTable.slot,
          ],
          set: {
            sourceRunId: input.runId,
            kind: widget.kind,
            title: widget.title,
            renderData: widget.renderData,
            position,
            generatedAt: new Date(),
            staleAt: null,
          },
        });
      widgets++;
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : String(error));
    }
  }

  return { chunks, widgets, warnings };
}
