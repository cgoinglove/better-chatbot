import { pollAndSaveGitHubAccount } from "lib/github/device-flow";
import { getMockUserSession } from "lib/mock";
import logger from "logger";
import { NextRequest } from "next/server";

/**
 * Poll for GitHub Device Flow authentication completion
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is logged in
    const user = getMockUserSession();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get the device code from the request body
    const { deviceCode, interval } = await request.json();

    if (!deviceCode) {
      return new Response("Device code is required", { status: 400 });
    }

    // Poll for access token and save GitHub account
    // Note: This is a long-polling operation that may take several minutes
    const result = await pollAndSaveGitHubAccount(
      user.id,
      deviceCode,
      interval || 5
    );

    // Return the result
    return Response.json(result);
  } catch (error: any) {
    logger.error("Error polling for GitHub device authentication:", error);
    return new Response(
      error.message || "Failed to complete GitHub device authentication",
      { status: 500 },
    );
  }
}
