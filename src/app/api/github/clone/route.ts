import { cloneRepository } from "lib/github/git-service";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export async function POST(request: Request) {
  try {
    // Verify user is logged in
    const user = getMockUserSession();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    
    // Get repository details from request body
    const { owner, name, branch, depth } = await request.json();
    
    if (!owner || !name) {
      return new Response("Repository owner and name are required", { status: 400 });
    }
    
    // Clone the repository
    const repoPath = await cloneRepository(user.id, owner, name, {
      branch,
      depth,
    });
    
    return Response.json({
      success: true,
      path: repoPath,
      message: `Repository ${owner}/${name} cloned successfully`,
    });
  } catch (error: any) {
    logger.error("Error cloning repository:", error);
    return new Response(error.message || "Failed to clone repository", { status: 500 });
  }
}
