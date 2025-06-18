import { getSession } from "auth/server";
import { workflowRepository } from "lib/db/repository";

export async function POST(request: Request) {
  const { name, description, icon } = await request.json();

  const session = await getSession();

  const workflow = await workflowRepository.save({
    name,
    description,
    icon,
    userId: session.user.id,
    isPublished: false,
    visibility: "private",
  });

  return Response.json(workflow);
}
