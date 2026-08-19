import "server-only";
import { minimalToolExecutionOptions } from "@/lib/ai/tools/minimal-tool-execution-options";
import { resolveAllowedAppDefaultToolkits } from "@/lib/ai/tools/resolve-allowed-toolkits";
import { Tool, ToolUIPart, getToolName } from "ai";
import { ChatMention, ManualToolConfirmTag } from "app-types/chat";
import { VercelAIMcpTool, VercelAIMcpToolTag } from "app-types/mcp";
import {
  VercelAIWorkflowTool,
  VercelAIWorkflowToolTag,
} from "app-types/workflow";
import { MANUAL_REJECT_RESPONSE_PROMPT } from "lib/ai/prompts";
import { AppDefaultToolkit, DefaultToolName } from "lib/ai/tools";
import {
  createAnalyzeDocumentTool,
  createEditDocumentTool,
} from "lib/ai/tools/document/create-document-tools";
import { createTabularReviewToolWithExecute } from "lib/ai/tools/tabular/create-tabular-tool";
import { APP_DEFAULT_TOOL_KIT } from "lib/ai/tools/tool-kit";
import {
  createExaContentsTool,
  createExaSearchTool,
} from "lib/ai/tools/web/web-search";
import { errorToString, objectFlow } from "lib/utils";
import logger from "logger";
import { safe } from "ts-safe";

export function excludeToolExecution(
  tool: Record<string, Tool>,
): Record<string, Tool> {
  return objectFlow(tool).map((value) => {
    // Manual mode must preserve the SDK tool definition (output schemas,
    // provider options, annotations, and approval settings) while preventing
    // the model loop from executing it automatically.
    return {
      ...value,
      execute: undefined,
    } as Tool;
  });
}

export function manualToolExecuteByLastMessage(
  part: ToolUIPart,
  tools: Record<string, VercelAIMcpTool | VercelAIWorkflowTool | Tool>,
  _userId: string,
  abortSignal?: AbortSignal,
) {
  const { input } = part;

  const toolName = getToolName(part);

  const tool = tools[toolName];
  return safe(() => {
    if (!tool) throw new Error(`tool not found: ${toolName}`);
    if (!ManualToolConfirmTag.isMaybe(part.output))
      throw new Error("manual tool confirm not found");
    return part.output;
  })
    .map(async ({ confirm }) => {
      if (!confirm) return MANUAL_REJECT_RESPONSE_PROMPT;
      if (VercelAIWorkflowToolTag.isMaybe(tool)) {
        return tool.execute!(
          input,
          minimalToolExecutionOptions({
            toolCallId: part.toolCallId,
            abortSignal: abortSignal ?? new AbortController().signal,
          }),
        );
      } else if (VercelAIMcpToolTag.isMaybe(tool)) {
        // Direct ephemeral client execution (server-side context)
        // Cannot use RPC fetch here because we're already in server context
        const { createEphemeralMCPClient } = await import(
          "lib/ai/mcp/ephemeral-client"
        );
        const execClient = await createEphemeralMCPClient(
          tool._mcpServerId,
          _userId,
        );
        if (!execClient) {
          throw new Error("MCP server not found");
        }
        try {
          const result = await execClient.callTool(
            tool._originToolName,
            input,
            abortSignal,
          );
          return result;
        } finally {
          await execClient.disconnect();
        }
      }
      return tool.execute!(
        input,
        minimalToolExecutionOptions({
          toolCallId: part.toolCallId,
          abortSignal: abortSignal ?? new AbortController().signal,
        }),
      );
    })
    .ifFail((error) => ({
      isError: true,
      statusMessage: `tool call fail: ${toolName}`,
      error: errorToString(error),
    }))
    .unwrap();
}

/**
 * Loads tools from Composio for the given user using the VercelProvider.
 * session.tools() returns Vercel AI SDK-compatible tools with built-in
 * execute functions — no manual connection or agentic loop needed.
 */
/**
 * Per-instance memo for Composio tools.
 *
 * `session.tools()` is a network round-trip that previously ran on *every*
 * chat message (~500ms in production). The returned tools are live AI-SDK tool
 * objects with bound `execute` closures, so they cannot be serialized to a
 * shared cache (Redis) — only memoized in-process. This memo is therefore
 * per-warm-instance: it removes the repeat cost for subsequent messages handled
 * by the same serverless instance, which is the common case under sustained
 * load. `inflight` provides single-flight so N concurrent first-messages for
 * one user collapse to a single upstream call instead of a stampede.
 *
 * Override the TTL with COMPOSIO_TOOLS_TTL_MS (default 5 min); set to 0 to
 * disable memoization entirely.
 */
const COMPOSIO_TOOLS_TTL_MS = (() => {
  const raw = Number(process.env.COMPOSIO_TOOLS_TTL_MS);
  return Number.isFinite(raw) && raw >= 0 ? raw : 5 * 60 * 1000;
})();
type ComposioToolsEntry = {
  tools: Record<string, Tool>;
  expiresAt: number;
};
const composioToolsCache = new Map<string, ComposioToolsEntry>();
const composioToolsInflight = new Map<string, Promise<Record<string, Tool>>>();

const fetchComposioTools = async (
  userId: string,
): Promise<Record<string, Tool>> => {
  const { composio } = await import("lib/composio/client");
  // Composio's Tool Router ships its own code sandbox and it defaults to ON,
  // which bound COMPOSIO_REMOTE_WORKBENCH + COMPOSIO_REMOTE_BASH_TOOL on every
  // turn. Those competed with our own E2B tools — ahead of them in the tool
  // list, and with descriptions fetched over the network that we can neither
  // see nor edit — so the model reached for a bash sandbox instead of
  // e2b-sandbox/python-execution. Code execution belongs to E2B here.
  const session = await composio.create(userId, { sandbox: { enable: false } });
  const tools = await session.tools();
  return (tools as unknown as Record<string, Tool>) ?? {};
};

export const loadComposioTools = async (
  userId: string,
): Promise<Record<string, Tool>> => {
  try {
    if (!userId) return {};

    if (COMPOSIO_TOOLS_TTL_MS === 0) {
      return await fetchComposioTools(userId);
    }

    const now = Date.now();
    const cached = composioToolsCache.get(userId);
    if (cached && cached.expiresAt > now) {
      return cached.tools;
    }

    // Single-flight: coalesce concurrent loads for the same user.
    const existing = composioToolsInflight.get(userId);
    if (existing) return await existing;

    const promise = fetchComposioTools(userId)
      .then((tools) => {
        composioToolsCache.set(userId, {
          tools,
          expiresAt: Date.now() + COMPOSIO_TOOLS_TTL_MS,
        });
        return tools;
      })
      .finally(() => {
        composioToolsInflight.delete(userId);
      });
    composioToolsInflight.set(userId, promise);
    return await promise;
  } catch (error) {
    logger.warn("Failed to load Composio tools:", error);
    return {};
  }
};

export const loadAppDefaultTools = (opt?: {
  mentions?: ChatMention[];
  allowedAppDefaultToolkit?: string[];
  userId?: string;
  billingCustomerId?: string | null;
  billingEntityId?: string;
  projectId?: string;
}) =>
  safe(APP_DEFAULT_TOOL_KIT)
    .map((tools) => {
      const allowedAppDefaultToolkit = resolveAllowedAppDefaultToolkits({
        allowedAppDefaultToolkit: opt?.allowedAppDefaultToolkit,
        projectId: opt?.projectId,
      });

      const fromToolkits = allowedAppDefaultToolkit.reduce(
        (acc, key) => ({ ...acc, ...tools[key] }),
        {} as Record<string, Tool>,
      );

      // Pinning specific tools is what a `@tool` mention means, so honour it —
      // but only when the user actually mentioned one. This used to trigger on
      // `mentions.length`, i.e. ANY mention type, while filtering to
      // `defaultTool`. Selecting an agent injects an `{type:"agent"}` mention
      // on its own, so every agent turn silently resolved to zero app default
      // tools — losing python-execution and e2b-sandbox while leaving every
      // Composio tool bound, and leaving the system prompt recommending a
      // python-execution that was not there.
      const defaultToolMentions = (opt?.mentions ?? []).filter(
        (m) => m.type == "defaultTool",
      );
      if (defaultToolMentions.length === 0) return fromToolkits;

      const mentioned = Array.from(Object.values(tools)).reduce((acc, t) => {
        const allowed = objectFlow(t).filter((_, k) =>
          defaultToolMentions.some((m) => m.name == k),
        );
        return { ...acc, ...allowed };
      }, {}) as Record<string, Tool>;

      // Code execution stays available alongside the pinned tools: an agent
      // that mentions a table builder still needs a sandbox to compute what
      // goes in the table. `fromToolkits` is used as the source, so a user who
      // switched Code off in the tool menu keeps it off.
      const codeTools = allowedAppDefaultToolkit.includes(
        AppDefaultToolkit.Code,
      )
        ? (tools[AppDefaultToolkit.Code] ?? {})
        : {};

      return { ...codeTools, ...mentioned };
    })
    .map((loadedTools) => {
      const updatedTools = { ...loadedTools };

      // Replace web search tools with userId-bound versions for Autumn tracking
      if (opt?.userId) {
        if (updatedTools[DefaultToolName.WebSearch]) {
          updatedTools[DefaultToolName.WebSearch] = createExaSearchTool(
            opt.billingCustomerId ?? opt.userId,
            opt.billingEntityId,
          );
        }
        if (updatedTools[DefaultToolName.WebContent]) {
          updatedTools[DefaultToolName.WebContent] = createExaContentsTool(
            opt.billingCustomerId ?? opt.userId,
            opt.billingEntityId,
          );
        }
      }

      // Bind userId to document & tabular tools so they can execute server-side
      if (opt?.userId) {
        if (updatedTools[DefaultToolName.AnalyzeDocument]) {
          updatedTools[DefaultToolName.AnalyzeDocument] =
            createAnalyzeDocumentTool(opt.userId, opt.projectId);
        }
        if (updatedTools[DefaultToolName.EditDocument]) {
          updatedTools[DefaultToolName.EditDocument] = createEditDocumentTool(
            opt.userId,
          );
        }
        if (updatedTools[DefaultToolName.CreateTabularReview]) {
          updatedTools[DefaultToolName.CreateTabularReview] =
            createTabularReviewToolWithExecute(opt.userId, opt.projectId);
        }
      }

      return updatedTools;
    })
    .ifFail((e) => {
      console.error(e);
      throw e;
    })
    .orElse({} as Record<string, Tool>);
