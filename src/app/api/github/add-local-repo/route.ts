import { createRepositoryAction } from "app/api/github/actions";
import { getMockUserSession } from "lib/mock";
import logger from "logger";
import { NextRequest } from "next/server";
import path from "path";

/**
 * API endpoint to add a local repository to the managed repositories
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is logged in
    const user = getMockUserSession();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get repository data from request body
    const { name, repoPath, remote } = await request.json();

    if (!name || !repoPath) {
      return new Response("Repository name and path are required", { status: 400 });
    }

    // Create repository
    try {
      const repository = await createRepositoryAction({
        name,
        path: repoPath,
        description: `Local repository: ${path.basename(repoPath)}`,
        url: remote || "",
        userId: user.id,
      });

      return Response.json({
        success: true,
        repository,
        message: "Repository added successfully",
      });
    } catch (error) {
      logger.error("Error adding repository:", error);
      return new Response(
        error instanceof Error ? error.message : "Failed to add repository",
        { status: 500 },
      );
    }
  } catch (error: any) {
    logger.error("Error in add-local-repo route:", error);
    return new Response(
      error.message || "Failed to add repository",
      { status: 500 },
    );
  }
}
