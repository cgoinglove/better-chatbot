import { getGitHubAuthUrl } from "lib/github/github-auth";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export async function GET(request: Request) {
  try {
    // Verify user is logged in
    const user = getMockUserSession();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Check if GitHub client ID is configured and not a placeholder
    if (!process.env.GITHUB_CLIENT_ID) {
      logger.error("GitHub Client ID is not configured");
      return new Response(
        "GitHub integration is not properly configured. Please set GITHUB_CLIENT_ID in your environment variables.",
        { status: 500 },
      );
    }

    if (process.env.GITHUB_CLIENT_ID === "your_github_client_id") {
      logger.error("GitHub Client ID is set to the placeholder value");
      return new Response(
        "GitHub Client ID is set to the placeholder value 'your_github_client_id'. Please replace it with your actual GitHub OAuth App client ID in the .env.local file.",
        { status: 500 },
      );
    }

    // We used to validate the client ID format here, but removed it
    // as it was causing false positives with valid client IDs

    // Generate GitHub authorization URL
    const authUrl = await getGitHubAuthUrl();

    // Redirect to GitHub authorization page
    return Response.redirect(authUrl);
  } catch (error: any) {
    logger.error("Error initiating GitHub auth:", error);
    return new Response(
      error.message || "Failed to initiate GitHub authentication",
      { status: 500 },
    );
  }
}
