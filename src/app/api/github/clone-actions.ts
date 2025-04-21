"use server";

import { cloneRepository, getLocalBranches, checkoutBranch } from "lib/github/git-service";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export interface CloneResult {
  success: boolean;
  path?: string;
  message: string;
  error?: string;
}

export async function cloneRepositoryAction(
  owner: string,
  name: string,
  branch?: string,
  depth?: number
): Promise<CloneResult> {
  try {
    const user = getMockUserSession();
    if (!user) {
      return {
        success: false,
        message: "Unauthorized",
        error: "User not logged in",
      };
    }
    
    if (!owner || !name) {
      return {
        success: false,
        message: "Repository owner and name are required",
        error: "Missing required parameters",
      };
    }
    
    // Clone the repository
    const repoPath = await cloneRepository(user.id, owner, name, {
      branch,
      depth,
    });
    
    return {
      success: true,
      path: repoPath,
      message: `Repository ${owner}/${name} cloned successfully`,
    };
  } catch (error: any) {
    logger.error("Error cloning repository:", error);
    return {
      success: false,
      message: "Failed to clone repository",
      error: error.message,
    };
  }
}

export async function getLocalBranchesAction(repoPath: string): Promise<string[]> {
  try {
    const user = getMockUserSession();
    if (!user) {
      return [];
    }
    
    return await getLocalBranches(repoPath);
  } catch (error) {
    logger.error("Error getting local branches:", error);
    return [];
  }
}

export async function checkoutBranchAction(
  repoPath: string,
  branch: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = getMockUserSession();
    if (!user) {
      return {
        success: false,
        message: "Unauthorized",
      };
    }
    
    await checkoutBranch(repoPath, branch);
    
    return {
      success: true,
      message: `Switched to branch ${branch}`,
    };
  } catch (error: any) {
    logger.error("Error checking out branch:", error);
    return {
      success: false,
      message: error.message || "Failed to checkout branch",
    };
  }
}
