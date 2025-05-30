import { codeDocumentHandler } from "@/artifacts/code/server";
import { imageDocumentHandler } from "@/artifacts/image/server";
import { sheetDocumentHandler } from "@/artifacts/sheet/server";
import { textDocumentHandler } from "@/artifacts/text/server";
import type { ArtifactKind } from "@/components/artifact";
import type { DataStreamWriter } from "ai";
import type { Document } from "../db/pg/schema.pg";
import { saveDocument } from "../db/queries";
import type { Session } from "better-auth";
type BetterAuthSession = { session: Session; user: any };

export interface SaveDocumentProps {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}

export interface CreateDocumentCallbackProps {
  id?: string;
  title: string;
  kind?: ArtifactKind;
  dataStream: DataStreamWriter;
  session: BetterAuthSession;
}

export interface UpdateDocumentCallbackProps {
  document: Document;
  description: string;
  dataStream: DataStreamWriter;
  session: BetterAuthSession;
}

export interface DocumentHandler<T = ArtifactKind> {
  kind: T;
  onCreateDocument: (args: CreateDocumentCallbackProps) => Promise<string | Document>;
  onUpdateDocument: (args: UpdateDocumentCallbackProps) => Promise<string>;
}

export function createDocumentHandler<T extends ArtifactKind>(config: {
  kind: T;
  onCreateDocument: (params: CreateDocumentCallbackProps) => Promise<string>;
  onUpdateDocument: (params: UpdateDocumentCallbackProps) => Promise<string>;
}): DocumentHandler<T> {
  return {
    kind: config.kind,
    onCreateDocument: async (args: CreateDocumentCallbackProps) => {
      console.log('Starting onCreateDocument...');
      console.log('Session:', args.session);
      const draftContent = await config.onCreateDocument({
        id: args.id,
        title: args.title,
        dataStream: args.dataStream,
        session: args.session,
      });

      if (args.session?.session?.userId) {
        const [doc] = await saveDocument({
          id: args.id,
          title: args.title,
          content: draftContent,
          kind: args.kind || config.kind,
          userId: args.session.session.userId,
        });
        args.dataStream.writeData({
          type: 'id',
          content: doc.id,
        });
        return doc;
      }

      return draftContent;
    },
    onUpdateDocument: async (args: UpdateDocumentCallbackProps) => {
      console.log('Starting onUpdateDocument...');
      console.log('Session:', args.session);
      const draftContent = await config.onUpdateDocument({
        document: args.document,
        description: args.description,
        dataStream: args.dataStream,
        session: args.session,
      });

      console.log('Got draft content:', draftContent);
      if (args.session?.session?.userId) {
        console.log('Saving document with userId:', args.session.session.userId);
        await saveDocument({
          id: args.document.id,
          title: args.document.title,
          content: draftContent,
          kind: config.kind,
          userId: args.session.session.userId,
        });
      }

      return draftContent;
    },
  };
}

/*
 * Use this array to define the document handlers for each artifact kind.
 */
export const documentHandlersByArtifactKind: Array<DocumentHandler> = [
  textDocumentHandler,
  codeDocumentHandler,
  imageDocumentHandler,
  sheetDocumentHandler
];

export const artifactKinds = ["text", "code", "image", "sheet"] as const;
