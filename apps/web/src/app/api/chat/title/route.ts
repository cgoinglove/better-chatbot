import {
  createUIMessageStreamResponse,
  smoothStream,
  streamText,
  toUIMessageStream,
} from "ai";

import { customModelProvider } from "lib/ai/models";
import { CREATE_THREAD_TITLE_PROMPT } from "lib/ai/prompts";
import { aiTelemetry } from "lib/ai/telemetry";
import globalLogger from "logger";
import { ChatModel } from "app-types/chat";
import { chatRepository } from "lib/db/repository";
import { withAuth } from "auth/route-guard";
import { colorize } from "consola/utils";
import { handleError } from "../shared.chat";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `Title API: `),
});

/** Fixed cheap model for title generation - see the streamText call below. */
const TITLE_MODEL: ChatModel = { provider: "moonshotai", model: "kimi-k2.6" };

export const POST = withAuth(async (request, session) => {
  try {
    const json = await request.json();

    const {
      chatModel,
      message = "hello",
      threadId,
    } = json as {
      chatModel?: ChatModel;
      message: string;
      threadId: string;
    };

    // Block renaming another user's thread. A brand-new thread does not exist
    // yet (upsert inserts it), so only reject when it exists and is owned by
    // someone else.
    const existingThread = await chatRepository.selectThread(threadId);
    if (existingThread && existingThread.userId !== session.user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    logger.info(
      `titleModel: ${TITLE_MODEL.provider}/${TITLE_MODEL.model} (requested: ${chatModel?.provider}/${chatModel?.model}), threadId: ${threadId}`,
    );

    // Titling a <=500 char seed does not need the user's chat model: on a
    // frontier selection that billed Opus/Fable rates for a ~10 token title.
    // `chatModel` stays in the request body for client compatibility, but the
    // server decides. Kimi K2.6 is cheap and more than good enough here.
    const result = streamText({
      model: customModelProvider.getModel(TITLE_MODEL),
      system: CREATE_THREAD_TITLE_PROMPT,
      experimental_telemetry: aiTelemetry("chat.title", {
        threadId,
        provider: chatModel?.provider,
        modelId: chatModel?.model,
      }),
      experimental_transform: smoothStream({ chunking: "word" }),
      prompt: message,
      abortSignal: request.signal,
      onEnd: (ctx) => {
        chatRepository
          .upsertThread({
            id: threadId,
            title: ctx.text,
            userId: session.user.id,
          })
          .catch((err) => logger.error(err));
      },
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    });
  } catch (err) {
    return new Response(handleError(err), { status: 500 });
  }
});
