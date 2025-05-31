import { z } from "zod";
import { streamObject } from "ai";
import { myProvider } from "@/lib/ai/models";
import { codePrompt, updateDocumentPrompt } from "@/lib/ai/prompts";
import { createDocumentHandler } from "@/lib/artifacts/server";

// Improved code document handler with better streaming support
export const codeDocumentHandler = createDocumentHandler<"code">({
  kind: "code",
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = "";

    // Make artifact visible immediately
    dataStream.writeData({
      type: "kind",
      content: "code",
    });

    // Set a loading message while generating code
    dataStream.writeData({
      type: "code-delta",
      content: "// Generating code based on: " + title + "\n// Please wait...",
    });

    const { fullStream } = streamObject({
      model: myProvider.getModel("artifact-model"),
      system: codePrompt,
      prompt: title,
      schema: z.object({
        code: z.string(),
      }),
    });

    // Clear the loading message before streaming actual content
    dataStream.writeData({
      type: "clear",
      content: "",
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;
        const { code } = object;

        if (code) {
          // Format code to ensure proper display
          const formattedCode = code.trim();

          dataStream.writeData({
            type: "code-delta",
            content: formattedCode,
          });

          draftContent = formattedCode;
        }
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = "";

    const { fullStream } = streamObject({
      model: myProvider.getModel("artifact-model"),
      system: updateDocumentPrompt(document.content, "code"),
      prompt: description,
      schema: z.object({
        code: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;
        const { code } = object;

        if (code) {
          dataStream.writeData({
            type: "code-delta",
            content: code ?? "",
          });

          draftContent = code;
        }
      }
    }

    return draftContent;
  },
});
