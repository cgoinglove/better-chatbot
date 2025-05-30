import { NextResponse } from 'next/server';
import { DocumentRepository } from '@/lib/db/pg/repositories/document-repository.pg';

const documentRepository = new DocumentRepository();

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const document = await documentRepository.getDocumentById(id);

      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      return NextResponse.json(document);
    }

    const documents = await documentRepository.listDocuments(''); // TODO: Get actual user ID from auth
    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId, title, kind, content } = await request.json();

    const document = await documentRepository.createDocument(
      userId,
      title,
      kind,
      content
    );

    return NextResponse.json(document);

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

    const document = await documentRepository.updateDocument(id, content);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(document);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
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