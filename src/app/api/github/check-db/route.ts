import { githubConfigService } from "lib/db/github-config-service";
import { getMockUserSession } from "lib/mock";
import logger from "logger";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Verify user is logged in
    const user = getMockUserSession();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Check if we can get GitHub config
    try {
      const configs = await githubConfigService.getAllConfigs();
      const activeConfig = await githubConfigService.getActiveConfig();

      return Response.json({
        success: true,
        tableExists: true, // We assume the table exists if we can query it
        hasConfigs: configs.length > 0,
        hasActiveConfig: !!activeConfig,
      });
    } catch (error) {
      logger.error("Error checking GitHub config:", error);

      // If we get a specific error about the table not existing, return that info
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const tableNotExist =
        errorMessage.includes("no such table") ||
        errorMessage.includes("doesn't exist") ||
        errorMessage.includes("relation does not exist");

      if (tableNotExist) {
        return Response.json({
          success: true,
          tableExists: false,
          message: "GitHub config table does not exist yet",
        });
      }

      return Response.json(
        {
          success: false,
          error: "Error checking GitHub config",
          message: errorMessage,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    logger.error("Error in check-db route:", error);
    return Response.json(
      {
        success: false,
        error: "Error in check-db route",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
