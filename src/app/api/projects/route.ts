import { getSession } from "auth/server";
import { projectRepository } from "lib/db/repository";

export async function GET() {
  const session = await getSession();
  if (!session?.user.id) return new Response("Unauthorized", { status: 401 });

  const projects = await projectRepository.selectProjectsByUserId(
    session.user.id,
  );
  return Response.json(projects);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user.id) return new Response("Unauthorized", { status: 401 });

  const { name, description } = await request.json();
  if (!name?.trim())
    return Response.json({ message: "Name is required" }, { status: 400 });

  const project = await projectRepository.insertProject({
    userId: session.user.id,
    name: name.trim(),
    description: description?.trim() ?? null,
    instructions: null,
    memory: null,
  });

  return Response.json(project, { status: 201 });
}
