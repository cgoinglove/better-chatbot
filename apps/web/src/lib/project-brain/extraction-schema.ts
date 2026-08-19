import { z } from "zod";

export const ProjectBrainEntityTypeSchema = z.enum([
  "overview",
  "person",
  "organization",
  "course",
  "task",
  "meeting",
  "note",
  "voice",
  "concept",
  "source",
  "decision",
  "document",
  "tool",
  "agent",
  "topic",
]);

const EntityIdSchema = z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/);

const FactSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_.-]{0,79}$/),
  type: z.enum(["attribute", "status", "decision", "task", "summary"]),
  value: z.string().trim().min(1).max(4000),
  confidence: z.number().min(0).max(1).default(1),
  observedAt: z.string().datetime().optional(),
});

const EntitySchema = z.object({
  id: EntityIdSchema,
  type: ProjectBrainEntityTypeSchema,
  title: z.string().trim().min(1).max(160),
  aliases: z.array(z.string().trim().min(1).max(160)).max(20).default([]),
  summary: z.string().max(2000).optional(),
  facts: z.array(FactSchema).max(100).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

const RelationSchema = z.object({
  fromEntityId: EntityIdSchema,
  toEntityId: EntityIdSchema,
  type: z.string().regex(/^[a-z][a-z0-9_-]{0,79}$/),
  context: z.string().max(2000).optional(),
  confidence: z.number().min(0).max(1).default(1),
  observedAt: z.string().datetime().optional(),
});

const TimelineItemSchema = z.object({
  entityId: EntityIdSchema.optional(),
  summary: z.string().min(1),
  detail: z.string().optional(),
  eventDate: z.string().datetime().optional(),
});

const WidgetCellSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const ProjectWidgetSpecSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("table"),
    slot: z
      .string()
      .max(60)
      .regex(/^[a-z0-9_-]+$/),
    title: z.string().min(1).max(80),
    columns: z.array(
      z.object({
        key: z.string().min(1),
        label: z.string().min(1),
        type: z.enum(["text", "number", "status"]).default("text"),
      }),
    ),
    rows: z.array(z.record(z.string(), WidgetCellSchema)).max(25),
  }),
  z.object({
    kind: z.literal("metric"),
    slot: z
      .string()
      .max(60)
      .regex(/^[a-z0-9_-]+$/),
    title: z.string().min(1).max(80),
    items: z
      .array(
        z.object({
          label: z.string(),
          value: WidgetCellSchema,
          delta: WidgetCellSchema.optional(),
          deltaLabel: z.string().optional(),
        }),
      )
      .max(12),
  }),
]);

/**
 * Drop array items that do not parse, instead of letting one bad item reject the
 * whole extraction. The model occasionally emits a widget with an unknown `kind`
 * or a half-built entity; losing that item is recoverable, losing the entire run
 * is not.
 *
 * Runs as a `z.preprocess` so the surviving items are still validated by the
 * inner schema afterwards — this filters, it does not weaken.
 */
function resilientArray(schema: z.ZodTypeAny) {
  return (value: unknown): unknown =>
    Array.isArray(value)
      ? value.filter((item) => schema.safeParse(item).success)
      : value;
}

export const ProjectBrainExtractionSchema = z
  .object({
    summary: z.string().default(""),
    entities: z.preprocess(
      resilientArray(EntitySchema),
      z.array(EntitySchema).max(200).default([]),
    ),
    relations: z.preprocess(
      resilientArray(RelationSchema),
      z.array(RelationSchema).max(500).default([]),
    ),
    timeline: z.preprocess(
      resilientArray(TimelineItemSchema),
      z.array(TimelineItemSchema).default([]),
    ),
    todos: z
      .array(
        z.object({
          title: z.string().min(1),
          status: z
            .enum(["open", "in_progress", "done", "blocked"])
            .catch("open"),
          priority: z
            .enum(["low", "normal", "high", "critical"])
            .catch("normal"),
          rationale: z.string().optional(),
        }),
      )
      .default([]),
    status: z
      .object({
        health: z.enum(["green", "yellow", "red", "unknown"]).catch("unknown"),
        progressPct: z.number().min(0).max(100).optional(),
        blockers: z.array(z.string()).default([]),
        shortSummary: z.string().default(""),
      })
      .default({ health: "unknown", blockers: [], shortSummary: "" }),
    widgets: z.preprocess(
      resilientArray(ProjectWidgetSpecSchema),
      // `.max(6)` counts what survived the filter, so a run is not failed for
      // length by widgets that were going to be dropped anyway.
      z
        .array(ProjectWidgetSpecSchema)
        .max(6)
        .default([]),
    ),
  })
  .transform((value) => {
    // `persist-extraction.ts` maps entity.id -> pageId with last-write-wins and
    // resolves every relation through that map, so a duplicate id would quietly
    // re-point relations at the wrong page. The previous superRefine rejected
    // the whole extraction for this; keeping the first occurrence protects the
    // graph without throwing the run away.
    const entityIds = new Set<string>();
    const entities = value.entities.filter((entity) => {
      if (entityIds.has(entity.id)) return false;
      entityIds.add(entity.id);
      return true;
    });

    // Dangling and self-referential relations are dropped rather than rejected —
    // a partial extraction beats a total failure on a small cross-reference slip.
    return {
      ...value,
      entities,
      relations: value.relations.filter(
        (relation) =>
          entityIds.has(relation.fromEntityId) &&
          entityIds.has(relation.toEntityId) &&
          relation.fromEntityId !== relation.toEntityId,
      ),
    };
  });

export type ProjectBrainExtraction = z.infer<
  typeof ProjectBrainExtractionSchema
>;
