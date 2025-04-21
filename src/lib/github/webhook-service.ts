/**
 * GitHub Webhook Service
 *
 * This service handles GitHub webhooks to keep repositories in sync.
 */

import { exec } from "child_process";
import crypto from "crypto";
import { githubConfigService } from "lib/db/github-config-service";
import { githubService } from "lib/db/github-service";
import logger from "logger";
import { promisify } from "util";
import { githubApiRequest } from "./github-api-middleware";

const execAsync = promisify(exec);

/**
 * Get webhook secret from database or environment variables
 * @returns Webhook secret
 */
async function getWebhookSecret(): Promise<string> {
  // Try to get config from database
  const config = await githubConfigService.getActiveConfig();

  // If config exists in database, use it
  if (config) {
    return config.webhookSecret;
  }

  // Fallback to environment variables
  return process.env.GITHUB_WEBHOOK_SECRET || "";
}

/**
 * Verify webhook signature
 * @param payload Webhook payload
 * @param signature Webhook signature
 * @returns True if the signature is valid
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
): Promise<boolean> {
  const webhookSecret = await getWebhookSecret();

  if (!webhookSecret) {
    logger.warn(
      "GitHub webhook secret is not set, skipping signature verification",
    );
    return true;
  }

  const hmac = crypto.createHmac("sha256", webhookSecret);
  const digest = "sha256=" + hmac.update(payload).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

/**
 * Create a webhook for a repository
 * @param userId User ID
 * @param owner Repository owner
 * @param repo Repository name
 * @param webhookUrl Webhook URL
 * @returns Webhook details
 */
export async function createRepositoryWebhook(
  userId: string,
  owner: string,
  repo: string,
  webhookUrl: string,
): Promise<any> {
  const webhookSecret = await getWebhookSecret();

  return githubApiRequest(userId, `/repos/${owner}/${repo}/hooks`, {
    method: "POST",
    body: {
      name: "web",
      active: true,
      events: ["push", "pull_request"],
      config: {
        url: webhookUrl,
        content_type: "json",
        secret: webhookSecret,
      },
    },
  });
}

/**
 * List webhooks for a repository
 * @param userId User ID
 * @param owner Repository owner
 * @param repo Repository name
 * @returns List of webhooks
 */
export async function listRepositoryWebhooks(
  userId: string,
  owner: string,
  repo: string,
): Promise<any[]> {
  return githubApiRequest(userId, `/repos/${owner}/${repo}/hooks`);
}

/**
 * Delete a webhook
 * @param userId User ID
 * @param owner Repository owner
 * @param repo Repository name
 * @param hookId Webhook ID
 * @returns True if the webhook was deleted
 */
export async function deleteRepositoryWebhook(
  userId: string,
  owner: string,
  repo: string,
  hookId: number,
): Promise<boolean> {
  try {
    await githubApiRequest(userId, `/repos/${owner}/${repo}/hooks/${hookId}`, {
      method: "DELETE",
    });

    return true;
  } catch (error) {
    logger.error("Error deleting webhook:", error);
    return false;
  }
}

/**
 * Handle webhook event
 * @param event Webhook event
 * @param payload Webhook payload
 * @returns Result of handling the webhook
 */
export async function handleWebhookEvent(
  event: string,
  payload: any,
): Promise<{ success: boolean; message: string }> {
  try {
    logger.info(`Handling webhook event: ${event}`);

    if (event === "ping") {
      return { success: true, message: "Pong!" };
    }

    if (event === "push") {
      return await handlePushEvent(payload);
    }

    if (event === "pull_request") {
      return await handlePullRequestEvent(payload);
    }

    return {
      success: true,
      message: `Event ${event} received but not handled`,
    };
  } catch (error: any) {
    logger.error("Error handling webhook event:", error);
    return {
      success: false,
      message: error.message || "Error handling webhook event",
    };
  }
}

/**
 * Handle push event
 * @param payload Push event payload
 * @returns Result of handling the push event
 */
async function handlePushEvent(
  payload: any,
): Promise<{ success: boolean; message: string }> {
  try {
    const { repository, ref } = payload;

    if (!repository) {
      return {
        success: false,
        message: "Repository information missing in payload",
      };
    }

    // Find the repository in our database
    const repoName = repository.full_name;
    const repos = await githubService.selectRepositoriesByName(repoName);

    if (repos.length === 0) {
      return {
        success: false,
        message: `Repository ${repoName} not found in database`,
      };
    }

    // Update each repository
    for (const repo of repos) {
      try {
        // Pull the latest changes
        await execAsync("git fetch origin", { cwd: repo.path });

        // Check if the pushed branch is the current branch
        const { stdout: currentBranch } = await execAsync(
          "git rev-parse --abbrev-ref HEAD",
          { cwd: repo.path },
        );
        const branchName = ref.replace("refs/heads/", "");

        if (currentBranch.trim() === branchName) {
          // Pull the changes if it's the current branch
          await execAsync("git pull", { cwd: repo.path });
        }

        // Re-index the repository
        await githubService.indexRepository(repo.id);

        logger.info(`Repository ${repo.name} updated successfully`);
      } catch (error) {
        logger.error(`Error updating repository ${repo.name}:`, error);
      }
    }

    return { success: true, message: `Repositories updated for ${repoName}` };
  } catch (error: any) {
    logger.error("Error handling push event:", error);
    return {
      success: false,
      message: error.message || "Error handling push event",
    };
  }
}

/**
 * Handle pull request event
 * @param payload Pull request event payload
 * @returns Result of handling the pull request event
 */
async function handlePullRequestEvent(
  payload: any,
): Promise<{ success: boolean; message: string }> {
  try {
    const { action, repository, pull_request } = payload;

    if (!repository || !pull_request) {
      return {
        success: false,
        message: "Repository or pull request information missing in payload",
      };
    }

    // We only care about merged pull requests
    if (action !== "closed" || !pull_request.merged) {
      return {
        success: true,
        message: `Pull request action ${action} ignored`,
      };
    }

    // Find the repository in our database
    const repoName = repository.full_name;
    const repos = await githubService.selectRepositoriesByName(repoName);

    if (repos.length === 0) {
      return {
        success: false,
        message: `Repository ${repoName} not found in database`,
      };
    }

    // Update each repository
    for (const repo of repos) {
      try {
        // Pull the latest changes
        await execAsync("git fetch origin", { cwd: repo.path });

        // Check if the target branch is the current branch
        const { stdout: currentBranch } = await execAsync(
          "git rev-parse --abbrev-ref HEAD",
          { cwd: repo.path },
        );
        const targetBranch = pull_request.base.ref;

        if (currentBranch.trim() === targetBranch) {
          // Pull the changes if it's the current branch
          await execAsync("git pull", { cwd: repo.path });
        }

        // Re-index the repository
        await githubService.indexRepository(repo.id);

        logger.info(
          `Repository ${repo.name} updated successfully after PR merge`,
        );
      } catch (error) {
        logger.error(
          `Error updating repository ${repo.name} after PR merge:`,
          error,
        );
      }
    }

    return {
      success: true,
      message: `Repositories updated for ${repoName} after PR merge`,
    };
  } catch (error: any) {
    logger.error("Error handling pull request event:", error);
    return {
      success: false,
      message: error.message || "Error handling pull request event",
    };
  }
}
