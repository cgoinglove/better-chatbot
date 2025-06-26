import { getSession } from "auth/server";
import { workflowRepository } from "lib/db/repository";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  const hasAccess = await workflowRepository.checkAccess(id, session.user.id);
  if (!hasAccess) {
    return new Response("Unauthorized", { status: 401 });
  }
  const workflow = await workflowRepository.selectStructureById(id);
  return Response.json(workflow);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { nodes, edges, deleteNodes, deleteEdges } = await request.json();
  const { id } = await params;
  const session = await getSession();

  const hasAccess = await workflowRepository.checkAccess(
    id,
    session.user.id,
    false,
  );
  if (!hasAccess) {
    return new Response("Unauthorized", { status: 401 });
  }
  await workflowRepository.saveStructure({
    workflowId: id,
    nodes: nodes.map((v) => ({
      ...v,
      workflowId: id,
    })),
    edges: edges.map((v) => ({
      ...v,
      workflowId: id,
    })),
    deleteNodes,
    deleteEdges,
  });

  return Response.json({ success: true });
}
