import { convertToCoreMessages, smoothStream, streamText } from "ai";
import { selectThreadWithMessagesAction } from "../actions";
import { myProvider } from "lib/ai/models";
import { SUMMARIZE_PROMPT } from "lib/ai/prompts";
import logger from "logger";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { threadId, model: modelName } = json as {
      threadId: string;
      model: string;
    };

    const thread = await selectThreadWithMessagesAction(threadId);

    if (!thread) {
      return new Response("Thread not found", { status: 404 });
    }

    const messages = convertToCoreMessages(
      thread.messages
        .map((v) => ({
          content: "",
          role: v.role,
          parts: v.parts,
        }))
        .concat({
          content: "",
          parts: [
            {
              type: "text",
              text: "Generate a system prompt based on the conversation so far according to the rules.",
            },
          ],
          role: "user",
        }),
    );

    const result = streamText({
      model: myProvider.getModel(modelName),
      system: SUMMARIZE_PROMPT,
      experimental_transform: smoothStream({ chunking: "word" }),
      messages,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    logger.error(error);
  }
}
