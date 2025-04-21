import { NextRequest } from "next/server";
import { getMockUserSession } from "lib/mock";
import logger from "logger";
import { getValidAccessToken } from "lib/github/github-auth";

// GitHub API URL
const GITHUB_API_URL = "https://api.github.com";

export async function GET(request: NextRequest) {
  try {
    // Verify user is logged in
    const user = getMockUserSession();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    
    // Get a valid access token
    const accessToken = await getValidAccessToken(user.id);
    
    if (!accessToken) {
      return new Response("No valid GitHub access token available", { status: 401 });
    }
    
    // Fetch user repositories from GitHub
    try {
      // Get query parameters
      const { searchParams } = new URL(request.url);
      const sort = searchParams.get("sort") || "updated";
      const perPage = searchParams.get("per_page") || "100";
      const page = searchParams.get("page") || "1";
      
      // Fetch repositories
      const response = await fetch(
        `${GITHUB_API_URL}/user/repos?sort=${sort}&per_page=${perPage}&page=${page}`,
        {
          headers: {
            "Authorization": `token ${accessToken}`,
            "Accept": "application/vnd.github.v3+json",
          },
        }
      );
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`GitHub API error: ${error}`);
      }
      
      const repositories = await response.json();
      
      // Return repositories
      return new Response(JSON.stringify(repositories), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      logger.error("Error fetching GitHub repositories:", error);
      return new Response("Failed to fetch GitHub repositories", { status: 500 });
    }
  } catch (error: any) {
    logger.error("Error handling GitHub repositories request:", error);
    return new Response(error.message || "Failed to fetch GitHub repositories", { status: 500 });
  }
}
