import Workflow from "@/components/workflow/workflow";
import { NodeKind, UINode } from "lib/ai/workflow/interface";
import { generateUINode } from "@/components/workflow/shared";

const initialNodes: UINode[] = [
  generateUINode(NodeKind.Start, {
    name: "START",
  }),
];

const initialEdges = [];

export default function WorkflowPage() {
  return <Workflow initialNodes={initialNodes} initialEdges={initialEdges} />;
}
