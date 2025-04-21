import { writeFile } from "fs/promises";
import {
  generateWebhookSecret,
  githubConfigService,
} from "lib/db/github-config-service";
import { getMockUserSession } from "lib/mock";
import logger from "logger";
import { NextRequest } from "next/server";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    // Verify user is logged in and has admin permissions
    const user = getMockUserSession();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // In a real app, you would check if the user has admin permissions
    // For now, we'll allow any authenticated user to set up GitHub

    // Get credentials from request body
    const { clientId, clientSecret, redirectUri } = await request.json();

    // Validate input
    if (!clientId || !clientSecret) {
      return new Response("Client ID and Client Secret are required", {
        status: 400,
      });
    }

    // Generate webhook secret
    const webhookSecret = generateWebhookSecret();

    try {
      // Deactivate any existing configurations
      const existingConfigs = await githubConfigService.getAllConfigs();
      for (const config of existingConfigs) {
        if (config.isActive) {
          await githubConfigService.updateConfig(config.id, {
            isActive: false,
          });
        }
      }

      // Create new configuration in database
      const newConfig = await githubConfigService.createConfig({
        clientId,
        clientSecret,
        redirectUri: redirectUri || "http://localhost:3000/api/github/callback",
        webhookSecret,
      });

      // Also update .env.local for backward compatibility
      try {
        const envContent = `# GitHub OAuth Configuration
GITHUB_CLIENT_ID=${clientId}
GITHUB_CLIENT_SECRET=${clientSecret}
GITHUB_REDIRECT_URI=${redirectUri || "http://localhost:3000/api/github/callback"}
GITHUB_WEBHOOK_SECRET=${webhookSecret}

# GitHub Repository Storage
GITHUB_REPOS_DIR=./github-repos
`;

        const envPath = path.join(process.cwd(), ".env.local");
        await writeFile(envPath, envContent);

        logger.info(
          "GitHub credentials also saved to .env.local for backward compatibility",
        );
      } catch (error) {
        logger.warn(
          "Could not update .env.local file, but database config was saved",
          error,
        );
      }

      // Return success response
      return new Response(
        JSON.stringify({
          success: true,
          config: {
            id: newConfig.id,
            clientId: newConfig.clientId,
            redirectUri: newConfig.redirectUri,
            isActive: newConfig.isActive,
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      logger.error("Error saving GitHub configuration:", error);
      return new Response("Failed to save GitHub configuration", {
        status: 500,
      });
    }
  } catch (error: any) {
    logger.error("Error setting up GitHub:", error);
    return new Response(error.message || "Failed to set up GitHub", {
      status: 500,
    });
  }
}
