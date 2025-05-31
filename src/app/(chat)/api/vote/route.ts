import { auth } from "@/app/(auth)/auth";
import { headers } from "next/headers";
import { getChatById, getVotesByThreadId, voteMessage } from "@/lib/db/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("threadId");

  if (!threadId) {
    return new Response("threadId is required", { status: 400 });
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user || !session.user.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const chat = await getChatById({ id: threadId });

  if (!chat) {
    return new Response("Chat not found", { status: 404 });
  }

  if (chat[0].userId !== session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const votes = await getVotesByThreadId({ id: threadId });

  return Response.json(votes, { status: 200 });
}

export async function PATCH(request: Request) {
  // Ensure content type is application/json
  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return new Response("Content-Type must be application/json", {
      status: 400,
    });
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    console.error("Failed to parse request body:", error);
    return new Response("Invalid JSON in request body", { status: 400 });
  }

  const { threadId, messageId, type } = body as {
    threadId: string;
    messageId: string;
    type: "up" | "down";
  };

  if (!threadId || !messageId || !type) {
    console.error("Missing required fields:", { threadId, messageId, type });
    return new Response("threadId, messageId, and type are required", {
      status: 400,
    });
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user || !session.user.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const chat = await getChatById({ id: threadId });

  if (!chat) {
    return new Response("Chat not found", { status: 404 });
  }

  if (chat[0].userId !== session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  await voteMessage({
    threadId,
    messageId,
    type: type,
  });

  return new Response("Message voted", { status: 200 });
}
