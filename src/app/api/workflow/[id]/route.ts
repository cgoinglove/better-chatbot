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
  const { nodes, edges } = await request.json();
  const { id } = await params;
  const session = await getSession();

  const hasAccess = await workflowRepository.checkAccess(id, session.user.id);
  if (!hasAccess) {
    return new Response("Unauthorized", { status: 401 });
  }

  await workflowRepository.saveStructure({
    workflowId: id,
    nodes,
    edges,
  });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  const hasAccess = await workflowRepository.checkAccess(id, session.user.id);
  if (!hasAccess) {
    return new Response("Unauthorized", { status: 401 });
  }
  await workflowRepository.delete(id);
  return Response.json({ message: "Workflow deleted" });
}
