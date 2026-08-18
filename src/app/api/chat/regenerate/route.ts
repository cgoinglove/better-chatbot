import { getSession } from "auth/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { pgDb } from "lib/db/pg/db.pg";
import { ChatMessageTable, ChatThreadTable } from "lib/db/pg/schema.pg";
import { chatRepository } from "lib/db/repository";

const regenerateSchema = z.object({
  messageId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messageId } = regenerateSchema.parse(await request.json());
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
    .where(eq(ChatMessageTable.id, messageId));

  if (!message) {
    return Response.json({ error: "Message not found" }, { status: 404 });
  }

  if (message.userId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  await chatRepository.deleteMessagesByChatIdAfterTimestamp(messageId);

  return Response.json({ success: true });
}
