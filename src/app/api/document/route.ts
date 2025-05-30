import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { artifactKinds, documentHandlersByArtifactKind } from "@/lib/artifacts/server";
import { getDocumentById } from "@/lib/db/queries";
import { DocumentRepository } from "@/lib/db/pg/repositories/document-repository.pg";
import type { Session } from "better-auth";
type BetterAuthSession = { session: Session; user: any };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  const session = await getSession();

  if (!session?.session?.userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [document] = await getDocumentById({ id });

  if (!document) {
    return new Response("Not Found", { status: 404 });
  }

  if (document.userId !== session.session.userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  return Response.json([document], { status: 200 });
}

export async function POST(request: Request) {
  try {
    console.log("Starting document creation...");
    const session = await getSession();
    console.log("Session:", session);
    if (!session?.session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("Request body:", body);
    const { title, kind = 'text' } = body;

    console.log("Title:", title);
    console.log("Kind:", kind);

    if (!artifactKinds.includes(kind as any)) {
      return NextResponse.json(
        { error: `Document kind must be one of: ${artifactKinds.join(', ')}` },
        { status: 400 },
      );
    }

    console.log("documentHandlersByArtifactKind:", documentHandlersByArtifactKind);
    console.log("Artifact kinds:", artifactKinds);
    console.log("Requested kind:", kind);
    const handler = documentHandlersByArtifactKind.find((h) => {
      console.log("Checking handler:", h?.kind, "against:", kind);
      return h?.kind === kind;
    });
    console.log("Found handler:", handler?.kind);

    if (!handler) {
      return NextResponse.json(
        { error: `No document handler found for kind: ${kind}` },
        { status: 400 },
      );
    }

    console.log("Calling onCreateDocument...");
    const document = await handler.onCreateDocument({
      title,
      dataStream: {
        write: async (data: any) => {
          return new Response(JSON.stringify(data));
        },
        writeData: async (data: any) => {
          return new Response(JSON.stringify(data));
        },
        writeMessageAnnotation: async () => {},
        writeSource: async () => {},
        merge: async () => {},
        onError: (error) => error?.toString() || 'Unknown error',
      },
      session: session as BetterAuthSession,
    });
    console.log("Retrieved document:", document);
    return NextResponse.json(document);
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const session = await getSession();
    console.log("Session in PUT /api/document:", session);

    if (!session?.session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [document] = await getDocumentById({ id });
    console.log("Document found:", document);

    if (!document) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (document.userId !== session.session.userId) {
      console.log("User ID mismatch:", {
        docUserId: document.userId,
        sessionUserId: session.session.userId,
      });
      return NextResponse.json(
        { error: "Unauthorized - Wrong user" },
        { status: 401 },
      );
    }

    const { title, content, kind } = await request.json();
    console.log("Update payload:", { title, content, kind });

    const handler = documentHandlersByArtifactKind.find((h) => h.kind === kind);
    console.log("Found handler:", handler?.kind);

    if (!handler) {
      return NextResponse.json(
        { error: `No document handler found for kind: ${kind}` },
        { status: 400 },
      );
    }

    console.log("Calling onUpdateDocument...");
    await handler.onUpdateDocument({
      document,
      description: content,
      session: session as BetterAuthSession,
      dataStream: {
        writeData: async (data: any) => {
          console.log("DataStream write:", data);
        },
        write: async () => {},
        writeMessageAnnotation: async () => {},
        writeSource: async () => {},
        merge: async () => {},
        onError: (error) => error?.toString() || 'Unknown error',
      },
    });

    return NextResponse.json({ id });
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const documentRepository = new DocumentRepository();
    await documentRepository.deleteDocument(id);

    return NextResponse.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 },
    );
  }
}
