import { getSession } from "auth/server";
import {
  UIMessage,
  convertToModelMessages,
  smoothStream,
  streamText,
} from "ai";
import { customModelProvider } from "lib/ai/models";
import globalLogger from "logger";
import { buildUserSystemPrompt } from "lib/ai/prompts";
import { getUserPreferences } from "lib/user/server";
import { getAiRateLimiter } from "lib/ai/rate-limit";
import { buildRateLimitMessage } from "lib/ai/rate-limit-message";

import { colorize } from "consola/utils";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `Temporary Chat API: `),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const session = await getSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const rateLimiter = getAiRateLimiter();
    if (rateLimiter) {
      const rateLimitResult = await rateLimiter.check(
        session.user.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).role,
      );
      if (!rateLimitResult.ok) {
        const message = buildRateLimitMessage(rateLimitResult);
        return new Response(message, {
          status: 429,
          headers: { "Retry-After": `${rateLimitResult.retryAfterSeconds}` },
        });
      }
    }

    const { messages, chatModel, instructions } = json as {
      messages: UIMessage[];
      chatModel?: {
        provider: string;
        model: string;
      };
      instructions?: string;
    };
    logger.info(`model: ${chatModel?.provider}/${chatModel?.model}`);
    const model = customModelProvider.getModel(chatModel);
    const userPreferences =
      (await getUserPreferences(session.user.id)) || undefined;

    return streamText({
      model,
      system: `${buildUserSystemPrompt(session.user, userPreferences)} ${
        instructions ? `\n\n${instructions}` : ""
      }`.trim(),
      messages: convertToModelMessages(messages),
      experimental_transform: smoothStream({ chunking: "word" }),
    }).toUIMessageStreamResponse();
  } catch (error: any) {
    logger.error(error);
    return new Response(error.message || "Oops, an error occured!", {
      status: 500,
    });
  }
}
