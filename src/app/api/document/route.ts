import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/auth/server';
import { getDocumentById } from '@/lib/db/queries';
import { documentHandlersByArtifactKind } from '@/lib/artifacts/server';
import type { DataStreamWriter } from 'ai';
import type { Session } from 'better-auth';
type BetterAuthSession = { session: Session; user: any };

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const session = await getSession();
    console.log('Session in GET /api/document:', session);

    if (!session?.session?.userId) {
      return NextResponse.json({ error: 'Unauthorized - No session' }, { status: 401 });
    }

    const [document] = await getDocumentById({ id });
    console.log('Document found:', document);

    if (!document) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (document.userId !== session.session.userId) {
      console.log('User ID mismatch:', { docUserId: document.userId, sessionUserId: session.session.userId });
      return NextResponse.json({ error: 'Unauthorized - Wrong user' }, { status: 401 });
    }

    return NextResponse.json([document]);
  } catch (error) {
    console.error('Error getting document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    console.log('Starting document creation...');
    const session = await getSession();
    console.log('Session:', session);
    if (!session?.session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Request body:', body);
    const { title, kind } = body;
    
    console.log('Title:', title);
    console.log('Kind:', kind);
    
    if (!kind) {
      return NextResponse.json(
        { error: 'Document kind is required' },
        { status: 400 }
      );
    }

    const id = randomUUID();
    console.log('Generated ID:', id);
    
    console.log('Available handlers:', documentHandlersByArtifactKind.map(h => h.kind));
    const handler = documentHandlersByArtifactKind.find(h => h.kind === kind);
    console.log('Found handler:', handler?.kind);
    
    if (!handler) {
      return NextResponse.json(
        { error: `No document handler found for kind: ${kind}` },
        { status: 400 }
      );
    }

    console.log('Calling onCreateDocument...');
    await handler.onCreateDocument({
      id,
      title,
      session: session as BetterAuthSession,
      dataStream: {
        writeData: async (data: any) => {
          console.log('DataStream write:', data);
        },
        write: async () => {},
        writeMessageAnnotation: async () => {},
        writeSource: async () => {},
        merge: async () => {},
        onError: () => {}
      }
    });

    console.log('Getting created document...');
    const [document] = await getDocumentById({ id });
    console.log('Retrieved document:', document);
    return NextResponse.json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { id, content } = await request.json();
    return NextResponse.json({ id });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await documentRepository.deleteDocument(id);

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}