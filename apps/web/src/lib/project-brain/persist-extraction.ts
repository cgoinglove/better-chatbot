import "server-only";

import { createHash } from "node:crypto";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  ProjectBrainAliasTable,
  ProjectBrainFactTable,
  ProjectBrainLinkEvidenceTable,
  ProjectBrainLinkTable,
  ProjectBrainPageTable,
  ProjectBrainPageVersionTable,
  ProjectBrainRawSourceTable,
  ProjectTable,
} from "@/lib/db/pg/schema.pg";
import type { ProjectBrainExtraction } from "./extraction-schema";
import { pageSlug } from "./slug";

function normalizeAlias(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

async function resolveOrCreatePage(
  tx: any,
  input: {
    projectId: string;
    userId: string;
    sourceId: string;
    entity: ProjectBrainExtraction["entities"][number];
  },
): Promise<string> {
  const aliases = [...new Set([input.entity.title, ...input.entity.aliases])];
  const normalizedAliases = aliases.map(normalizeAlias).filter(Boolean);

  const matches = await tx
    .select({ pageId: ProjectBrainAliasTable.pageId })
    .from(ProjectBrainAliasTable)
    .where(
      and(
        eq(ProjectBrainAliasTable.projectId, input.projectId),
        eq(ProjectBrainAliasTable.entityType, input.entity.type),
        inArray(ProjectBrainAliasTable.normalizedAlias, normalizedAliases),
      ),
    );

  const pageIds: string[] = [
    ...new Set(
      (matches as Array<{ pageId: string }>).map((match) => match.pageId),
    ),
  ];
  if (pageIds.length > 1) {
    throw new Error(`brain_alias_collision:${input.entity.title}`);
  }

  let pageId: string | undefined = pageIds[0];
  if (!pageId) {
    const [page] = await tx
      .insert(ProjectBrainPageTable)
      .values({
        projectId: input.projectId,
        userId: input.userId,
        slug: pageSlug(input.entity.type, input.entity.title),
        type: input.entity.type,
        title: input.entity.title,
        compiledTruth: "",
        summary: input.entity.summary,
        frontmatter: input.entity.metadata,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [ProjectBrainPageTable.projectId, ProjectBrainPageTable.slug],
        set: {
          summary: input.entity.summary,
          frontmatter: input.entity.metadata,
          updatedAt: new Date(),
        },
      })
      .returning({ id: ProjectBrainPageTable.id });

    pageId = page?.id;
  }

  if (!pageId) {
    throw new Error(`Could not resolve page for ${input.entity.title}.`);
  }

  await tx
    .insert(ProjectBrainAliasTable)
    .values(
      aliases.map((alias, index) => ({
        projectId: input.projectId,
        pageId,
        entityType: input.entity.type,
        alias,
        normalizedAlias: normalizeAlias(alias),
        source: index === 0 ? "canonical" : "extracted",
        createdBySourceId: input.sourceId,
      })),
    )
    .onConflictDoNothing();

  return pageId;
}

export async function persistProjectBrainExtraction(input: {
  runId: string;
  projectId: string;
  sourceId: string;
  sourceScope: string;
  extraction: ProjectBrainExtraction;
  persistKnowledge: boolean;
}) {
  if (!input.persistKnowledge) {
    return { entities: 0, facts: 0, relations: 0, pageIds: [] as string[] };
  }

  const [context] = await pgDb
    .select({
      ownerUserId: ProjectTable.ownerUserId,
      observedAt: ProjectBrainRawSourceTable.observedAt,
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

  return pgDb.transaction(async (tx) => {
    const pageByEntityId = new Map<string, string>();
    const touchedPageIds = new Set<string>();

    for (const entity of input.extraction.entities) {
      const pageId = await resolveOrCreatePage(tx, {
        projectId: input.projectId,
        userId: context.ownerUserId,
        sourceId: input.sourceId,
        entity,
      });

      pageByEntityId.set(entity.id, pageId);
      touchedPageIds.add(pageId);

      for (const fact of entity.facts) {
        const observedAt = fact.observedAt
          ? new Date(fact.observedAt)
          : context.observedAt;
        const valueHash = createHash("sha256")
          .update(fact.value.trim())
          .digest("hex");

        await tx
          .update(ProjectBrainFactTable)
          .set({
            status: "superseded",
            supersededAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(ProjectBrainFactTable.pageId, pageId),
              eq(ProjectBrainFactTable.sourceScope, input.sourceScope),
              eq(ProjectBrainFactTable.factKey, fact.key),
              eq(ProjectBrainFactTable.status, "current"),
              ne(ProjectBrainFactTable.valueHash, valueHash),
            ),
          );

        await tx
          .insert(ProjectBrainFactTable)
          .values({
            projectId: input.projectId,
            pageId,
            sourceScope: input.sourceScope,
            factType: fact.type,
            factKey: fact.key,
            value: fact.value,
            valueHash,
            status: "current",
            confidence: String(fact.confidence),
            firstSourceId: input.sourceId,
            lastSourceId: input.sourceId,
            lastRunId: input.runId,
            firstObservedAt: observedAt,
            lastObservedAt: observedAt,
          })
          .onConflictDoUpdate({
            target: [
              ProjectBrainFactTable.pageId,
              ProjectBrainFactTable.sourceScope,
              ProjectBrainFactTable.factKey,
              ProjectBrainFactTable.valueHash,
            ],
            set: {
              status: "current",
              confidence: String(fact.confidence),
              lastSourceId: input.sourceId,
              lastRunId: input.runId,
              lastObservedAt: observedAt,
              supersededAt: null,
              updatedAt: new Date(),
            },
          });
      }
    }

    for (const relation of input.extraction.relations) {
      const fromPageId = pageByEntityId.get(relation.fromEntityId);
      const toPageId = pageByEntityId.get(relation.toEntityId);

      if (!fromPageId || !toPageId) {
        throw new Error("Relation references an unresolved entity.");
      }

      const [link] = await tx
        .insert(ProjectBrainLinkTable)
        .values({
          projectId: input.projectId,
          fromPageId,
          toPageId,
          linkType: relation.type,
          context: relation.context,
          confidence: String(relation.confidence),
          source: "classifier",
        })
        .onConflictDoUpdate({
          target: [
            ProjectBrainLinkTable.projectId,
            ProjectBrainLinkTable.fromPageId,
            ProjectBrainLinkTable.toPageId,
            ProjectBrainLinkTable.linkType,
          ],
          set: {
            context: relation.context,
            confidence: String(relation.confidence),
          },
        })
        .returning();

      const evidenceKey = createHash("sha256")
        .update(
          [
            relation.type,
            relation.context ?? "",
            relation.fromEntityId,
            relation.toEntityId,
          ].join(":"),
        )
        .digest("hex");

      await tx
        .insert(ProjectBrainLinkEvidenceTable)
        .values({
          projectId: input.projectId,
          linkId: link.id,
          sourceId: input.sourceId,
          runId: input.runId,
          sourceScope: input.sourceScope,
          evidenceKey,
          context: relation.context,
          status: "current",
          confidence: String(relation.confidence),
          observedAt: relation.observedAt
            ? new Date(relation.observedAt)
            : context.observedAt,
        })
        .onConflictDoUpdate({
          target: [
            ProjectBrainLinkEvidenceTable.linkId,
            ProjectBrainLinkEvidenceTable.sourceScope,
            ProjectBrainLinkEvidenceTable.evidenceKey,
          ],
          set: {
            sourceId: input.sourceId,
            runId: input.runId,
            status: "current",
            confidence: String(relation.confidence),
            observedAt: context.observedAt,
          },
        });
    }

    const retracted = await tx
      .update(ProjectBrainFactTable)
      .set({ status: "retracted", updatedAt: new Date() })
      .where(
        and(
          eq(ProjectBrainFactTable.projectId, input.projectId),
          eq(ProjectBrainFactTable.sourceScope, input.sourceScope),
          eq(ProjectBrainFactTable.status, "current"),
          ne(ProjectBrainFactTable.lastRunId, input.runId),
        ),
      )
      .returning({ pageId: ProjectBrainFactTable.pageId });

    for (const fact of retracted) {
      touchedPageIds.add(fact.pageId);
    }

    await tx
      .update(ProjectBrainLinkEvidenceTable)
      .set({ status: "retracted" })
      .where(
        and(
          eq(ProjectBrainLinkEvidenceTable.projectId, input.projectId),
          eq(ProjectBrainLinkEvidenceTable.sourceScope, input.sourceScope),
          eq(ProjectBrainLinkEvidenceTable.status, "current"),
          ne(ProjectBrainLinkEvidenceTable.runId, input.runId),
        ),
      );

    for (const pageId of touchedPageIds) {
      const facts = await tx
        .select()
        .from(ProjectBrainFactTable)
        .where(
          and(
            eq(ProjectBrainFactTable.pageId, pageId),
            eq(ProjectBrainFactTable.status, "current"),
          ),
        )
        .orderBy(
          asc(ProjectBrainFactTable.factKey),
          desc(ProjectBrainFactTable.lastObservedAt),
          desc(ProjectBrainFactTable.confidence),
        );

      const winners = new Map<string, (typeof facts)[number]>();
      for (const fact of facts) {
        if (!winners.has(fact.factKey)) {
          winners.set(fact.factKey, fact);
        }
      }

      const compiledTruth = [...winners.values()]
        .map((fact) => `- ${fact.factKey}: ${fact.value}`)
        .join("\n");

      await tx
        .update(ProjectBrainPageTable)
        .set({ compiledTruth, updatedAt: new Date() })
        .where(eq(ProjectBrainPageTable.id, pageId));

      await tx.insert(ProjectBrainPageVersionTable).values({
        projectId: input.projectId,
        pageId,
        sourceId: input.sourceId,
        compiledTruth,
      });
    }

    return {
      entities: input.extraction.entities.length,
      facts: input.extraction.entities.reduce(
        (count, entity) => count + entity.facts.length,
        0,
      ),
      relations: input.extraction.relations.length,
      pageIds: [...touchedPageIds],
    };
  });
}
