import { githubService } from "lib/db/github-service";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const repositoryId = searchParams.get('repositoryId');
    
    if (!query) {
      return new Response("Search query is required", { status: 400 });
    }
    
    const userId = getMockUserSession().id;
    
    // If repositoryId is provided, verify it belongs to the user
    if (repositoryId) {
      const repository = await githubService.selectRepository(repositoryId);
      if (!repository || repository.userId !== userId) {
        return new Response("Repository not found or unauthorized", { status: 404 });
      }
    }
    
    const results = await githubService.searchFiles(
      repositoryId,
      query,
      userId
    );
    
    return Response.json(results);
  } catch (error: any) {
    logger.error("Error searching GitHub files:", error);
    return new Response(error.message || "Failed to search files", { status: 500 });
  }
}
