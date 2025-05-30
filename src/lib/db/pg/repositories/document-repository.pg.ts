import { pgDb as db } from '../db.pg';
import { DocumentSchema } from '../schema.pg';
import { eq, desc } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

type Document = InferSelectModel<typeof DocumentSchema>;

export class DocumentRepository {
  async createDocument(userId: string, title: string, kind: string, content: string): Promise<Document> {
    const documents = await db
      .insert(DocumentSchema)
      .values({
        title,
        content,
        kind: kind as 'text' | 'code' | 'image' | 'sheet',
        userId
      })
      .returning();

    return documents[0];
  }

  async getDocumentById(id: string): Promise<Document | null> {
    const documents = await db
      .select()
      .from(DocumentSchema)
      .where(eq(DocumentSchema.id, id));

    return documents[0] || null;
  }

  async updateDocument(id: string, content: string): Promise<Document> {
    const documents = await db
      .update(DocumentSchema)
      .set({ 
        content,
        updatedAt: new Date() 
      })
      .where(eq(DocumentSchema.id, id))
      .returning();

    return documents[0];
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(DocumentSchema).where(eq(DocumentSchema.id, id));
  }

  async listDocuments(userId: string): Promise<Document[]> {
    const documents = await db
      .select()
      .from(DocumentSchema)
      .where(eq(DocumentSchema.userId, userId))
      .orderBy(desc(DocumentSchema.createdAt));

    return documents;
  }
}
