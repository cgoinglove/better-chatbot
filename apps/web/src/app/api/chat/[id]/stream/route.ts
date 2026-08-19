import "server-only";
import {
  getActiveStream,
  getStreamContext,
} from "@/lib/ai/chat-stream-context";
import { UI_MESSAGE_STREAM_HEADERS } from "ai";
import { chatRepository } from "lib/db/repository";
import { resolveChatSession } from "../../route-helpers";

// Matches DefaultChatTransport's default reconnect URL (GET /api/chat/{id}/stream),
// so `useChat({ resume: true })` needs zero transport config. 204 == nothing to
// resume (no Redis, expired buffer, or already finished).
export const maxDuration = 300;

const NO_STREAM = () => new Response(null, { status: 204 });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const sessionOrResponse = await resolveChatSession(request);
  if (sessionOrResponse instanceof Response) return sessionOrResponse;
  const session = sessionOrResponse;

  const thread = await chatRepository.selectThread(id);
  if (!thread || thread.userId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const ctx = getStreamContext();
  if (!ctx) return NO_STREAM();

  const streamId = await getActiveStream(id);
  if (!streamId) return NO_STREAM();

  // undefined = never existed / expired, null = already done → nothing to send.
  const resumed = await ctx.resumeExistingStream(streamId);
  if (!resumed) return NO_STREAM();

  return new Response(resumed.pipeThrough(new TextEncoderStream()), {
    headers: UI_MESSAGE_STREAM_HEADERS,
  });
}
