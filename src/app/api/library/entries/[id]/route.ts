import { LibraryEntry } from "app-types/library";
import { libraryService } from "lib/db/library-service";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const entry = await libraryService.selectLibraryEntry(params.id);
    
    if (!entry) {
      return new Response("Library entry not found", { status: 404 });
    }
    
    // Check if the library belongs to the current user
    const library = await libraryService.selectLibrary(entry.libraryId);
    if (!library) {
      return new Response("Library not found", { status: 404 });
    }
    
    const userId = getMockUserSession().id;
    if (library.userId !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    
    return Response.json(entry);
  } catch (error: any) {
    logger.error("Error fetching library entry:", error);
    return new Response(error.message || "Failed to fetch library entry", { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if the entry exists
    const existingEntry = await libraryService.selectLibraryEntry(params.id);
    if (!existingEntry) {
      return new Response("Library entry not found", { status: 404 });
    }
    
    // Check if the library belongs to the current user
    const library = await libraryService.selectLibrary(existingEntry.libraryId);
    if (!library) {
      return new Response("Library not found", { status: 404 });
    }
    
    const userId = getMockUserSession().id;
    if (library.userId !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    
    const data = await request.json();
    const { title, content, source, sourceType, tags } = data as Partial<LibraryEntry>;
    
    const updates: Record<string, any> = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (source !== undefined) updates.source = source;
    if (sourceType !== undefined) updates.sourceType = sourceType;
    if (tags !== undefined) updates.tags = tags;
    
    const updatedEntry = await libraryService.updateLibraryEntry(params.id, updates);
    
    return Response.json(updatedEntry);
  } catch (error: any) {
    logger.error("Error updating library entry:", error);
    return new Response(error.message || "Failed to update library entry", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if the entry exists
    const existingEntry = await libraryService.selectLibraryEntry(params.id);
    if (!existingEntry) {
      return new Response("Library entry not found", { status: 404 });
    }
    
    // Check if the library belongs to the current user
    const library = await libraryService.selectLibrary(existingEntry.libraryId);
    if (!library) {
      return new Response("Library not found", { status: 404 });
    }
    
    const userId = getMockUserSession().id;
    if (library.userId !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    
    await libraryService.deleteLibraryEntry(params.id);
    
    return new Response(null, { status: 204 });
  } catch (error: any) {
    logger.error("Error deleting library entry:", error);
    return new Response(error.message || "Failed to delete library entry", { status: 500 });
  }
}
