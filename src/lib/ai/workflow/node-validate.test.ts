import { describe, it, expect } from "vitest";
import { Edge } from "@xyflow/react";
import {
  validateSchema,
  allNodeValidate,
  startNodeValidate,
  endNodeValidate,
  llmNodeValidate,
} from "./node-validate";
import { UINode, NodeKind } from "./interface";

describe("node-validate", () => {
  const createStartNode = (
    id: string,
    name: string,
    outputSchema = {
      type: "object" as const,
      properties: { input: { type: "string" as const } },
    },
  ): UINode<NodeKind.Start> => ({
    id,
    type: "default",
    position: { x: 0, y: 0 },
    data: {
      id,
      name,
      kind: NodeKind.Start,
      outputSchema,
    },
  });

  const createEndNode = (
    id: string,
    name: string,
    outputData: any[] = [],
  ): UINode<NodeKind.End> => ({
    id,
    type: "default",
    position: { x: 0, y: 0 },
    data: {
      id,
      name,
      kind: NodeKind.End,
      outputSchema: { type: "object", properties: {} },
      outputData,
    },
  });

  const createLLMNode = (
    id: string,
    name: string,
    model: any = { id: "gpt-4", name: "GPT-4" },
    messages: any[] = [{ role: "user", content: { type: "doc", content: [] } }],
  ): UINode<NodeKind.LLM> => ({
    id,
    type: "default",
    position: { x: 0, y: 0 },
    data: {
      id,
      name,
      kind: NodeKind.LLM,
      outputSchema: { type: "object", properties: {} },
      model,
      messages,
    },
  });

  const createEdge = (id: string, source: string, target: string): Edge => ({
    id,
    source,
    target,
  });

  describe("validateSchema", () => {
    it("should validate valid string schema", () => {
      expect(() => {
        validateSchema("test", { type: "string" });
      }).not.toThrow();
    });

    it("should throw error for invalid variable name", () => {
      expect(() => {
        validateSchema("", { type: "string" });
      }).toThrow();
    });

    it("should throw error for schema without type", () => {
      expect(() => {
        validateSchema("test", {});
      }).toThrow();
    });
  });

  describe("startNodeValidate", () => {
    it("should validate start node with edge and inputs", () => {
      const startNode = createStartNode("start", "Start Node");
      const edges = [createEdge("edge1", "start", "end")];

      expect(() => {
        startNodeValidate({ node: startNode.data, nodes: [], edges });
      }).not.toThrow();
    });

    it("should throw error when start node has no edge", () => {
      const startNode = createStartNode("start", "Start Node");

      expect(() => {
        startNodeValidate({ node: startNode.data, nodes: [], edges: [] });
      }).toThrow();
    });

    it("should throw error when start node has no inputs", () => {
      const startNode = createStartNode("start", "Start Node", {
        type: "object" as const,
        properties: {},
      } as any);
      const edges = [createEdge("edge1", "start", "end")];

      expect(() => {
        startNodeValidate({ node: startNode.data, nodes: [], edges });
      }).toThrow();
    });
  });

  describe("endNodeValidate", () => {
    it("should validate end node with proper source", () => {
      const startNode = createStartNode("start", "Start Node");
      const endNode = createEndNode("end", "End Node", [
        {
          key: "result",
          source: { nodeId: "start", path: ["input"] },
        },
      ]);
      const nodes = [startNode, endNode];
      const edges = [createEdge("edge1", "start", "end")];

      expect(() => {
        endNodeValidate({ node: endNode.data, nodes, edges });
      }).not.toThrow();
    });

    it("should throw error when end node has duplicate output keys", () => {
      const endNode = createEndNode("end", "End Node", [
        { key: "result", source: { nodeId: "start", path: ["input"] } },
        { key: "result", source: { nodeId: "start", path: ["input"] } },
      ]);

      expect(() => {
        endNodeValidate({ node: endNode.data, nodes: [], edges: [] });
      }).toThrow();
    });
  });

  describe("llmNodeValidate", () => {
    it("should validate LLM node with model and messages", () => {
      const llmNode = createLLMNode("llm", "LLM Node");

      expect(() => {
        llmNodeValidate({ node: llmNode.data, nodes: [], edges: [] });
      }).not.toThrow();
    });

    it("should throw error when LLM node has no model", () => {
      const llmNode = createLLMNode("llm", "LLM Node", null);

      expect(() => {
        llmNodeValidate({ node: llmNode.data, nodes: [], edges: [] });
      }).toThrow();
    });

    it("should throw error when LLM node has no messages", () => {
      const llmNode = createLLMNode(
        "llm",
        "LLM Node",
        { id: "gpt-4", name: "GPT-4" },
        [],
      );

      expect(() => {
        llmNodeValidate({ node: llmNode.data, nodes: [], edges: [] });
      }).toThrow();
    });
  });

  describe("allNodeValidate", () => {
    it("should validate workflow with start and end nodes", () => {
      const startNode = createStartNode("start", "Start Node");
      const endNode = createEndNode("end", "End Node", [
        {
          key: "result",
          source: { nodeId: "start", path: ["input"] },
        },
      ]);
      const nodes = [startNode, endNode];
      const edges = [createEdge("edge1", "start", "end")];

      const result = allNodeValidate({ nodes, edges });
      expect(result).toBe(true);
    });

    it("should return error when nodes have duplicate names", () => {
      const startNode1 = createStartNode("start1", "Duplicate Name");
      const startNode2 = createEndNode("start1", "Duplicate Name");
      const nodes = [startNode1, startNode2];
      const edges = [];

      const result = allNodeValidate({ nodes, edges });
      expect(result).not.toBe(true);
      expect(result).toHaveProperty("errorMessage");
    });
  });
});
