import { smoothStream, streamText } from "ai";

import { customModelProvider } from "lib/ai/models";
import { CREATE_THREAD_TITLE_PROMPT } from "lib/ai/prompts";
import globalLogger from "logger";
import { ChatModel } from "app-types/chat";
import { chatRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import { colorize } from "consola/utils";

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
      projectId,
    } = json as {
      chatModel?: ChatModel;
      message: string;
      projectId?: string;
      threadId: string;
    };

    logger.info(
      `chatModel: ${chatModel?.provider}/${chatModel?.model}, threadId: ${threadId}, projectId: ${projectId}`,
    );
    logger.info(`message: ${message}`);

    const session = await getSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const result = streamText({
      model: customModelProvider.getModel(chatModel),
      system: CREATE_THREAD_TITLE_PROMPT,
      experimental_transform: smoothStream({ chunking: "word" }),
      prompt: `Based on this user message, create a concise chat title:

User Message: "${message}"

Generate Title:`,
      maxSteps: 1,
      maxRetries: 1,
      onFinish: (ctx) => {
        chatRepository
          .upsertThread({
            id: threadId,
            title: ctx.text,
            projectId,
            userId: session.user.id,
          })
          .catch((err) => logger.error(err));
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    logger.error(error);
  }
}
