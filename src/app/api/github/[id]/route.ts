import { GitHubRepositoryUpdate } from "app-types/github";
import { githubService } from "lib/db/github-service";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const repository = await githubService.selectRepository(id);
    
    if (!repository) {
      return new Response("Repository not found", { status: 404 });
    }
    
    // Verify the repository belongs to the current user
    const userId = getMockUserSession().id;
    if (repository.userId !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    
    return Response.json(repository);
  } catch (error: any) {
    logger.error("Error fetching GitHub repository:", error);
    return new Response(error.message || "Failed to fetch repository", { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const data = await request.json();
    
    // Verify the repository exists and belongs to the current user
    const existingRepository = await githubService.selectRepository(id);
    if (!existingRepository) {
      return new Response("Repository not found", { status: 404 });
    }
    
    const userId = getMockUserSession().id;
    if (existingRepository.userId !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    
    const { name, path, description, isEnabled } = data as GitHubRepositoryUpdate;
    
    const updatedRepository = await githubService.updateRepository(id, {
      name,
      path,
      description,
      isEnabled,
    });
    
    return Response.json(updatedRepository);
  } catch (error: any) {
    logger.error("Error updating GitHub repository:", error);
    return new Response(error.message || "Failed to update repository", { status: 500 });
  }
}

export async function DELETE(
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
    
    const success = await githubService.deleteRepository(id);
    
    if (success) {
      return new Response(null, { status: 204 });
    } else {
      return new Response("Failed to delete repository", { status: 500 });
    }
  } catch (error: any) {
    logger.error("Error deleting GitHub repository:", error);
    return new Response(error.message || "Failed to delete repository", { status: 500 });
  }
}
