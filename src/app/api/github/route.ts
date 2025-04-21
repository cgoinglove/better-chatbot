import { GitHubRepository } from "app-types/github";
import { githubService } from "lib/db/github-service";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export async function GET(request: Request) {
  try {
    const userId = getMockUserSession().id;
    const repositories = await githubService.selectRepositoriesByUserId(userId);
    
    return Response.json(repositories);
  } catch (error: any) {
    logger.error("Error fetching GitHub repositories:", error);
    return new Response(error.message || "Failed to fetch repositories", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = getMockUserSession().id;
    const data = await request.json();
    
    const { name, path, description, isEnabled } = data as Partial<GitHubRepository>;
    
    if (!name || !path) {
      return new Response("Name and path are required", { status: 400 });
    }
    
    const repository = await githubService.insertRepository({
      name,
      path,
      description,
      isEnabled: isEnabled ?? true,
      userId,
    });
    
    return Response.json(repository);
  } catch (error: any) {
    logger.error("Error creating GitHub repository:", error);
    return new Response(error.message || "Failed to create repository", { status: 500 });
  }
}
