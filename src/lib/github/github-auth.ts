/**
 * GitHub Authentication Service
 *
 * This service handles GitHub OAuth authentication and token management.
 */

import { githubAccountService } from "lib/db/github-account-service";
import { githubConfigService } from "lib/db/github-config-service";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

// GitHub API URLs
const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_API_URL = "https://api.github.com";

// Buffer time before token expiration (5 minutes)
const TOKEN_EXPIRATION_BUFFER = 5 * 60 * 1000;

/**
 * Get GitHub OAuth configuration from database
 * @returns GitHub OAuth configuration
 */
async function getGitHubConfig() {
  // Try to get config from database
  const config = await githubConfigService.getActiveConfig();

  // If config exists in database, use it
  if (config) {
    return {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      webhookSecret: config.webhookSecret,
    };
  }

  // Fallback to environment variables
  return {
    clientId: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    redirectUri:
      process.env.GITHUB_REDIRECT_URI ||
      "http://localhost:3000/api/github/callback",
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || "",
  };
}

/**
 * Generate GitHub OAuth authorization URL
 * @returns The GitHub authorization URL
 */
export async function getGitHubAuthUrl(): Promise<string> {
  // Get GitHub config
  const config = await getGitHubConfig();

  // Log the configuration for debugging
  logger.info("GitHub OAuth configuration:", {
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    clientIdFromEnv: process.env.GITHUB_CLIENT_ID,
    redirectUriFromEnv: process.env.GITHUB_REDIRECT_URI,
  });

  // Check if GitHub client ID is configured and is not the placeholder value
  if (!config.clientId) {
    throw new Error(
      "GitHub Client ID is not configured. Please configure GitHub integration.",
    );
  }

  if (config.clientId === "your_github_client_id") {
    throw new Error(
      "GitHub Client ID is set to the placeholder value 'your_github_client_id'. Please configure GitHub integration with your actual GitHub OAuth App client ID.",
    );
  }

  // We used to validate the client ID format here, but removed it
  // as it was causing false positives with valid client IDs

  const user = getMockUserSession();
  if (!user) {
    throw new Error("User not authenticated");
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: "repo read:user user:email",
    state: user.id, // Use user ID as state for verification
  });

  const authUrl = `${GITHUB_AUTH_URL}?${params.toString()}`;
  logger.info("Generated GitHub auth URL:", authUrl);

  return authUrl;
}

/**
 * Exchange authorization code for access token
 * @param code The authorization code from GitHub
 * @returns The access token response
 */
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  token_type: string;
  scope: string;
  expires_in?: number;
}> {
  // Get GitHub config
  const config = await getGitHubConfig();

  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get GitHub user information
 * @param accessToken GitHub access token
 * @returns User information from GitHub
 */
export async function getGitHubUser(accessToken: string): Promise<{
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
}> {
  const response = await fetch(`${GITHUB_API_URL}/user`, {
    headers: {
      Authorization: `token ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub user: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get user repositories from GitHub
 * @param accessToken GitHub access token
 * @returns List of user repositories
 */
export async function getUserRepositories(accessToken: string): Promise<any[]> {
  const response = await fetch(
    `${GITHUB_API_URL}/user/repos?sort=updated&per_page=100`,
    {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch repositories: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get repository content from GitHub
 * @param accessToken GitHub access token
 * @param owner Repository owner
 * @param repo Repository name
 * @param path File path
 * @returns Repository content
 */
export async function getRepositoryContent(
  accessToken: string,
  owner: string,
  repo: string,
  path: string = "",
): Promise<any> {
  const response = await fetch(
    `${GITHUB_API_URL}/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch repository content: ${response.statusText}`,
    );
  }

  return response.json();
}

/**
 * Search code in GitHub repository
 * @param accessToken GitHub access token
 * @param query Search query
 * @param repo Repository name (optional)
 * @returns Search results
 */
export async function searchCode(
  accessToken: string,
  query: string,
  repo?: string,
): Promise<any> {
  const q = repo ? `${query} repo:${repo}` : query;

  const response = await fetch(
    `${GITHUB_API_URL}/search/code?q=${encodeURIComponent(q)}`,
    {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to search code: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Refresh an expired GitHub access token
 * @param refreshToken The refresh token from GitHub
 * @returns The new access token response
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  token_type: string;
  scope: string;
  expires_in?: number;
}> {
  // Get GitHub config
  const config = await getGitHubConfig();

  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub token refresh failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check if a token is expired or about to expire
 * @param expiresAt The token expiration timestamp
 * @returns True if the token is expired or about to expire
 */
export function isTokenExpired(expiresAt?: Date): boolean {
  if (!expiresAt) return false;

  const now = new Date();
  const expirationWithBuffer = new Date(
    expiresAt.getTime() - TOKEN_EXPIRATION_BUFFER,
  );

  return now >= expirationWithBuffer;
}

/**
 * Get a valid access token for a user
 * @param userId The user ID
 * @returns A valid access token or null if no token is available
 */
export async function getValidAccessToken(
  userId: string,
): Promise<string | null> {
  try {
    // Get the GitHub account for the user
    const account = await githubAccountService.getAccountByUserId(userId);

    if (!account) {
      return null;
    }

    // Check if the token is expired or about to expire
    if (account.expiresAt && isTokenExpired(account.expiresAt)) {
      // Token is expired or about to expire, try to refresh it
      if (account.refreshToken) {
        try {
          const tokenResponse = await refreshAccessToken(account.refreshToken);

          // Calculate the expiration date
          let expiresAt: Date | undefined;
          if (tokenResponse.expires_in) {
            expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);
          }

          // Update the account with the new token
          await githubAccountService.updateAccount(account.id, {
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token || account.refreshToken,
            tokenType: tokenResponse.token_type,
            scope: tokenResponse.scope,
            expiresAt,
          });

          return tokenResponse.access_token;
        } catch (error) {
          logger.error("Error refreshing GitHub token:", error);
          return null;
        }
      } else {
        // No refresh token available
        return null;
      }
    }

    // Token is still valid
    return account.accessToken;
  } catch (error) {
    logger.error("Error getting valid GitHub token:", error);
    return null;
  }
}
