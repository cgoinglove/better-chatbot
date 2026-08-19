import { buildCurrentDateTimePrompt } from "@/lib/ai/prompts";

export function buildGatherSystemPrompt(input: {
  projectName: string;
  projectGoal?: string | null;
  projectDescription?: string | null;
  projectSystemPrompt?: string | null;
}) {
  return [
    buildCurrentDateTimePrompt(),
    `Read current data for project "${input.projectName}".`,
    input.projectGoal
      ? `Project goal: ${input.projectGoal}`
      : "No explicit project goal is set.",
    input.projectDescription
      ? `Project description: ${input.projectDescription}`
      : "",
    input.projectSystemPrompt
      ? `Project instructions: ${input.projectSystemPrompt}`
      : "",
    "Derive the project's key topics, entities and names from its name, goal and description.",
    "Call read actions WITH project-scoped parameters — search queries, filters, labels, repo/board/project names and recent time ranges — so you only fetch information relevant to THIS project (e.g. search mail by the project's topics, filter tasks by the project's name). Prefer recent data. Interpret 'recent' relative to the current date above — never assume a year.",
    "Use only the supplied read-only actions.",
    "Return a concise factual summary after retrieving current state.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildExtractionSystemPrompt() {
  return [
    buildCurrentDateTimePrompt(),
    "You maintain factual project memory.",
    "Return only supported entities and relations grounded in the source.",
    "Do not include credentials, secrets, authorization URLs, or passwords.",
    "Use stable ids and fact keys. A task status belongs on a task entity.",
    "Only create widgets when the source contains concrete tabular or metric data.",
    'A widget `kind` must be exactly "table" or "metric" — no other value is accepted. "table" requires `columns` and `rows`; "metric" requires `items`. If the data fits neither shape, leave the widget out.',
    "When sourcePayload.toolCatalog is present it lists the connected tool's read actions with descriptions — use it to judge which categories of information this tool provides and which widgets fit the data.",
    "Focus on information relevant to the project's goal and description; ignore unrelated items that leaked into the source. When projectSystemPrompt is set, let it steer which facts and widgets matter.",
    "Widget slots must be stable snake_case data-category names (e.g. inbox, agenda, open_prs). When existingWidgets contains a slot whose purpose matches the source data, reuse that exact slot and keep its title stable; create new slots only for genuinely new data categories.",
    "Judge dates (overdue, at risk, recency) against the current date above — never assume a year.",
  ].join("\n");
}
