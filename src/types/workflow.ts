import { Edge } from "@xyflow/react";
import { NodeKind, UINode, WorkflowNode } from "lib/ai/workflow/interface";

export type WorkflowIcon = {
  type: "emoji";
  value: string;
  style?: Record<string, string>;
};

export type WorkflowDB = {
  id: string;
  icon?: WorkflowIcon;
  readonly version: string;
  name: string;
  description?: string;
  isPublished: boolean;
  visibility: "public" | "private";
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkflowNodeDB<T extends NodeKind = NodeKind> = {
  id: string;
  workflowId: string;
  kind: NodeKind;
  name: string;
  description?: string;
  nodeConfig: Omit<
    Extract<WorkflowNode, { kind: T }>,
    "id" | "name" | "description"
  >;
  uiConfig: {
    position: {
      x: number;
      y: number;
    };
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
};
export type WorkflowEdgeDB = {
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

export interface WorkflowRepository {
  delete(id: string): Promise<void>;
  selectByUserId(userId: string): Promise<WorkflowDB[]>;
  checkAccess(workflowId: string, userId: string): Promise<boolean>;
  save(
    workflow: PartialBy<
      WorkflowDB,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "visibility"
      | "isPublished"
      | "version"
    >,
  ): Promise<WorkflowDB>;
  saveStructure(data: {
    workflowId: string;
    nodes?: UINode[];
    edges?: Edge[];
    deleteNodes?: UINode[];
    deleteEdges?: Edge[];
  }): Promise<void>;

  selectStructureById(id: string): Promise<
    | null
    | (WorkflowDB & {
        nodes: UINode[];
        edges: Edge[];
      })
  >;
}
