import { githubAccountService } from "lib/db/github-account-service";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export async function GET(request: Request) {
  try {
    // Verify user is logged in
    const user = getMockUserSession();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    
    // Get GitHub account for the user
    const account = await githubAccountService.getAccountByUserId(user.id);
    
    if (!account) {
      return new Response("No GitHub account linked", { status: 404 });
    }
    
    // Return account information (excluding sensitive data)
    return Response.json({
      id: account.id,
      username: account.username,
      name: account.name,
      email: account.email,
      avatarUrl: account.avatarUrl,
      isActive: account.isActive,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    });
  } catch (error: any) {
    logger.error("Error fetching GitHub account:", error);
    return new Response(error.message || "Failed to fetch GitHub account", { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    // Verify user is logged in
    const user = getMockUserSession();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    
    // Get GitHub account for the user
    const account = await githubAccountService.getAccountByUserId(user.id);
    
    if (!account) {
      return new Response("No GitHub account linked", { status: 404 });
    }
    
    // Deactivate the account (don't delete it completely)
    await githubAccountService.deactivateAccount(account.id);
    
    return new Response(null, { status: 204 });
  } catch (error: any) {
    logger.error("Error unlinking GitHub account:", error);
    return new Response(error.message || "Failed to unlink GitHub account", { status: 500 });
  }
}
