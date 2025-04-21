import { completeDeviceFlowAuth } from "lib/github/device-flow";
import { getMockUserSession } from "lib/mock";
import logger from "logger";
import { NextRequest } from "next/server";

/**
 * Initiate the GitHub Device Flow authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user is logged in
    const user = getMockUserSession();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Start the device flow authentication
    const deviceInfo = await completeDeviceFlowAuth(user.id);

    // Return the device verification information
    return Response.json({
      success: true,
      ...deviceInfo,
    });
  } catch (error: any) {
    logger.error("Error initiating GitHub device flow:", error);
    return new Response(
      error.message || "Failed to initiate GitHub device authentication",
      { status: 500 },
    );
  }
}
