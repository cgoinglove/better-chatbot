import { LibraryEntry } from "app-types/library";
import { libraryService } from "lib/db/library-service";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if the library exists
    const library = await libraryService.selectLibrary(params.id);
    
    if (!library) {
      return new Response("Library not found", { status: 404 });
    }
    
    // Check if the library belongs to the current user
    const userId = getMockUserSession().id;
    if (library.userId !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    
    const entries = await libraryService.selectLibraryEntriesByLibraryId(params.id);
    
    return Response.json(entries);
  } catch (error: any) {
    logger.error("Error fetching library entries:", error);
    return new Response(error.message || "Failed to fetch library entries", { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if the library exists
    const library = await libraryService.selectLibrary(params.id);
    
    if (!library) {
      return new Response("Library not found", { status: 404 });
    }
    
    // Check if the library belongs to the current user
    const userId = getMockUserSession().id;
    if (library.userId !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    
    const data = await request.json();
    const { title, content, source, sourceType, tags } = data as Partial<LibraryEntry>;
    
    if (!title || !content) {
      return new Response("Title and content are required", { status: 400 });
    }
    
    const entry = await libraryService.insertLibraryEntry({
      libraryId: params.id,
      title,
      content,
      source: source || null,
      sourceType: sourceType || null,
      tags: tags || [],
    });
    
    return Response.json(entry);
  } catch (error: any) {
    logger.error("Error creating library entry:", error);
    return new Response(error.message || "Failed to create library entry", { status: 500 });
  }
}
