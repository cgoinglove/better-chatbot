import { getSession } from "auth/server";
import { projectRepository } from "lib/db/repository";
import { serverFileStorage } from "lib/file-storage";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const { id: projectId, fileId } = await params;
  const session = await getSession();
  if (!session?.user.id) return new Response("Unauthorized", { status: 401 });

  const project = await projectRepository.selectProjectById(
    projectId,
    session.user.id,
  );
  if (!project) return new Response("Not Found", { status: 404 });

  const file = await projectRepository.selectProjectFileById(
    fileId,
    projectId,
    session.user.id,
  );
  if (!file) return new Response("Not Found", { status: 404 });

  await serverFileStorage.delete(file.storageKey);
  await projectRepository.deleteProjectFile(fileId, projectId, session.user.id);

  return new Response(null, { status: 204 });
}
