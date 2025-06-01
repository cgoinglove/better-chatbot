import { z } from "zod";
import type { Session } from "better-auth";
import { type DataStreamWriter, streamObject, tool } from "ai";
import { getDocumentById, saveSuggestions } from "@/lib/db/queries";
import { generateUUID } from "@/lib/utils";
import { myProvider } from "../models";
import type { InferSelectModel } from "drizzle-orm";
import { SuggestionSchema } from "@/lib/db/pg/schema.pg";

type Suggestion = InferSelectModel<typeof SuggestionSchema>;

type BetterAuthSession = { session: Session; user: any };

interface RequestSuggestionsProps {
  session: BetterAuthSession;
  dataStream: DataStreamWriter;
}

export const requestSuggestions = ({
  session,
  dataStream,
}: RequestSuggestionsProps) =>
  tool({
    description: "Request suggestions for a document",
    parameters: z.object({
      documentId: z
        .string()
        .describe("The ID of the document to request edits"),
    }),
    execute: async ({ documentId }) => {
      const document = await getDocumentById({ id: documentId });

      if (!document || !document.length) {
        throw new Error("Document not found");
      }

      const doc = document[0];
      if (!doc || !doc.content) {
        throw new Error("Document content not found");
      }

      const suggestions: Array<Suggestion> = [];

      const { elementStream } = streamObject<{
        originalSentence: string;
        suggestedSentence: string;
        description: string;
      }>({
        model: myProvider.getModel("artifact-model"),
        system:
          "You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.",
        prompt: doc.content,
        output: "array",
        schema: z.object({
          originalSentence: z.string().describe("The original sentence"),
          suggestedSentence: z.string().describe("The suggested sentence"),
          description: z.string().describe("The description of the suggestion"),
        }),
      });

      for await (const element of elementStream) {
        const suggestion = {
          id: generateUUID(),
          documentId,
          documentCreatedAt: doc.createdAt,
          originalText: element.originalSentence,
          suggestedText: element.suggestedSentence,
          description: element.description ?? null,
          isResolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: session.user?.id ?? "", // Provide userId if available, else empty string
        } as Suggestion;

        // Send individual suggestion
        dataStream.writeData({
          type: "suggestion",
          content: {
            ...suggestion,
            createdAt: suggestion.createdAt.toISOString(),
            updatedAt: suggestion.updatedAt.toISOString(),
            documentCreatedAt: suggestion.documentCreatedAt.toISOString(),
          },
        });

        suggestions.push(suggestion);
      }

      if (session.user?.id) {
        await saveSuggestions({
          suggestions: suggestions.map((suggestion) => ({
            ...suggestion,
            userId: session.user.id,
          })),
        });

        // Send final summary
        dataStream.writeData({
          type: "suggestions",
          content: {
            title: doc.title,
            kind: doc.kind,
            suggestions: suggestions.map((s) => ({
              ...s,
              createdAt: s.createdAt.toISOString(),
              updatedAt: s.updatedAt.toISOString(),
              documentCreatedAt: s.documentCreatedAt.toISOString(),
            })),
          },
        });
      }

      return {
        id: documentId,
        title: doc.title,
        kind: doc.kind,
        message: "Suggestions have been added to the document",
      };
    },
  });
