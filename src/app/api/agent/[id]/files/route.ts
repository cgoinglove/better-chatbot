import { getSession } from "auth/server";
import { agentRepository } from "lib/db/repository";
import { serverFileStorage } from "lib/file-storage";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;
  const session = await getSession();
  if (!session?.user.id) return new Response("Unauthorized", { status: 401 });

  const agent = await agentRepository.selectAgentById(agentId, session.user.id);
  if (!agent) return new Response("Not Found", { status: 404 });

  // Only the agent owner can upload files
  if (agent.userId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file)
    return Response.json({ message: "No file provided" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await serverFileStorage.upload(buffer, {
    filename: file.name,
    contentType: file.type || "application/octet-stream",
  });

  const agentFile = await agentRepository.insertAgentFile({
    agentId,
    userId: session.user.id,
    storageKey: result.key,
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    size: file.size,
  });

  return Response.json(agentFile, { status: 201 });
}
