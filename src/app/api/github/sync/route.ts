import { NextRequest } from "next/server";
import { getMockUserSession } from "lib/mock";
import logger from "logger";
import { cloneRepository } from "lib/github/git-service";
import { githubService } from "lib/db/github-service";

export async function POST(request: NextRequest) {
  try {
    // Verify user is logged in
    const user = getMockUserSession();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    
    // Get repository from request body
    const { repository } = await request.json();
    
    if (!repository) {
      return new Response("Repository is required", { status: 400 });
    }
    
    // Parse repository owner and name
    const [owner, name] = repository.split("/");
    
    if (!owner || !name) {
      return new Response("Invalid repository format. Expected 'owner/name'", { status: 400 });
    }
    
    // Check if repository already exists in the database
    const existingRepos = await githubService.selectRepositoriesByName(repository);
    
    if (existingRepos.length > 0) {
      // Repository already exists, update it
      const existingRepo = existingRepos[0];
      
      // Pull latest changes
      try {
        // Clone or update the repository
        const repoPath = await cloneRepository(user.id, owner, name);
        
        // Update repository in database
        await githubService.updateRepository(existingRepo.id, {
          path: repoPath,
          isEnabled: true,
        });
        
        // Index the repository
        await githubService.indexRepository(existingRepo.id);
        
        return new Response(JSON.stringify({
          success: true,
          message: `Repository ${repository} updated successfully`,
          repository: existingRepo,
        }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        logger.error(`Error updating repository ${repository}:`, error);
        return new Response(`Failed to update repository: ${error instanceof Error ? error.message : "Unknown error"}`, { status: 500 });
      }
    } else {
      // Repository doesn't exist, clone it
      try {
        // Clone the repository
        const repoPath = await cloneRepository(user.id, owner, name);
        
        // Add repository to database
        const newRepo = await githubService.insertRepository({
          name: repository,
          path: repoPath,
          description: `Cloned from GitHub: ${repository}`,
          isEnabled: true,
          userId: user.id,
        });
        
        // Index the repository
        await githubService.indexRepository(newRepo.id);
        
        return new Response(JSON.stringify({
          success: true,
          message: `Repository ${repository} synced successfully`,
          repository: newRepo,
        }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        logger.error(`Error syncing repository ${repository}:`, error);
        return new Response(`Failed to sync repository: ${error instanceof Error ? error.message : "Unknown error"}`, { status: 500 });
      }
    }
  } catch (error: any) {
    logger.error("Error handling repository sync:", error);
    return new Response(error.message || "Failed to sync repository", { status: 500 });
  }
}
