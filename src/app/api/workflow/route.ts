import { getSession } from "auth/server";
import { workflowRepository } from "lib/db/repository";

export async function GET() {
  const session = await getSession();
  const workflows = await workflowRepository.selectByUserId(session.user.id);
  return Response.json(workflows);
}

export async function POST(request: Request) {
  const { name, description, icon, id, isPublished, visibility } =
    await request.json();

  const session = await getSession();

  if (id) {
    const hasAccess = await workflowRepository.checkAccess(id, session.user.id);
    if (!hasAccess) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const workflow = await workflowRepository.save({
    name,
    description,
    id,
    isPublished,
    visibility,
    icon,
    userId: session.user.id,
  });

  return Response.json(workflow);
}
