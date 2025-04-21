import { libraryService } from "lib/db/library-service";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    
    if (!query) {
      return new Response("Search query is required", { status: 400 });
    }
    
    const userId = getMockUserSession().id;
    const results = await libraryService.searchLibraryEntries(query, userId);
    
    return Response.json(results);
  } catch (error: any) {
    logger.error("Error searching library entries:", error);
    return new Response(error.message || "Failed to search library entries", { status: 500 });
  }
}
