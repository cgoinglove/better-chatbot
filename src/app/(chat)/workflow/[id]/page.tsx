import { generateUINode } from "@/components/workflow/shared";
import Workflow from "@/components/workflow/workflow";
import { getSession } from "auth/server";
import { NodeKind, UINode } from "lib/ai/workflow/interface";
import { workflowRepository } from "lib/db/repository";

const defaultNodes: UINode[] = [
  generateUINode(NodeKind.Start, {
    name: "START",
  }),
];

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const hasAccess = await workflowRepository.checkAccess(id, session.user.id);
  if (!hasAccess) {
    return new Response("Unauthorized", { status: 401 });
  }
  const workflow = await workflowRepository.selectStructureById(id);

  const initialNodes = workflow?.nodes ?? defaultNodes;
  const initialEdges = workflow?.edges ?? [];
  return (
    <Workflow
      key={id}
      workflowId={id}
      initialNodes={initialNodes}
      initialEdges={initialEdges}
    />
  );
}
