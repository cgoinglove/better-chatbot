import { githubService } from "lib/db/github-service";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Verify the repository exists and belongs to the current user
    const existingRepository = await githubService.selectRepository(id);
    if (!existingRepository) {
      return new Response("Repository not found", { status: 404 });
    }
    
    const userId = getMockUserSession().id;
    if (existingRepository.userId !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    
    // Index the repository
    const indexedCount = await githubService.indexRepository(id);
    
    return Response.json({ 
      success: true, 
      message: `Successfully indexed ${indexedCount} files`,
      indexedCount
    });
  } catch (error: any) {
    logger.error("Error indexing GitHub repository:", error);
    return new Response(error.message || "Failed to index repository", { status: 500 });
  }
}
