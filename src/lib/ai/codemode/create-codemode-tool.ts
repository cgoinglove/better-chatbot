import "server-only";
import { tool as createTool, Tool } from "ai";
import { createCodeTool } from "@cloudflare/codemode/ai";
import { z } from "zod";
import { getCodemodeExecutor } from "./executor";

// ─── Local helpers (avoid importing from @cloudflare/codemode main entry
//     which pulls in cloudflare:workers) ──────────────────────────────

const JS_RESERVED = new Set([
  "abstract",
  "arguments",
  "await",
  "boolean",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "double",
  "else",
  "enum",
  "eval",
  "export",
  "extends",
  "false",
  "final",
  "finally",
  "float",
  "for",
  "function",
  "goto",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "int",
  "interface",
  "let",
  "long",
  "native",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "static",
  "super",
  "switch",
  "synchronized",
  "this",
  "throw",
  "throws",
  "transient",
  "true",
  "try",
  "typeof",
  "undefined",
  "var",
  "volatile",
  "void",
  "while",
  "with",
  "yield",
]);

/** Convert a tool name to a valid JS identifier. */
function sanitizeName(name: string): string {
  if (!name) return "_";
  let s = name.replace(/[-. ]/g, "_").replace(/[^a-zA-Z0-9_$]/g, "");
  if (!s) return "_";
  if (/^\d/.test(s)) s = "_" + s;
  if (JS_RESERVED.has(s)) s += "_";
  return s;
}

/** Render a JSON-schema-like object into a compact TS type string. */
function schemaToTs(schema: Record<string, any>): string {
  if (!schema || typeof schema !== "object") return "unknown";
  if (schema.type === "string") return "string";
  if (schema.type === "number" || schema.type === "integer") return "number";
  if (schema.type === "boolean") return "boolean";
  if (schema.type === "null") return "null";
  if (schema.type === "array") {
    const items = schema.items ? schemaToTs(schema.items) : "unknown";
    return `${items}[]`;
  }
  if (schema.type === "object" || schema.properties) {
    const props = schema.properties ?? {};
    const reqRaw = schema.required;
    const required = new Set<string>(Array.isArray(reqRaw) ? reqRaw : []);
    const fields = Object.entries(props)
      .map(([k, v]) => {
        const opt = required.has(k) ? "" : "?";
        return `${k}${opt}: ${schemaToTs(v as Record<string, any>)}`;
      })
      .join("; ");
    return `{ ${fields} }`;
  }
  if (schema.anyOf || schema.oneOf) {
    const variants = (schema.anyOf ?? schema.oneOf) as Record<string, any>[];
    return variants.map((v) => schemaToTs(v)).join(" | ");
  }
  if (schema.enum) {
    return (schema.enum as string[]).map((v) => JSON.stringify(v)).join(" | ");
  }
  return "unknown";
}

/**
 * Per-tool type definition entry used by the explorer.
 */
interface ToolTypeEntry {
  name: string;
  originalName: string;
  description: string;
  typeDef: string;
}

/**
 * Builds a searchable index from the tool set. Generates a compact TS
 * signature per tool from its JSON Schema input — no `zod-to-ts` needed.
 */
function buildToolIndex(tools: Record<string, Tool>): ToolTypeEntry[] {
  const entries: ToolTypeEntry[] = [];

  for (const [originalName, t] of Object.entries(tools)) {
    const safeName = sanitizeName(originalName);
    const desc = t.description ?? originalName;

    // Extract JSON Schema from the tool (Vercel AI SDK v5 uses .inputSchema)
    const raw = (t as any).inputSchema ?? (t as any).parameters;
    let inputTs = "unknown";
    if (raw) {
      // raw may be a ZodType with jsonSchema property, or a plain object
      const jsonSchema =
        typeof raw.toJSON === "function"
          ? raw.toJSON()
          : typeof raw.jsonSchema === "object"
            ? raw.jsonSchema
            : raw;
      inputTs = schemaToTs(jsonSchema);
    }

    const typeDef = `/** ${desc} */\n${safeName}: (input: ${inputTs}) => Promise<unknown>;`;

    entries.push({ name: safeName, originalName, description: desc, typeDef });
  }

  return entries;
}

// ─── Tool descriptions (compact — no type defs) ────────────────────

const EXPLORE_DESCRIPTION = `List available tool APIs and their TypeScript type signatures.

When to call:
- BEFORE writing code, to discover exact tool names and their input parameters.
- When unsure what tools exist or what arguments they accept.

Pass a keyword to filter (e.g. "search", "email") or "*" to list all tools.
Returns tool names, descriptions, and full TypeScript type signatures.`;

/**
 * Build the execute-tool description with a compact tool directory so the LLM
 * knows which tools exist (names only) without the full type schemas.
 */
function buildExecuteDescription(index: ToolTypeEntry[]): string {
  const toolList = index
    .map((t) => `  - codemode.${t.name}() — ${t.description.slice(0, 80)}`)
    .join("\n");

  return `Execute a JavaScript async arrow function. Your code runs in a sandbox.

AVAILABLE TOOLS (call via codemode.toolName(args)):
${toolList}

If you need the exact input schema for a tool, call codemode_explore first.
For simple tasks (math, string ops), just compute directly — no tool call needed.

RULES:
- Access tools ONLY as \`codemode.toolName(args)\`. No other variable name.
- \`codemode\` is a proxy object — it ONLY has the tools listed above. Do NOT call \`codemode.run_code\`, \`codemode.execute\`, or any method not listed.
- Write a single async arrow function. Do NOT define named functions.
- Return the final result.

EXAMPLES:
  Simple math: async () => { return 1 + 1; }
  Tool call:   async () => { const r = await codemode.webSearch({ query: "test" }); return r; }
  Multi-step:  async () => { const a = await codemode.webSearch({ query: "weather" }); const b = await codemode.sendEmail({ to: "me@x.com", subject: "Weather", body: a }); return { a, b }; }`;
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Builds the two codemode tools:
 * - `codemode_explore` — search API types by keyword (low token cost)
 * - `codemode` — execute generated code
 */
export function buildCodemodeTools(
  tools: Record<string, Tool>,
): Record<string, Tool> {
  const index = buildToolIndex(tools);
  const executor = getCodemodeExecutor();

  // 1. Explorer tool — lets the LLM discover APIs without loading all types
  const exploreTool = createTool({
    description: EXPLORE_DESCRIPTION,
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          'Search keyword to filter tools (e.g. "search", "email", "code"). Use "*" to list all.',
        ),
    }),
    execute: async ({ query }) => {
      const q = query.trim().toLowerCase();
      const matches =
        q === "*"
          ? index
          : index.filter(
              (entry) =>
                entry.name.toLowerCase().includes(q) ||
                entry.originalName.toLowerCase().includes(q) ||
                entry.description.toLowerCase().includes(q),
            );

      if (matches.length === 0) {
        return {
          matches: 0,
          tools: [],
          hint: `No tools matched "${query}". Try a broader keyword or use "*" to list all.`,
        };
      }

      return {
        matches: matches.length,
        tools: matches.map((m) => ({
          name: m.name,
          description: m.description,
          typeDef: m.typeDef,
        })),
      };
    },
  });

  // 2. Executor tool — runs generated code (compact tool directory in description)
  const executeTool = createCodeTool({
    tools,
    executor,
    description: buildExecuteDescription(index),
  }) as Tool;

  return {
    codemode_explore: exploreTool,
    codemode: executeTool,
  };
}
