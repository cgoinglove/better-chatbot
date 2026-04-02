import { getSession } from "auth/server";
import { agentRepository } from "lib/db/repository";
import { serverFileStorage } from "lib/file-storage";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const { id: agentId, fileId } = await params;
  const session = await getSession();
  if (!session?.user.id) return new Response("Unauthorized", { status: 401 });

  const agent = await agentRepository.selectAgentById(agentId, session.user.id);
  if (!agent) return new Response("Not Found", { status: 404 });

  if (agent.userId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const file = await agentRepository.selectAgentFileById(
    fileId,
    agentId,
    session.user.id,
  );
  if (!file) return new Response("Not Found", { status: 404 });

  await agentRepository.deleteAgentFile(fileId, agentId, session.user.id);
  await serverFileStorage.delete(file.storageKey);

  return new Response(null, { status: 204 });
}
