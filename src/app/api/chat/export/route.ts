import { ChatExportByThreadIdSchema } from "app-types/chat-export";
import { getSession } from "auth/auth-instance";
import { chatExportRepository, chatRepository } from "lib/db/repository";

export async function POST(req: Request) {
  const { threadId, expiresAt } = await ChatExportByThreadIdSchema.parse(
    await req.json(),
  );
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const isAccess = await chatRepository.checkAccess(threadId, session.user.id);
  if (!isAccess) {
    return new Response("Unauthorized", { status: 401 });
  }

  await chatExportRepository.exportChat({
    threadId,
    exporterId: session.user.id,
    expiresAt: expiresAt ?? undefined,
  });

  return Response.json({
    message: "Chat exported successfully",
  });
}
