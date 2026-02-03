import { ChatModel } from "app-types/chat";
import { WorkflowIcon } from "app-types/workflow";
import { ObjectJsonSchema7, TipTapMentionJsonContent } from "app-types/util";
import { workflowRepository } from "lib/db/repository";
import { createUINode } from "lib/ai/workflow/create-ui-node";
import { NodeKind, UINode } from "./workflow.interface";
import {
  convertUINodeToDBNode,
  defaultObjectJsonSchema,
} from "./shared.workflow";
import { DefaultToolName } from "lib/ai/tools";
import { exaSearchSchema, exaSearchTool } from "lib/ai/tools/web/web-search";
import { generateUUID } from "lib/utils";
import { DBEdge, DBNode } from "app-types/workflow";
import { computeNextRunDate } from "./scheduler-utils";
import { ConditionBranch, BooleanConditionOperator } from "./condition";

const DEFAULT_ICON: WorkflowIcon = {
  type: "emoji",
  value:
    "https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f916.png",
  style: { backgroundColor: "oklch(87% 0 0)" },
};

const DEFAULT_MODEL: ChatModel = {
  provider: "openai",
  model: "gpt-4.1-mini",
};

type PulseWorkflowOptions = {
  userId: string;
  workflowName: string;
  description?: string;
  query: string;
  cron: string;
  timezone: string;
  scheduleDescription?: string;
  summaryInstructions?: string;
  numResults?: number;
  model?: ChatModel;
};

export type PulseWorkflowCreationResult = {
  workflowId: string;
  scheduleNodeId: string;
  nextRunAt: Date | null;
};

export async function createPulseWorkflow(
  options: PulseWorkflowOptions,
): Promise<PulseWorkflowCreationResult> {
  const {
    userId,
    workflowName,
    description,
    query,
    cron,
    timezone,
    scheduleDescription,
    summaryInstructions,
    numResults,
    model,
  } = options;

  const nextRunAt = computeNextRunDate(cron, timezone);

  const workflow = await workflowRepository.save(
    {
      name: workflowName,
      description: description ?? `Pulse automation for ${query}`,
      userId,
      visibility: "private",
      isPublished: true,
      icon: DEFAULT_ICON,
    },
    true,
  );

  const inputNode = createUINode(NodeKind.Input, {
    id: generateUUID(),
    name: "INPUT",
    position: { x: -180, y: 0 },
  }) as UINode<NodeKind.Input>;
  inputNode.data.outputSchema = {
    ...(structuredClone(defaultObjectJsonSchema) as ObjectJsonSchema7),
    properties: {
      query: {
        type: "string",
        default: query,
        description: "Search topic or request provided by the user",
      },
    },
    required: ["query"],
  };

  const schedulerNode = createUINode(NodeKind.Scheduler, {
    id: generateUUID(),
    name: "SCHEDULER",
    position: { x: -380, y: 200 },
  }) as UINode<NodeKind.Scheduler>;
  schedulerNode.data.cron = cron;
  schedulerNode.data.timezone = timezone;
  schedulerNode.data.enabled = true;
  schedulerNode.data.payload = {
    query,
    description: scheduleDescription ?? "Recurring Pulse schedule",
  };

  const toolNode = createUINode(NodeKind.Tool, {
    id: generateUUID(),
    name: "WEB_SEARCH",
    position: { x: 200, y: 0 },
  }) as UINode<NodeKind.Tool>;
  toolNode.data.model = model ?? DEFAULT_MODEL;
  toolNode.data.tool = {
    type: "app-tool",
    id: DefaultToolName.WebSearch,
    description: exaSearchTool.description!,
    parameterSchema: exaSearchSchema,
  };
  toolNode.data.message = buildDoc([
    paragraph([
      text(
        "Perform a focused web search for the following Pulse request. Return only the most recent, high-signal sources.",
      ),
    ]),
    paragraph([mention(inputNode.id, ["query"])]),
    paragraph([
      text(
        `Limit to ${numResults ?? 6} relevant results and prefer primary reporting or official data sources.`,
      ),
    ]),
  ]);

  const llmNode = createUINode(NodeKind.LLM, {
    id: generateUUID(),
    name: "SUMMARIZE",
    position: { x: 560, y: 0 },
  }) as UINode<NodeKind.LLM>;
  llmNode.data.model = model ?? DEFAULT_MODEL;
  llmNode.data.outputSchema.properties.answer = {
    type: "object",
    properties: {
      hasNewInfo: {
        type: "boolean",
        description:
          "Indicates whether there is meaningful new information to report.",
      },
      answer: {
        type: "string",
        description: "The summary text of the latest findings.",
      },
    },
    required: ["answer"],
  };
  llmNode.data.messages = [
    {
      role: "system",
      content: buildDoc([
        paragraph([
          text(
            summaryInstructions ||
              "You are a monitoring assistant. Produce concise updates that highlight what changed since prior runs, cite notable sources, and suggest any next actions if relevant.",
          ),
        ]),
        paragraph([
          text(
            'IMPORTANT: Respond ONLY with valid JSON in this exact format: {"hasNewInfo": true/false, "answer": "your summary here"}. Set hasNewInfo to true only if there is meaningful new information worth reporting. If the search returned no results, errors, or nothing noteworthy, set hasNewInfo to false and provide a brief explanation in answer.',
          ),
        ]),
      ]),
    },
    {
      role: "user",
      content: buildDoc([
        paragraph([
          text("Summarize the latest findings for "),
          mention(inputNode.id, ["query"]),
          text(". Reference key facts, trends, and actionable insights."),
        ]),
        paragraph([
          text("Fresh research data: "),
          mention(toolNode.id, ["tool_result"]),
        ]),
        paragraph([
          text(
            'Remember to respond with JSON: {"hasNewInfo": boolean, "answer": string}',
          ),
        ]),
      ]),
    },
  ];

  const conditionNode = createUINode(NodeKind.Condition, {
    id: generateUUID(),
    name: "HAS_NEW_INFO",
    position: { x: 900, y: 0 },
  }) as UINode<NodeKind.Condition>;
  conditionNode.data.branches = {
    if: {
      id: "if",
      logicalOperator: "AND",
      type: "if",
      conditions: [
        {
          source: {
            nodeId: llmNode.id,
            path: ["answer", "hasNewInfo"],
          },
          operator: BooleanConditionOperator.IsTrue,
        },
      ],
    } as ConditionBranch,
    else: {
      id: "else",
      logicalOperator: "AND",
      type: "else",
      conditions: [],
    } as ConditionBranch,
  };

  const replyNode = createUINode(NodeKind.ReplyInThread, {
    id: generateUUID(),
    name: "REPLY",
    position: { x: 1240, y: -100 },
  }) as UINode<NodeKind.ReplyInThread>;
  replyNode.data.title = buildDoc([
    paragraph([text("Pulse: "), mention(inputNode.id, ["query"])]),
  ]);
  replyNode.data.messages = [
    {
      role: "assistant",
      content: buildDoc([
        paragraph([
          text("Pulse update for "),
          mention(inputNode.id, ["query"]),
          text(":"),
        ]),
        paragraph([mention(llmNode.id, ["answer", "answer"])]),
      ]),
    },
  ];

  const outputNode = createUINode(NodeKind.Output, {
    id: generateUUID(),
    name: "OUTPUT",
    position: { x: 900, y: 200 },
  }) as UINode<NodeKind.Output>;
  outputNode.data.outputSchema = structuredClone(defaultObjectJsonSchema);
  outputNode.data.outputData = [
    {
      key: "text",
      source: {
        nodeId: llmNode.id,
        path: ["answer", "answer"],
      },
    },
  ];

  const nodes = [
    inputNode,
    toolNode,
    llmNode,
    conditionNode,
    replyNode,
    outputNode,
    schedulerNode,
  ];

  const edges: DBEdge[] = [
    createEdge(workflow.id, inputNode.id, toolNode.id),
    createEdge(workflow.id, toolNode.id, llmNode.id),
    createEdge(workflow.id, llmNode.id, conditionNode.id),
    createEdge(workflow.id, conditionNode.id, replyNode.id, {
      sourceHandle: "if",
    }),
    createEdge(workflow.id, conditionNode.id, outputNode.id, {
      sourceHandle: "else",
    }),
    createEdge(workflow.id, conditionNode.id, outputNode.id, {
      sourceHandle: "if",
    }),
    createEdge(workflow.id, inputNode.id, schedulerNode.id),
  ];

  const dbNodes: DBNode[] = nodes.map((node) => ({
    ...convertUINodeToDBNode(workflow.id, node),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  await workflowRepository.saveStructure({
    workflowId: workflow.id,
    nodes: dbNodes,
    edges,
  });

  return {
    workflowId: workflow.id,
    scheduleNodeId: schedulerNode.id,
    nextRunAt,
  };
}

type ParagraphNode = TipTapMentionJsonContent["content"][number];
type ParagraphLeaf = NonNullable<ParagraphNode["content"]>[number];
type ParagraphContent = ParagraphLeaf[];

function mention(nodeId: string, path: string[]): ParagraphLeaf {
  return {
    type: "mention",
    attrs: {
      id: generateUUID(),
      label: JSON.stringify({ nodeId, path }),
    },
  };
}

function paragraph(content: ParagraphContent): ParagraphNode {
  return {
    type: "paragraph",
    content,
  };
}

function text(value: string): ParagraphLeaf {
  return {
    type: "text",
    text: value,
  };
}

function buildDoc(content: ParagraphNode[]): TipTapMentionJsonContent {
  return {
    type: "doc",
    content,
  };
}

function createEdge(
  workflowId: string,
  source: string,
  target: string,
  uiConfig: DBEdge["uiConfig"] = {},
): DBEdge {
  return {
    id: generateUUID(),
    workflowId,
    source,
    target,
    uiConfig,
    version: "0.1.0",
    createdAt: new Date(),
  } as DBEdge;
}
