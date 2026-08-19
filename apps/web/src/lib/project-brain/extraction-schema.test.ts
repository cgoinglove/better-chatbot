import { zodSchema } from "ai";
import { describe, expect, it } from "vitest";
import {
  ProjectBrainExtractionSchema,
  ProjectWidgetSpecSchema,
} from "./extraction-schema";

const meetingEntity = {
  id: "meeting-apr-7",
  type: "meeting",
  title: "April 7 Standup",
  aliases: [],
  facts: [],
  metadata: {},
};

const personEntity = {
  id: "person-alice",
  type: "person",
  title: "Alice",
  aliases: [],
  facts: [],
  metadata: {},
};

const meetingToPerson = {
  fromEntityId: "meeting-apr-7",
  toEntityId: "person-alice",
  type: "attended-by",
  confidence: 0.9,
};

const tableWidget = {
  kind: "table",
  slot: "agenda",
  title: "Upcoming Events",
  columns: [{ key: "title", label: "Title", type: "text" }],
  rows: [{ title: "Standup" }],
};

const metricWidget = {
  kind: "metric",
  slot: "summary",
  title: "Stats",
  items: [{ label: "Events", value: 5 }],
};

/** The schema defaults every field, so only the parts under test need spelling out. */
function parse(input: Record<string, unknown>) {
  return ProjectBrainExtractionSchema.parse(input);
}

describe("ProjectBrainExtractionSchema", () => {
  it("parses a fully valid extraction unchanged", () => {
    const result = parse({
      summary: "test",
      entities: [meetingEntity, personEntity],
      relations: [meetingToPerson],
      widgets: [tableWidget, metricWidget],
    });

    expect(result.entities).toHaveLength(2);
    expect(result.relations).toHaveLength(1);
    expect(result.widgets).toHaveLength(2);
  });

  it("returns empty defaults for a bare object", () => {
    const result = parse({});

    expect(result.entities).toEqual([]);
    expect(result.relations).toEqual([]);
    expect(result.timeline).toEqual([]);
    expect(result.todos).toEqual([]);
    expect(result.widgets).toEqual([]);
  });
});

// The incident: the model emitted widgets with kind "list"/"calendar" and a
// "metric" with no `items`, which rejected the entire extraction and failed the
// run with AI_NoObjectGeneratedError.
describe("ProjectBrainExtractionSchema — widget resilience", () => {
  it("drops widgets with an unknown kind and keeps the valid ones", () => {
    const result = parse({
      widgets: [
        { kind: "list", slot: "items", title: "List", items: [] },
        { kind: "calendar", slot: "cal", title: "Cal" },
        metricWidget,
      ],
    });

    expect(result.widgets).toHaveLength(1);
    expect(result.widgets[0].kind).toBe("metric");
  });

  it("drops a metric widget that is missing its items array", () => {
    const result = parse({
      widgets: [
        { kind: "metric", slot: "bad", title: "No items" },
        tableWidget,
      ],
    });

    expect(result.widgets).toHaveLength(1);
    expect(result.widgets[0].kind).toBe("table");
  });

  it("applies the 6-widget cap after filtering, not before", () => {
    const invalid = Array.from({ length: 8 }, (_, index) => ({
      kind: "list",
      slot: `bad_${index}`,
      title: "Nope",
    }));

    const result = parse({ widgets: [...invalid, tableWidget] });

    expect(result.widgets).toHaveLength(1);
  });

  it("still rejects an unknown kind at the widget-spec level", () => {
    expect(() =>
      ProjectWidgetSpecSchema.parse({ kind: "list", slot: "x", title: "X" }),
    ).toThrow();
  });
});

describe("ProjectBrainExtractionSchema — entity and relation resilience", () => {
  it("drops entities whose id breaks the id format", () => {
    const result = parse({
      entities: [{ ...meetingEntity, id: "NotSnakeCase" }, personEntity],
    });

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].id).toBe("person-alice");
  });

  // persist-extraction.ts maps entity.id -> pageId with last-write-wins, so a
  // duplicate id would silently re-point relations at the wrong page.
  it("keeps the first entity when an id is duplicated", () => {
    const result = parse({
      entities: [
        meetingEntity,
        { ...meetingEntity, title: "Impostor Standup" },
        personEntity,
      ],
      relations: [meetingToPerson],
    });

    expect(result.entities).toHaveLength(2);
    expect(result.entities[0].title).toBe("April 7 Standup");
    // The surviving relation still resolves against the kept entity.
    expect(result.relations).toHaveLength(1);
  });

  it("drops relations that reference an entity the model never emitted", () => {
    const result = parse({
      entities: [meetingEntity],
      relations: [meetingToPerson],
    });

    expect(result.relations).toHaveLength(0);
  });

  it("drops self-referential relations", () => {
    const result = parse({
      entities: [meetingEntity],
      relations: [
        {
          fromEntityId: "meeting-apr-7",
          toEntityId: "meeting-apr-7",
          type: "self-ref",
          confidence: 1,
        },
      ],
    });

    expect(result.relations).toHaveLength(0);
  });

  it("drops timeline items with a malformed entity id", () => {
    const result = parse({
      entities: [meetingEntity],
      timeline: [
        { entityId: "NotSnakeCase", summary: "bad entity id" },
        { summary: "no entity id at all" },
        { entityId: "meeting-apr-7", summary: "valid" },
      ],
    });

    expect(result.timeline).toHaveLength(2);
  });
});

// The resilient arrays are built with z.preprocess, which in zod v4 is a
// ZodPipe(ZodTransform, inner). If the AI SDK ever rendered the *input* side of
// that pipe, the widget union would collapse to `{}` and the model would lose
// the only description of what a widget looks like — quietly making the original
// incident worse. Assert through the same conversion generateObject performs.
describe("JSON Schema handed to the model", () => {
  const json = JSON.stringify(
    zodSchema(ProjectBrainExtractionSchema).jsonSchema,
  );

  it("still describes both widget kinds", () => {
    expect(json).toContain('"table"');
    expect(json).toContain('"metric"');
  });

  it("still describes the fields each widget kind requires", () => {
    expect(json).toContain('"columns"');
    expect(json).toContain('"rows"');
    expect(json).toContain('"items"');
  });

  it("still describes the entity and relation shapes", () => {
    expect(json).toContain('"entities"');
    expect(json).toContain('"relations"');
    expect(json).toContain('"fromEntityId"');
  });
});
