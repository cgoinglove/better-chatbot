"use server";

import { GitHubRepository, GitHubRepositoryUpdate, GitHubFileSearchResult } from "app-types/github";
import { githubService } from "lib/db/github-service";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export async function selectRepositoriesByUserIdAction(): Promise<GitHubRepository[]> {
  try {
    const userId = getMockUserSession().id;
    return await githubService.selectRepositoriesByUserId(userId);
  } catch (error) {
    logger.error("Error fetching GitHub repositories:", error);
    return [];
  }
}

export async function selectRepositoryAction(id: string): Promise<GitHubRepository | null> {
  try {
    const repository = await githubService.selectRepository(id);
    
    if (!repository) {
      return null;
    }
    
    // Verify the repository belongs to the current user
    const userId = getMockUserSession().id;
    if (repository.userId !== userId) {
      return null;
    }
    
    return repository;
  } catch (error) {
    logger.error("Error fetching GitHub repository:", error);
    return null;
  }
}

export async function createRepositoryAction(repository: Omit<GitHubRepository, "id" | "userId" | "createdAt" | "updatedAt" | "lastIndexed">): Promise<GitHubRepository | null> {
  try {
    const userId = getMockUserSession().id;
    
    const newRepository = await githubService.insertRepository({
      ...repository,
      userId,
    });
    
    return newRepository;
  } catch (error) {
    logger.error("Error creating GitHub repository:", error);
    return null;
  }
}

export async function updateRepositoryAction(id: string, update: GitHubRepositoryUpdate): Promise<GitHubRepository | null> {
  try {
    // Verify the repository exists and belongs to the current user
    const existingRepository = await githubService.selectRepository(id);
    if (!existingRepository) {
      return null;
    }
    
    const userId = getMockUserSession().id;
    if (existingRepository.userId !== userId) {
      return null;
    }
    
    const updatedRepository = await githubService.updateRepository(id, update);
    
    return updatedRepository;
  } catch (error) {
    logger.error("Error updating GitHub repository:", error);
    return null;
  }
}

export async function deleteRepositoryAction(id: string): Promise<boolean> {
  try {
    // Verify the repository exists and belongs to the current user
    const existingRepository = await githubService.selectRepository(id);
    if (!existingRepository) {
      return false;
    }
    
    const userId = getMockUserSession().id;
    if (existingRepository.userId !== userId) {
      return false;
    }
    
    return await githubService.deleteRepository(id);
  } catch (error) {
    logger.error("Error deleting GitHub repository:", error);
    return false;
  }
}

export async function indexRepositoryAction(id: string): Promise<{ success: boolean; message: string; indexedCount?: number }> {
  try {
    // Verify the repository exists and belongs to the current user
    const existingRepository = await githubService.selectRepository(id);
    if (!existingRepository) {
      return { success: false, message: "Repository not found" };
    }
    
    const userId = getMockUserSession().id;
    if (existingRepository.userId !== userId) {
      return { success: false, message: "Unauthorized" };
    }
    
    // Index the repository
    const indexedCount = await githubService.indexRepository(id);
    
    return { 
      success: true, 
      message: `Successfully indexed ${indexedCount} files`,
      indexedCount
    };
  } catch (error: any) {
    logger.error("Error indexing GitHub repository:", error);
    return { success: false, message: error.message || "Failed to index repository" };
  }
}

export async function searchFilesAction(query: string, repositoryId?: string): Promise<GitHubFileSearchResult[]> {
  try {
    if (!query) {
      return [];
    }
    
    const userId = getMockUserSession().id;
    
    // If repositoryId is provided, verify it belongs to the user
    if (repositoryId) {
      const repository = await githubService.selectRepository(repositoryId);
      if (!repository || repository.userId !== userId) {
        return [];
      }
    }
    
    return await githubService.searchFiles(
      repositoryId || null,
      query,
      userId
    );
  } catch (error) {
    logger.error("Error searching GitHub files:", error);
    return [];
  }
}
