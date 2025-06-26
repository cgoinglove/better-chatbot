import {
  convertDBEdgeToUIEdge,
  convertDBNodeToUINode,
} from "lib/ai/workflow/shared.workflow";
import Workflow from "@/components/workflow/workflow";
import { getSession } from "auth/server";
import { workflowRepository } from "lib/db/repository";
import { notFound } from "next/navigation";

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
  if (!workflow) {
    return notFound();
  }
  const hasEditAccess = await workflowRepository.checkAccess(
    id,
    session.user.id,
    false,
  );
  const initialNodes = workflow.nodes.map(convertDBNodeToUINode);
  const initialEdges = workflow.edges.map(convertDBEdgeToUIEdge);
  return (
    <Workflow
      key={id}
      workflowId={id}
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      hasEditAccess={hasEditAccess}
    />
  );
}
