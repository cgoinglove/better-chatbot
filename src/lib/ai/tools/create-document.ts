import { generateUUID } from "@/lib/utils";
import { type DataStreamWriter, tool } from "ai";
import { z } from "zod";
import type { Session } from "better-auth";
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from "@/lib/artifacts/server";

interface CreateDocumentProps {
  session: Session;
  dataStream: DataStreamWriter | null;
}

// Helper function to safely write data to the stream
const safeWriteData = (
  dataStream: DataStreamWriter | null,
  type: string,
  content: any
) => {
  if (!dataStream) {
    console.warn(`Skipping writeData for ${type} - dataStream is null`);
    return;
  }
  try {
    dataStream.writeData({ type, content });
  } catch (error) {
    console.error(`Error writing data for ${type}:`, error);
  }
};

export const createDocument = ({ session, dataStream }: CreateDocumentProps) =>
  tool({
    description:
      "Create a document for a writing or content creation activities. This tool will call other functions that will generate the contents of the document based on the title and kind.",
    parameters: z.object({
      title: z.string(),
      kind: z.enum(artifactKinds),
    }),
    execute: async ({ title, kind }) => {
      const id = generateUUID();

      // Safely write document metadata to the stream
      safeWriteData(dataStream, "kind", kind);
      safeWriteData(dataStream, "id", id);
      safeWriteData(dataStream, "title", title);
      safeWriteData(dataStream, "clear", "");

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === kind,
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${kind}`);
      }

      try {
        await documentHandler.onCreateDocument({
          id,
          title,
          dataStream: dataStream as DataStreamWriter,
          session,
        });
        
        safeWriteData(dataStream, "finish", "");
      } catch (error) {
        console.error("Error in document handler:", error);
        safeWriteData(dataStream, "error", "Failed to create document");
        throw error;
      }

      return {
        id,
        title,
        kind,
        content: "A document was created and is now visible to the user.",
      };
    },
  });
