import { getSession } from "auth/server";
import { mcpRepository } from "lib/db/repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;

  const hasAccess = await mcpRepository.checkAccess(id, session.user.id);
  if (!hasAccess) return new Response("Unauthorized", { status: 401 });

  const server = await mcpRepository.selectById(id);
  return Response.json(server);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;

  const hasAccess = await mcpRepository.checkAccess(id, session.user.id, true);
  if (!hasAccess) return new Response("Unauthorized", { status: 401 });

  const body = (await request.json()) as {
    visibility?: "private" | "public" | "readonly";
  };

  if (body.visibility) {
    await mcpRepository.updateVisibility(id, body.visibility);
  }
  const server = await mcpRepository.selectById(id);
  return Response.json(server);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;

  const hasAccess = await mcpRepository.checkAccess(id, session.user.id, true);
  if (!hasAccess) return new Response("Unauthorized", { status: 401 });

  await mcpRepository.deleteById(id);
  return Response.json({ success: true });
}
