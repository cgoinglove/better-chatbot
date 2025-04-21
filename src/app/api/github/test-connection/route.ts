import { githubConfigService } from "lib/db/github-config-service";
import { getMockUserSession } from "lib/mock";
import logger from "logger";
import { NextRequest } from "next/server";

// GitHub API URL
const GITHUB_API_URL = "https://api.github.com";

export async function GET(request: NextRequest) {
  try {
    // Verify user is logged in
    const user = getMockUserSession();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get GitHub config from database
    const config = await githubConfigService.getActiveConfig();

    // If no config in database, fall back to environment variables
    const clientId = config?.clientId || process.env.GITHUB_CLIENT_ID;
    const clientSecret =
      config?.clientSecret || process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return new Response("GitHub credentials are not configured", {
        status: 400,
      });
    }

    if (
      clientId === "your_github_client_id" ||
      clientSecret === "your_github_client_secret"
    ) {
      return new Response("GitHub credentials are set to placeholder values", {
        status: 400,
      });
    }

    // Test GitHub API connection
    // We'll use the GitHub API rate limit endpoint which doesn't require authentication
    try {
      const response = await fetch(`${GITHUB_API_URL}/rate_limit`, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          // Basic auth with client ID and secret for higher rate limits
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`GitHub API error: ${error}`);
      }

      const data = await response.json();

      // Get active GitHub config
      const activeConfig = await githubConfigService.getActiveConfig();

      // Return success response with rate limit info and config status
      return new Response(
        JSON.stringify({
          success: true,
          rateLimit: data.rate,
          config: activeConfig
            ? {
                id: activeConfig.id,
                clientId: activeConfig.clientId,
                redirectUri: activeConfig.redirectUri,
                isActive: activeConfig.isActive,
                createdAt: activeConfig.createdAt,
              }
            : null,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      logger.error("Error testing GitHub API connection:", error);
      return new Response("Failed to connect to GitHub API", { status: 500 });
    }
  } catch (error: any) {
    logger.error("Error testing GitHub connection:", error);
    return new Response(error.message || "Failed to test GitHub connection", {
      status: 500,
    });
  }
}
