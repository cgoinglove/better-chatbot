import { Library } from "app-types/library";
import { libraryService } from "lib/db/library-service";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export async function GET(request: Request) {
  try {
    const userId = getMockUserSession().id;
    const libraries = await libraryService.selectLibrariesByUserId(userId);
    
    return Response.json(libraries);
  } catch (error: any) {
    logger.error("Error fetching libraries:", error);
    return new Response(error.message || "Failed to fetch libraries", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = getMockUserSession().id;
    const data = await request.json();
    
    const { name, description } = data as Partial<Library>;
    
    if (!name) {
      return new Response("Name is required", { status: 400 });
    }
    
    const library = await libraryService.insertLibrary({
      name,
      description: description || null,
      userId,
    });
    
    return Response.json(library);
  } catch (error: any) {
    logger.error("Error creating library:", error);
    return new Response(error.message || "Failed to create library", { status: 500 });
  }
}
