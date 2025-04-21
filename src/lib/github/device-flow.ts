/**
 * GitHub Device Flow Authentication
 * 
 * This module implements the GitHub Device Flow for OAuth authentication.
 * See: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
 */

import { githubAccountService } from "lib/db/github-account-service";
import { githubConfigService } from "lib/db/github-config-service";
import logger from "logger";

// GitHub API URLs
const GITHUB_DEVICE_CODE_URL = "https://github.com/login/device/code";
const GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_API_URL = "https://api.github.com";

// Default polling interval (in seconds)
const DEFAULT_POLLING_INTERVAL = 5;

// Device code response interface
interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

// Access token response interface
interface AccessTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  refresh_token?: string;
  expires_in?: number;
}

/**
 * Get GitHub OAuth configuration
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
    };
  }

  // Fallback to environment variables
  return {
    clientId: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
  };
}

/**
 * Request a device code from GitHub
 * @returns Device code response
 */
export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const config = await getGitHubConfig();

  if (!config.clientId) {
    throw new Error("GitHub Client ID is not configured");
  }

  const response = await fetch(GITHUB_DEVICE_CODE_URL, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: config.clientId,
      scope: "repo read:user user:email",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to request device code: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Poll for an access token using the device code
 * @param deviceCode The device code from the initial request
 * @param interval Polling interval in seconds
 * @param onPoll Callback function called on each poll attempt
 * @returns Access token response
 */
export async function pollForAccessToken(
  deviceCode: string,
  interval: number = DEFAULT_POLLING_INTERVAL,
  onPoll?: (attempt: number) => void
): Promise<AccessTokenResponse> {
  const config = await getGitHubConfig();
  let attempt = 0;
  
  // Convert interval to milliseconds
  const intervalMs = interval * 1000;

  while (true) {
    attempt++;
    
    // Call the onPoll callback if provided
    if (onPoll) {
      onPoll(attempt);
    }
    
    // Wait for the specified interval
    await new Promise(resolve => setTimeout(resolve, intervalMs));
    
    // Poll for the access token
    const response = await fetch(GITHUB_ACCESS_TOKEN_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    if (!response.ok) {
      logger.error(`Failed to poll for access token: ${response.statusText}`);
      continue;
    }

    const data = await response.json();
    
    // Check for errors
    if (data.error) {
      // authorization_pending means the user hasn't authorized yet
      if (data.error === "authorization_pending") {
        continue;
      }
      
      // slow_down means we need to increase the interval
      if (data.error === "slow_down") {
        interval += 5;
        continue;
      }
      
      // expired_token or access_denied are terminal errors
      if (data.error === "expired_token" || data.error === "access_denied") {
        throw new Error(`Authentication error: ${data.error_description || data.error}`);
      }
      
      // For any other error, log and continue
      logger.error(`Error polling for access token: ${data.error_description || data.error}`);
      continue;
    }
    
    // If we got an access token, return it
    if (data.access_token) {
      return data;
    }
  }
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
 * Complete the device flow authentication process
 * @param userId User ID to associate with the GitHub account
 * @returns The created or updated GitHub account
 */
export async function completeDeviceFlowAuth(userId: string) {
  try {
    // Step 1: Request a device code
    const deviceCodeResponse = await requestDeviceCode();
    
    // Step 2: Return the verification info to display to the user
    return {
      userCode: deviceCodeResponse.user_code,
      verificationUri: deviceCodeResponse.verification_uri,
      expiresIn: deviceCodeResponse.expires_in,
      deviceCode: deviceCodeResponse.device_code,
      interval: deviceCodeResponse.interval,
    };
  } catch (error) {
    logger.error("Error in device flow authentication:", error);
    throw error;
  }
}

/**
 * Poll for access token and save GitHub account
 * @param userId User ID to associate with the GitHub account
 * @param deviceCode Device code from the initial request
 * @param interval Polling interval in seconds
 * @param onPoll Callback function called on each poll attempt
 * @returns The created or updated GitHub account
 */
export async function pollAndSaveGitHubAccount(
  userId: string,
  deviceCode: string,
  interval: number = DEFAULT_POLLING_INTERVAL,
  onPoll?: (attempt: number) => void
) {
  try {
    // Step 1: Poll for access token
    const tokenResponse = await pollForAccessToken(deviceCode, interval, onPoll);
    
    // Step 2: Get GitHub user information
    const githubUser = await getGitHubUser(tokenResponse.access_token);
    
    // Step 3: Calculate token expiration if provided
    let expiresAt: Date | undefined;
    if (tokenResponse.expires_in) {
      expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);
    }
    
    // Step 4: Check if the user already has a GitHub account linked
    const existingAccount = await githubAccountService.getAccountByUserId(userId);
    
    if (existingAccount) {
      // Update existing account
      await githubAccountService.updateAccount(existingAccount.id, {
        username: githubUser.login,
        name: githubUser.name,
        email: githubUser.email,
        avatarUrl: githubUser.avatar_url,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || existingAccount.refreshToken,
        tokenType: tokenResponse.token_type,
        scope: tokenResponse.scope,
        expiresAt,
        isActive: true,
      });
      
      return {
        success: true,
        account: await githubAccountService.getAccountById(existingAccount.id),
        message: "GitHub account updated successfully",
      };
    } else {
      // Create new account
      const newAccount = await githubAccountService.createAccount({
        userId,
        githubId: githubUser.id.toString(),
        username: githubUser.login,
        name: githubUser.name,
        email: githubUser.email,
        avatarUrl: githubUser.avatar_url,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        tokenType: tokenResponse.token_type,
        scope: tokenResponse.scope,
        expiresAt,
      });
      
      return {
        success: true,
        account: newAccount,
        message: "GitHub account created successfully",
      };
    }
  } catch (error) {
    logger.error("Error in device flow authentication:", error);
    throw error;
  }
}
