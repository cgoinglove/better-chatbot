import { redirect } from "next/navigation";
import { getSession } from "auth/server";
import { Message, smoothStream, streamText } from "ai";
import { customModelProvider } from "lib/ai/models";
import logger from "logger";
import { buildUserSystemPrompt } from "lib/ai/prompts";
import { userRepository } from "lib/db/repository";

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const session = await getSession();

    if (!session?.user.id) {
      return redirect("/sign-in");
    }

    const { messages, chatModel, instructions } = json as {
      messages: Message[];
      chatModel?: {
        provider: string;
        model: string;
      };
      instructions?: string;
    };
    const model = customModelProvider.getModel(chatModel);
    const userPreferences =
      (await userRepository.getPreferences(session.user.id)) || undefined;

    return streamText({
      model,
      system: `${buildUserSystemPrompt(session.user, userPreferences)} ${
        instructions ? `\n\n${instructions}` : ""
      }`.trim(),
      messages,
      maxSteps: 10,
      experimental_continueSteps: true,
      experimental_transform: smoothStream({ chunking: "word" }),
    }).toDataStreamResponse();
  } catch (error: any) {
    logger.error(error);
    return new Response(error.message || "Oops, an error occured!", {
      status: 500,
    });
  }
}
