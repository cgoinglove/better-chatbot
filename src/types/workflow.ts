import { Tool } from "ai";
import { ObjectJsonSchema7 } from "./util";
import { NodeKind } from "lib/ai/workflow/workflow.interface";

export type WorkflowIcon = {
  type: "emoji";
  value: string;
  style?: Record<string, string>;
};

export type DBWorkflow = {
  id: string;
  icon?: WorkflowIcon;
  readonly version: string;
  name: string;
  description?: string;
  isPublished: boolean;
  visibility: "public" | "private" | "readonly";
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type DBNode = {
  id: string;
  workflowId: string;
  kind: string;
  name: string;
  description?: string;
  nodeConfig: Record<string, any>;
  uiConfig: {
    position?: {
      x: number;
      y: number;
    };
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
};
export type DBEdge = {
  id: string;
  workflowId: string;
  source: string;
  target: string;
  uiConfig: {
    sourceHandle?: string;
    targetHandle?: string;
    [key: string]: any;
  };
  createdAt: Date;
};

export type WorkflowSummary = {
  id: string;
  name: string;
  description?: string;
  icon?: WorkflowIcon;
  visibility: "public" | "private" | "readonly";
  isPublished: boolean;
  userName: string;
  userAvatar?: string;
  updatedAt: Date;
};
export interface WorkflowRepository {
  delete(id: string): Promise<void>;
  selectByUserId(userId: string): Promise<DBWorkflow[]>;
  selectAll(userId: string): Promise<WorkflowSummary[]>;
  selectExecuteAbility(userId: string): Promise<WorkflowSummary[]>;
  selectToolByIds(ids: string[]): Promise<
    {
      id: string;
      name: string;
      description?: string;
      schema: ObjectJsonSchema7;
    }[]
  >;
  checkAccess(
    workflowId: string,
    userId: string,
    readOnly?: boolean,
  ): Promise<boolean>;
  selectById(id: string): Promise<DBWorkflow | null>;
  save(
    workflow: PartialBy<
      DBWorkflow,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "visibility"
      | "isPublished"
      | "version"
    >,
    noGenerateInputNode?: boolean,
  ): Promise<DBWorkflow>;
  saveStructure(data: {
    workflowId: string;
    nodes?: DBNode[];
    edges?: DBEdge[];
    deleteNodes?: string[]; // node id
    deleteEdges?: string[]; // edge id
  }): Promise<void>;

  selectStructureById(
    id: string,
    option?: {
      ignoreNote?: boolean;
    },
  ): Promise<
    | null
    | (DBWorkflow & {
        nodes: DBNode[];
        edges: DBEdge[];
      })
  >;
}

export type VercelAIWorkflowTool = Tool & {
  __$ref__: "workflow";
  _workflowId: string;
  _toolName: string;
  _originToolName: string;
};

export type VercelAIWorkflowToolStreaming = {
  name: string;
  startedAt: number;
  kind: NodeKind;
  endedAt?: number;
  id: string;
  status: "running" | "success" | "fail";
  error?: { name: string; message: string };
  result?: { input?: any; output?: any };
};

export type VercelAIWorkflowToolStreamingResult = {
  toolCallId: string;
  workflowName: string;
  workflowIcon?: WorkflowIcon;
  __$ref__: "workflow";
  startedAt: number;
  endedAt: number;
  history: VercelAIWorkflowToolStreaming[];
  error?: { name: string; message: string };
  result?: any;
  status: "running" | "success" | "fail";
};

export function isVercelAIWorkflowTool(
  value?: any,
): value is VercelAIWorkflowToolStreamingResult {
  if (!value || typeof value !== "object") return false;
  return (
    value.__$ref__ === "workflow" && value.toolCallId && value.workflowName
  );
}
