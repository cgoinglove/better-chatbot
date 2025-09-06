import { chatRepository } from "lib/db/repository";
import { NextRequest, NextResponse } from "next/server";
import { generateTitleFromUserMessageAction } from "../actions";
import { myProvider } from "lib/ai/models";
import { getSession } from "auth/server";
import { revalidatePath } from "next/cache";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { threadId } = await params;
  const { messages, projectId } = await request.json();

  let thread = await chatRepository.selectThread(threadId);
  if (!thread) {
    const title = await generateTitleFromUserMessageAction({
      message: messages[0],
      model: myProvider.getModel("chat-model-small"),
    });
    thread = await chatRepository.insertThread({
      id: threadId,
      projectId: projectId ?? null,
      title,
      userId: session.user.id,
      visibility: "private",
    });
  }
  await chatRepository.insertMessages(
    messages.map((message) => ({
      ...message,
      threadId: thread.id,
      createdAt: message.createdAt ? new Date(message.createdAt) : undefined,
    })),
  );
  return new Response(
    JSON.stringify({
      success: true,
    }),
    {
      status: 200,
    },
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { threadId } = await params;

    if (!threadId) {
      return new NextResponse("Thread ID is required", { status: 400 });
    }

    const { messageId, content, role } = await request.json();

    if (!messageId || !content) {
      return new NextResponse(
        "Missing required fields: messageId and content are required",
        { status: 400 },
      );
    }

    // Get all messages in the thread and find the one to update
    const messages = await chatRepository.selectMessagesByThreadId(threadId);
    const message = messages.find((m) => m.id === messageId);

    if (!message) {
      return new NextResponse("Message not found in the specified thread", {
        status: 404,
      });
    }

    // Update the message
    const updatedMessage = {
      ...message,
      content,
      role: role || message.role,
      parts: [{ type: "text" as const, text: content }],
    };

    await chatRepository.upsertMessage(updatedMessage);

    // Revalidate the chat page
    revalidatePath(`/chat/${threadId}`);

    return NextResponse.json({
      success: true,
      message: "Message updated successfully",
    });
  } catch (error) {
    console.error("Error updating message:", error);
    if (error instanceof Error) {
      return new NextResponse(`Internal Server Error: ${error.message}`, {
        status: 500,
      });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
