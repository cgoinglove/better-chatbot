"use server";

import { githubAccountService } from "lib/db/github-account-service";
import { getUserRepositories } from "lib/github/github-auth";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export interface GitHubAccountInfo {
  id: string;
  username: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GitHubRemoteRepository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  language: string;
  private: boolean;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
}

export async function getGitHubAccountAction(): Promise<GitHubAccountInfo | null> {
  try {
    const user = getMockUserSession();
    if (!user) return null;
    
    const account = await githubAccountService.getAccountByUserId(user.id);
    
    if (!account) return null;
    
    return {
      id: account.id,
      username: account.username,
      name: account.name,
      email: account.email,
      avatarUrl: account.avatarUrl,
      isActive: account.isActive,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  } catch (error) {
    logger.error("Error fetching GitHub account:", error);
    return null;
  }
}

export async function unlinkGitHubAccountAction(): Promise<boolean> {
  try {
    const user = getMockUserSession();
    if (!user) return false;
    
    const account = await githubAccountService.getAccountByUserId(user.id);
    
    if (!account) return false;
    
    await githubAccountService.deactivateAccount(account.id);
    
    return true;
  } catch (error) {
    logger.error("Error unlinking GitHub account:", error);
    return false;
  }
}

export async function getRemoteRepositoriesAction(): Promise<GitHubRemoteRepository[]> {
  try {
    const user = getMockUserSession();
    if (!user) return [];
    
    const account = await githubAccountService.getAccountByUserId(user.id);
    
    if (!account) return [];
    
    const repositories = await getUserRepositories(account.accessToken);
    
    return repositories;
  } catch (error) {
    logger.error("Error fetching remote repositories:", error);
    return [];
  }
}
