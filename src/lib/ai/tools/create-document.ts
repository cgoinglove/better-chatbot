import { type DataStreamWriter, tool } from "ai";
import { z } from "zod";
import type { Session } from "better-auth";
type BetterAuthSession = { session: Session; user: any };
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from "@/lib/artifacts/server";

interface CreateDocumentProps {
  session: BetterAuthSession;
  dataStream: DataStreamWriter;
}

export const createDocument = ({ session, dataStream }: CreateDocumentProps) =>
  tool({
    description:
      "Create a document for a writing or content creation activities. This tool will call other functions that will generate the contents of the document based on the title and kind.",
    parameters: z.object({
      title: z.string(),
      kind: z.enum(artifactKinds),
    }),
    execute: async ({ title, kind }) => {
      dataStream.writeData({
        type: 'kind',
        content: kind,
      });

      dataStream.writeData({
        type: 'title',
        content: title,
      });

      dataStream.writeData({
        type: 'clear',
        content: '',
      });

      const documentHandler = documentHandlersByArtifactKind.find(h => h.kind === kind);

      if (!documentHandler) {
        throw new Error(`Invalid document kind: ${kind}. Must be one of: ${artifactKinds.join(', ')}`);
      }

      try {
        const result = await documentHandler.onCreateDocument({
          title,
          kind,
          dataStream,
          session,
        });
        
        dataStream.writeData({ type: 'finish', content: '' });

        const documentId = typeof result === 'string' ? undefined : result.id;
        
        return {
          title,
          kind,
          content: "A document was created and is now visible to the user.",
          id: documentId,
        };
      } catch (error) {
        console.error("Error in document handler:", error);
        dataStream.writeData({ type: 'error', content: 'Failed to create document' });
        throw error;
      }
    },
  });
