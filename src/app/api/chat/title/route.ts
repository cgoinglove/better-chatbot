import { createDataStreamResponse, smoothStream, streamText } from "ai";

import { customModelProvider } from "lib/ai/models";
import { CREATE_THREAD_TITLE_PROMPT } from "lib/ai/prompts";
import globalLogger from "logger";
import { ChatModel } from "app-types/chat";
import { chatRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import { colorize } from "consola/utils";
import { handleError } from "../shared.chat";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `Title API: `),
});

export async function POST(request: Request) {
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

    const session = await getSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    logger.info(
      `chatModel: ${chatModel?.provider}/${chatModel?.model}, threadId: ${threadId}`,
    );

    return createDataStreamResponse({
      execute(dataStream) {
        const result = streamText({
          model: customModelProvider.getModel(chatModel),
          system: CREATE_THREAD_TITLE_PROMPT,
          experimental_transform: smoothStream({ chunking: "word" }),
          prompt: message,
          abortSignal: request.signal,
          onFinish: (ctx) => {
            logger.debug(`onFinish`, ctx.text);
            chatRepository
              .upsertThread({
                id: threadId,
                title: ctx.text,
                userId: session.user.id,
              })
              .catch((err) => logger.error(err));
          },
        });
        result.consumeStream();
        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
        result.usage.then((useage) => {
          logger.debug(
            `usage input: ${useage.promptTokens}, usage output: ${useage.completionTokens}, usage total: ${useage.totalTokens}`,
          );
        });
      },
      onError: handleError,
    });
  } catch (error) {
    logger.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
