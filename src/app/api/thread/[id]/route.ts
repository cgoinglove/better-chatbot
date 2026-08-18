import { getSession } from "auth/server";
import { chatRepository } from "lib/db/repository";
import { z } from "zod";

const updateThreadSchema = z.object({
  title: z.string().trim().max(200).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const thread = await chatRepository.selectThreadDetails(id);

  if (!thread) {
    return Response.json({ error: "Thread not found" }, { status: 404 });
  }

  if (thread.userId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  return Response.json(thread);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const thread = await chatRepository.selectThread(id);

  if (!thread) {
    return Response.json({ error: "Thread not found" }, { status: 404 });
  }

  if (thread.userId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const body = updateThreadSchema.parse(await request.json());
  const updatedThread = await chatRepository.updateThread(id, {
    ...body,
    userId: session.user.id,
  });

  return Response.json(updatedThread);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const thread = await chatRepository.selectThread(id);

  if (!thread) {
    return Response.json({ error: "Thread not found" }, { status: 404 });
  }

  if (thread.userId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  await chatRepository.deleteThread(id);

  return Response.json({ success: true });
}
