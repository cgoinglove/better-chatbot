import { Library } from "app-types/library";
import { libraryService } from "lib/db/library-service";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const library = await libraryService.selectLibrary(params.id);
    
    if (!library) {
      return new Response("Library not found", { status: 404 });
    }
    
    // Check if the library belongs to the current user
    const userId = getMockUserSession().id;
    if (library.userId !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    
    return Response.json(library);
  } catch (error: any) {
    logger.error("Error fetching library:", error);
    return new Response(error.message || "Failed to fetch library", { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if the library exists
    const existingLibrary = await libraryService.selectLibrary(params.id);
    if (!existingLibrary) {
      return new Response("Library not found", { status: 404 });
    }
    
    // Check if the library belongs to the current user
    const userId = getMockUserSession().id;
    if (existingLibrary.userId !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    
    const data = await request.json();
    const { name, description } = data as Partial<Library>;
    
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    
    const updatedLibrary = await libraryService.updateLibrary(params.id, updates);
    
    return Response.json(updatedLibrary);
  } catch (error: any) {
    logger.error("Error updating library:", error);
    return new Response(error.message || "Failed to update library", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if the library exists
    const existingLibrary = await libraryService.selectLibrary(params.id);
    if (!existingLibrary) {
      return new Response("Library not found", { status: 404 });
    }
    
    // Check if the library belongs to the current user
    const userId = getMockUserSession().id;
    if (existingLibrary.userId !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    
    await libraryService.deleteLibrary(params.id);
    
    return new Response(null, { status: 204 });
  } catch (error: any) {
    logger.error("Error deleting library:", error);
    return new Response(error.message || "Failed to delete library", { status: 500 });
  }
}
