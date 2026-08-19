import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  ProjectBrainFactTable,
  ProjectBrainLinkEvidenceTable,
  ProjectBrainLinkTable,
  ProjectBrainPageTable,
  ProjectBrainRawSourceTable,
  ProjectTable,
} from "@/lib/db/pg/schema.pg";

export type ProjectGraphNodeKind =
  | "project"
  | "person"
  | "organization"
  | "document"
  | "meeting"
  | "tool"
  | "decision"
  | "topic"
  | "task"
  | "agent"
  | "voice";

const KIND_BY_PAGE_TYPE: Record<string, ProjectGraphNodeKind> = {
  overview: "project",
  person: "person",
  organization: "organization",
  document: "document",
  source: "document",
  meeting: "meeting",
  tool: "tool",
  decision: "decision",
  concept: "topic",
  course: "topic",
  note: "topic",
  topic: "topic",
  task: "task",
  agent: "agent",
  voice: "voice",
};

function graphPosition(index: number, total: number) {
  const angle = (Math.PI * 2 * index) / Math.max(total, 1);
  const ring = 260 + Math.floor(index / 18) * 130;
  return {
    x: Math.round(Math.cos(angle) * ring),
    y: Math.round(Math.sin(angle) * ring),
  };
}

export async function getProjectKnowledgeGraph(projectId: string) {
  const [project] = await pgDb
    .select({
      id: ProjectTable.id,
      name: ProjectTable.name,
      updatedAt: ProjectTable.updatedAt,
    })
    .from(ProjectTable)
    .where(eq(ProjectTable.id, projectId))
    .limit(1);

  if (!project) throw new Error("Project not found.");

  const pages = await pgDb
    .select()
    .from(ProjectBrainPageTable)
    .where(eq(ProjectBrainPageTable.projectId, projectId))
    .orderBy(desc(ProjectBrainPageTable.updatedAt))
    .limit(99);

  const pageIds = pages.map((page) => page.id);
  const facts = pageIds.length
    ? await pgDb
        .select({ pageId: ProjectBrainFactTable.pageId })
        .from(ProjectBrainFactTable)
        .where(
          and(
            eq(ProjectBrainFactTable.projectId, projectId),
            eq(ProjectBrainFactTable.status, "current"),
            inArray(ProjectBrainFactTable.pageId, pageIds),
          ),
        )
    : [];

  const factCount = new Map<string, number>();
  for (const fact of facts) {
    factCount.set(fact.pageId, (factCount.get(fact.pageId) ?? 0) + 1);
  }

  const evidence = await pgDb
    .select({ linkId: ProjectBrainLinkEvidenceTable.linkId })
    .from(ProjectBrainLinkEvidenceTable)
    .where(
      and(
        eq(ProjectBrainLinkEvidenceTable.projectId, projectId),
        eq(ProjectBrainLinkEvidenceTable.status, "current"),
      ),
    );
  const evidenceLinkIds = [...new Set(evidence.map((item) => item.linkId))];

  const links = evidenceLinkIds.length
    ? await pgDb
        .select()
        .from(ProjectBrainLinkTable)
        .where(
          and(
            eq(ProjectBrainLinkTable.projectId, projectId),
            inArray(ProjectBrainLinkTable.id, evidenceLinkIds),
          ),
        )
        .limit(250)
    : [];

  const nodes = [
    {
      id: `project:${project.id}`,
      kind: "project" as const,
      label: project.name,
      summary: null,
      factCount: 0,
      position: { x: 0, y: 0 },
    },
    ...pages.map((page, index) => ({
      id: page.id,
      kind: KIND_BY_PAGE_TYPE[page.type] ?? "topic",
      label: page.title,
      summary: page.summary,
      factCount: factCount.get(page.id) ?? 0,
      position: graphPosition(index, pages.length),
    })),
  ];

  return {
    nodes,
    edges: links.map((link) => ({
      id: link.id,
      source: link.fromPageId,
      target: link.toPageId,
      kind: link.linkType,
      label: link.linkType,
      confidence: Number(link.confidence),
    })),
    total: { nodes: nodes.length, edges: links.length },
    truncated: pages.length === 99 || links.length === 250,
    availableKinds: [...new Set(nodes.map((node) => node.kind))],
    updatedAt: project.updatedAt.toISOString(),
  };
}

export async function getProjectGraphNodeDetail(input: {
  projectId: string;
  nodeId: string;
}) {
  const [page] = await pgDb
    .select()
    .from(ProjectBrainPageTable)
    .where(
      and(
        eq(ProjectBrainPageTable.id, input.nodeId),
        eq(ProjectBrainPageTable.projectId, input.projectId),
      ),
    )
    .limit(1);

  if (!page) return null;

  const facts = await pgDb
    .select({
      id: ProjectBrainFactTable.id,
      key: ProjectBrainFactTable.factKey,
      value: ProjectBrainFactTable.value,
      confidence: ProjectBrainFactTable.confidence,
      observedAt: ProjectBrainFactTable.lastObservedAt,
      sourceId: ProjectBrainFactTable.lastSourceId,
    })
    .from(ProjectBrainFactTable)
    .where(
      and(
        eq(ProjectBrainFactTable.pageId, page.id),
        eq(ProjectBrainFactTable.status, "current"),
      ),
    )
    .orderBy(desc(ProjectBrainFactTable.lastObservedAt));

  const sourceIds = [
    ...new Set(facts.flatMap((fact) => (fact.sourceId ? [fact.sourceId] : []))),
  ];
  const sources = sourceIds.length
    ? await pgDb
        .select({
          id: ProjectBrainRawSourceTable.id,
          title: ProjectBrainRawSourceTable.title,
        })
        .from(ProjectBrainRawSourceTable)
        .where(inArray(ProjectBrainRawSourceTable.id, sourceIds))
    : [];
  const sourceName = new Map(
    sources.map((source) => [source.id, source.title]),
  );

  return {
    node: {
      id: page.id,
      kind: KIND_BY_PAGE_TYPE[page.type] ?? "topic",
      label: page.title,
      summary: page.summary,
    },
    facts: facts.map((fact) => ({
      ...fact,
      confidence: Number(fact.confidence),
      sourceLabel: fact.sourceId
        ? (sourceName.get(fact.sourceId) ?? "Project source")
        : "Project source",
    })),
  };
}
