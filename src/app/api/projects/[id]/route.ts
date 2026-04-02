import { getSession } from "auth/server";
import { projectRepository } from "lib/db/repository";
import { serverFileStorage } from "lib/file-storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user.id) return new Response("Unauthorized", { status: 401 });

  const project = await projectRepository.selectProjectById(
    id,
    session.user.id,
  );
  if (!project) return new Response("Not Found", { status: 404 });

  const files = await projectRepository.selectProjectFiles(id);
  return Response.json({ ...project, files });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user.id) return new Response("Unauthorized", { status: 401 });

  const data = await request.json();
  const allowedFields = ["name", "description", "instructions"] as const;
  const update: Record<string, string | null> = {};
  for (const field of allowedFields) {
    if (field in data) update[field] = data[field] ?? null;
  }

  const project = await projectRepository.updateProject(
    id,
    session.user.id,
    update,
  );
  if (!project) return new Response("Not Found", { status: 404 });

  return Response.json(project);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user.id) return new Response("Unauthorized", { status: 401 });

  const project = await projectRepository.selectProjectById(
    id,
    session.user.id,
  );
  if (!project) return new Response("Not Found", { status: 404 });

  // Delete files from storage
  const files = await projectRepository.selectProjectFiles(id);
  await Promise.allSettled(
    files.map((f) => serverFileStorage.delete(f.storageKey)),
  );

  await projectRepository.deleteProject(id, session.user.id);
  return new Response(null, { status: 204 });
}
