import { generateInitialNode } from "@/components/workflow/helper";
import Workflow from "@/components/workflow/workflow";
import { NodeKind, UINode } from "lib/ai/workflow/interface";

const initialNodes: UINode[] = [
  generateInitialNode(NodeKind.Start, {
    data: {
      name: "START",
    },
  }),
];

const initialEdges = [];

export default function WorkflowPage() {
  return <Workflow initialNodes={initialNodes} initialEdges={initialEdges} />;
}
