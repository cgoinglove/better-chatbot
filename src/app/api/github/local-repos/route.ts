import { scanLocalRepositories } from "lib/github/local-repo-scanner";
import { getMockUserSession } from "lib/mock";
import logger from "logger";
import { NextRequest } from "next/server";

/**
 * API endpoint to scan for local GitHub repositories
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user is logged in
    const user = getMockUserSession();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const forceRescan = searchParams.get("force") === "true";
    
    // Scan for local repositories
    logger.info("Scanning for local GitHub repositories...");
    const repositories = await scanLocalRepositories();
    
    // Return repositories
    return Response.json({
      success: true,
      repositories,
      count: repositories.length,
    });
  } catch (error: any) {
    logger.error("Error scanning for local repositories:", error);
    return new Response(
      error.message || "Failed to scan for local repositories",
      { status: 500 },
    );
  }
}
