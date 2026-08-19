import "server-only";
import { formatAgentsetSearchContext } from "@/lib/agentset/citation-context";
import { filterRelevantRetrievalResults } from "@/lib/agentset/filter-relevant-results";
import { getAgentsetRetrievalRerankLimit } from "@/lib/agentset/retrieval-config";
import { searchProjectKnowledge } from "@/lib/agentset/retrieval";
import { shouldRetrieveForQuery } from "@/lib/agentset/should-retrieve-for-query";
import type { RetrievalSource } from "@/lib/citations/retrieval-source";
import {
  searchProjectBrainChunks,
  keywordSearchProjectBrainChunks,
} from "./search-local";
import { getLatestProjectStatusSnapshot } from "./generated-insights";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  ProjectBrainFactTable,
  ProjectBrainPageTable,
  ProjectTable,
} from "@/lib/db/pg/schema.pg";

export type ProjectRetrievalResult = {
  prompt: string;
  sources: RetrievalSource[];
};

async function getProjectGraphContext(projectId: string, query: string) {
  const terms = query
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((term) => `%${term}%`);

  if (!terms.length) return [];

  return pgDb
    .select({
      pageTitle: ProjectBrainPageTable.title,
      key: ProjectBrainFactTable.factKey,
      value: ProjectBrainFactTable.value,
    })
    .from(ProjectBrainFactTable)
    .innerJoin(
      ProjectBrainPageTable,
      eq(ProjectBrainPageTable.id, ProjectBrainFactTable.pageId),
    )
    .where(
      and(
        eq(ProjectBrainFactTable.projectId, projectId),
        eq(ProjectBrainFactTable.status, "current"),
        or(
          ...terms.flatMap((term) => [
            ilike(ProjectBrainPageTable.title, term),
            ilike(ProjectBrainFactTable.factKey, term),
            ilike(ProjectBrainFactTable.value, term),
          ]),
        ),
      ),
    )
    .orderBy(desc(ProjectBrainFactTable.lastObservedAt))
    .limit(12);
}

export async function buildProjectRetrievalPrompt(input: {
  userId: string;
  projectId: string;
  query: string;
}): Promise<ProjectRetrievalResult> {
  const trimmed = input.query.trim();
  if (!shouldRetrieveForQuery(trimmed)) {
    return { prompt: "", sources: [] };
  }

  const [
    projectResult,
    agentsetResult,
    vectorChunks,
    ftsChunks,
    statusSnapshot,
    graphFacts,
  ] = await Promise.allSettled([
    pgDb
      .select({ memoryEnabled: ProjectTable.memoryEnabled })
      .from(ProjectTable)
      .where(eq(ProjectTable.id, input.projectId))
      .limit(1),
    searchProjectKnowledge({
      userId: input.userId,
      projectId: input.projectId,
      query: trimmed,
      limit: getAgentsetRetrievalRerankLimit(),
    }),
    searchProjectBrainChunks({
      projectId: input.projectId,
      query: trimmed,
      limit: 8,
    }),
    keywordSearchProjectBrainChunks({
      projectId: input.projectId,
      query: trimmed,
      limit: 8,
    }),
    getLatestProjectStatusSnapshot(input.projectId),
    getProjectGraphContext(input.projectId, trimmed),
  ]);

  if (
    projectResult.status !== "fulfilled" ||
    !projectResult.value[0]?.memoryEnabled
  ) {
    return { prompt: "", sources: [] };
  }

  const parts: string[] = [];
  const sources: RetrievalSource[] = [];

  if (agentsetResult.status === "fulfilled") {
    const { backend, results } = agentsetResult.value;
    const relevantResults = filterRelevantRetrievalResults(results);
    if (relevantResults.length) {
      const context = formatAgentsetSearchContext(relevantResults);
      const sourceIndex = relevantResults
        .map((result) => {
          const idSuffix = result.documentId
            ? ` | documentId: ${result.documentId}`
            : "";
          const pageSuffix =
            result.pageNumber != null ? ` | page: ${result.pageNumber}` : "";
          const chunkSuffix = result.chunkId
            ? ` | chunkId: ${result.chunkId}`
            : "";
          return `[${result.rank}] ${result.source}${idSuffix}${pageSuffix}${chunkSuffix}`;
        })
        .join("\n");
      // Retrieved content only. The citation rules that describe it are static
      // and live in the system prompt (AGENTSET_CITATION_GUIDELINES) so they
      // stay cacheable while this block changes every turn.
      parts.push(`<project_knowledge_retrieval backend="${backend}">
${context}
</project_knowledge_retrieval>

Source index (for <CITATIONS> filenames and documentId values):
${sourceIndex}`);
      sources.push(...relevantResults);
    }
  } else {
    console.error("[project retrieval] agentset failed", {
      projectId: input.projectId,
      error: agentsetResult.reason,
    });
  }

  const brainChunks = [
    ...(vectorChunks.status === "fulfilled" ? vectorChunks.value : []),
    ...(ftsChunks.status === "fulfilled" ? ftsChunks.value : []),
  ];

  const seen = new Set<string>();
  const uniqueChunks = brainChunks.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  if (uniqueChunks.length) {
    const chunkText = uniqueChunks
      .map((c, i) => `[brain:${i + 1}] (${c.chunk_type}) ${c.content}`)
      .join("\n\n");
    parts.push(`<project_brain_memory>
${chunkText}
</project_brain_memory>`);
  }

  if (statusSnapshot.status === "fulfilled" && statusSnapshot.value?.summary) {
    parts.push(`<project_current_status>
${statusSnapshot.value.summary}
</project_current_status>`);
  }

  if (graphFacts.status === "fulfilled" && graphFacts.value.length) {
    parts.push(`<project_knowledge_graph_facts>
${graphFacts.value
  .map((fact) => `- ${fact.pageTitle}: ${fact.key} = ${fact.value}`)
  .join("\n")}
</project_knowledge_graph_facts>`);
  }

  if (!parts.length) {
    return { prompt: "", sources: [] };
  }

  return {
    prompt: parts.join("\n\n"),
    sources,
  };
}
