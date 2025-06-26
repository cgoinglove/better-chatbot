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

  selectStructureById(id: string): Promise<
    | null
    | (DBWorkflow & {
        nodes: DBNode[];
        edges: DBEdge[];
      })
  >;
}
