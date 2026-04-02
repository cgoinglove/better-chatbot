import { getSession } from "auth/server";
import { projectRepository } from "lib/db/repository";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user.id) return new Response("Unauthorized", { status: 401 });

  const { memory } = await request.json();
  if (typeof memory !== "string")
    return Response.json({ message: "Invalid memory" }, { status: 400 });

  await projectRepository.updateProjectMemory(id, session.user.id, memory);
  return Response.json({ id, memory });
}
