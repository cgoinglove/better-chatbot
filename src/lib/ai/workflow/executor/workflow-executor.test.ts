import { pgWorkflowRepository } from "lib/db/pg/repositories/workflow-repository.pg";
import { test } from "vitest";
import { createWorkflowExecutor } from "./workflow-executor";

test(
  "workflow executor",
  async () => {
    const workflow = await pgWorkflowRepository.selectStructureById(
      "27b27597-7515-4de7-aec6-29f98a205c8e",
    );

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    console.log(workflow);

    const app = createWorkflowExecutor({
      id: workflow.id,
      edges: workflow.edges,
      nodes: workflow.nodes.map((v) => v.data),
    });

    console.log(app.getStructure());

    const result = await app.run({
      input: {
        title: "진격의 거인",
        category: "소설",
      },
    });

    console.dir(result.histories, { depth: null });
  },
  Infinity,
);
