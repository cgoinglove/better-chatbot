import { getSession } from "auth/server";
import { chatRepository } from "lib/db/repository";
import { pgDb as db } from "lib/db/pg/db.pg";
import { ChatThreadTable } from "lib/db/pg/schema.pg";
import { and, eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: threadId } = await params;
  const session = await getSession();
  if (!session?.user.id) return new Response("Unauthorized", { status: 401 });

  const thread = await chatRepository.selectThread(threadId);
  if (!thread || thread.userId !== session.user.id)
    return new Response("Not Found", { status: 404 });

  const { projectId } = await request.json();

  await db
    .update(ChatThreadTable)
    .set({ projectId: projectId ?? null })
    .where(
      and(
        eq(ChatThreadTable.id, threadId),
        eq(ChatThreadTable.userId, session.user.id),
      ),
    );

  return Response.json({ threadId, projectId: projectId ?? null });
}
