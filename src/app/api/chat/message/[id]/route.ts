import { getSession } from "auth/server";
import { eq } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { ChatMessageTable, ChatThreadTable } from "lib/db/pg/schema.pg";
import { chatRepository } from "lib/db/repository";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const [message] = await pgDb
    .select({
      id: ChatMessageTable.id,
      userId: ChatThreadTable.userId,
    })
    .from(ChatMessageTable)
    .innerJoin(
      ChatThreadTable,
      eq(ChatMessageTable.threadId, ChatThreadTable.id),
    )
    .where(eq(ChatMessageTable.id, id));

  if (!message) {
    return Response.json({ error: "Message not found" }, { status: 404 });
  }

  if (message.userId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  await chatRepository.deleteChatMessage(id);

  return Response.json({ success: true });
}
