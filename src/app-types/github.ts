/**
 * Represents a GitHub repository in the system
 */
export type GitHubRepository = {
  id: string;
  name: string;
  path: string;
  description?: string;
  isEnabled: boolean;
  lastIndexed?: Date;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Partial repository type for updates and creation
 */
export type GitHubRepositoryUpdate = Partial<Omit<GitHubRepository, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;

/**
 * Represents an indexed file in a GitHub repository
 */
export type GitHubFileIndex = {
  id: string;
  repositoryId: string;
  filePath: string;
  content?: string;
  language?: string;
  lastIndexed: Date;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Type for file search results
 */
export type GitHubFileSearchResult = {
  id: string;
  repositoryId: string;
  repositoryName: string;
  filePath: string;
  language?: string;
  snippet?: string;
  score: number;
};
