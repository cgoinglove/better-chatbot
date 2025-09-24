import { getSession } from "auth/server";
import { workflowRepository } from "lib/db/repository";
import { canCreateWorkflow, canEditWorkflow } from "lib/auth/permissions";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json([]);
  }
  const workflows = await workflowRepository.selectAll(session.user.id);
  return Response.json(workflows);
}

export async function POST(request: Request) {
  const {
    name,
    description,
    icon,
    id,
    isPublished,
    visibility,
    noGenerateInputNode,
  } = await request.json();

  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Check if user has permission to create/edit workflows
  if (id) {
    // Editing existing workflow
    const canEdit = await canEditWorkflow();
    if (!canEdit) {
      return Response.json(
        { error: "You don't have permission to edit workflows" },
        { status: 403 },
      );
    }
    const hasAccess = await workflowRepository.checkAccess(
      id,
      session.user.id,
      false,
    );
    if (!hasAccess) {
      return new Response("Unauthorized", { status: 401 });
    }
  } else {
    // Creating new workflow
    const canCreate = await canCreateWorkflow();
    if (!canCreate) {
      return Response.json(
        { error: "You don't have permission to create workflows" },
        { status: 403 },
      );
    }
  }

  const workflow = await workflowRepository.save(
    {
      name,
      description,
      id,
      isPublished,
      visibility,
      icon,
      userId: session.user.id,
    },
    noGenerateInputNode,
  );

  return Response.json(workflow);
}
