import { githubAccountService } from "lib/db/github-account-service";
import { exchangeCodeForToken, getGitHubUser } from "lib/github/github-auth";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export async function GET(request: Request) {
  try {
    // Get the authorization code and state from the URL
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    // Verify user is logged in and state matches
    const user = getMockUserSession();
    if (!user || user.id !== state) {
      return new Response("Unauthorized or invalid state", { status: 401 });
    }

    if (!code) {
      return new Response("Authorization code is missing", { status: 400 });
    }

    // Exchange code for access token
    const tokenResponse = await exchangeCodeForToken(code);

    // Get GitHub user information
    const githubUser = await getGitHubUser(tokenResponse.access_token);

    // Calculate token expiration if provided
    let expiresAt: Date | undefined;
    if (tokenResponse.expires_in) {
      expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);
    }

    // Check if the user already has a GitHub account linked
    const existingAccount = await githubAccountService.getAccountByUserId(
      user.id,
    );

    if (existingAccount) {
      // Update existing account
      await githubAccountService.updateAccount(existingAccount.id, {
        username: githubUser.login,
        name: githubUser.name,
        email: githubUser.email,
        avatarUrl: githubUser.avatar_url,
        accessToken: tokenResponse.access_token,
        refreshToken:
          tokenResponse.refresh_token || existingAccount.refreshToken,
        tokenType: tokenResponse.token_type,
        scope: tokenResponse.scope,
        expiresAt,
        isActive: true,
      });
    } else {
      // Create new account
      await githubAccountService.createAccount({
        userId: user.id,
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
    }

    // Redirect to GitHub page
    return Response.redirect(new URL("/github", request.url));
  } catch (error: any) {
    logger.error("Error handling GitHub callback:", error);
    return new Response(
      error.message || "Failed to complete GitHub authentication",
      { status: 500 },
    );
  }
}
