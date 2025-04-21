/**
 * GitHub API Middleware
 * 
 * This middleware handles token refresh for GitHub API requests.
 */

import { getValidAccessToken } from './github-auth';
import logger from 'logger';

/**
 * GitHub API request options
 */
export interface GitHubApiOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

/**
 * Make a GitHub API request with automatic token refresh
 * @param userId User ID
 * @param endpoint API endpoint (without base URL)
 * @param options Request options
 * @returns Response data
 */
export async function githubApiRequest<T = any>(
  userId: string,
  endpoint: string,
  options: GitHubApiOptions = {}
): Promise<T> {
  try {
    // Get a valid access token
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      throw new Error('No valid GitHub access token available');
    }
    
    // Prepare request options
    const requestOptions: RequestInit = {
      method: options.method || 'GET',
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        ...(options.headers || {}),
      },
    };
    
    // Add body if provided
    if (options.body) {
      requestOptions.body = JSON.stringify(options.body);
      (requestOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
    }
    
    // Make the request
    const baseUrl = 'https://api.github.com';
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    logger.error(`GitHub API request failed for endpoint ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Get user repositories with automatic token refresh
 * @param userId User ID
 * @param options Additional options
 * @returns List of repositories
 */
export async function getUserRepositories(
  userId: string,
  options: { sort?: 'created' | 'updated' | 'pushed' | 'full_name'; per_page?: number; page?: number } = {}
): Promise<any[]> {
  const queryParams = new URLSearchParams();
  
  if (options.sort) queryParams.append('sort', options.sort);
  if (options.per_page) queryParams.append('per_page', options.per_page.toString());
  if (options.page) queryParams.append('page', options.page.toString());
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  return githubApiRequest(userId, `/user/repos${queryString}`);
}

/**
 * Get repository branches with automatic token refresh
 * @param userId User ID
 * @param owner Repository owner
 * @param repo Repository name
 * @returns List of branches
 */
export async function getRepositoryBranches(
  userId: string,
  owner: string,
  repo: string
): Promise<any[]> {
  return githubApiRequest(userId, `/repos/${owner}/${repo}/branches`);
}

/**
 * Get repository content with automatic token refresh
 * @param userId User ID
 * @param owner Repository owner
 * @param repo Repository name
 * @param path File path
 * @param ref Branch or commit reference
 * @returns Repository content
 */
export async function getRepositoryContent(
  userId: string,
  owner: string,
  repo: string,
  path: string = '',
  ref?: string
): Promise<any> {
  const queryParams = ref ? `?ref=${encodeURIComponent(ref)}` : '';
  return githubApiRequest(userId, `/repos/${owner}/${repo}/contents/${path}${queryParams}`);
}

/**
 * Search code in GitHub repositories with automatic token refresh
 * @param userId User ID
 * @param query Search query
 * @param options Additional options
 * @returns Search results
 */
export async function searchCode(
  userId: string,
  query: string,
  options: { repo?: string; language?: string; path?: string; } = {}
): Promise<any> {
  let q = query;
  
  if (options.repo) q += ` repo:${options.repo}`;
  if (options.language) q += ` language:${options.language}`;
  if (options.path) q += ` path:${options.path}`;
  
  return githubApiRequest(userId, `/search/code?q=${encodeURIComponent(q)}`);
}

/**
 * Get repository commits with automatic token refresh
 * @param userId User ID
 * @param owner Repository owner
 * @param repo Repository name
 * @param options Additional options
 * @returns List of commits
 */
export async function getRepositoryCommits(
  userId: string,
  owner: string,
  repo: string,
  options: { sha?: string; path?: string; author?: string; since?: string; until?: string; per_page?: number; page?: number } = {}
): Promise<any[]> {
  const queryParams = new URLSearchParams();
  
  if (options.sha) queryParams.append('sha', options.sha);
  if (options.path) queryParams.append('path', options.path);
  if (options.author) queryParams.append('author', options.author);
  if (options.since) queryParams.append('since', options.since);
  if (options.until) queryParams.append('until', options.until);
  if (options.per_page) queryParams.append('per_page', options.per_page.toString());
  if (options.page) queryParams.append('page', options.page.toString());
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  return githubApiRequest(userId, `/repos/${owner}/${repo}/commits${queryString}`);
}

/**
 * Get commit details with automatic token refresh
 * @param userId User ID
 * @param owner Repository owner
 * @param repo Repository name
 * @param ref Commit reference
 * @returns Commit details
 */
export async function getCommit(
  userId: string,
  owner: string,
  repo: string,
  ref: string
): Promise<any> {
  return githubApiRequest(userId, `/repos/${owner}/${repo}/commits/${ref}`);
}

/**
 * Get repository pull requests with automatic token refresh
 * @param userId User ID
 * @param owner Repository owner
 * @param repo Repository name
 * @param options Additional options
 * @returns List of pull requests
 */
export async function getRepositoryPullRequests(
  userId: string,
  owner: string,
  repo: string,
  options: { state?: 'open' | 'closed' | 'all'; head?: string; base?: string; sort?: 'created' | 'updated' | 'popularity' | 'long-running'; direction?: 'asc' | 'desc'; per_page?: number; page?: number } = {}
): Promise<any[]> {
  const queryParams = new URLSearchParams();
  
  if (options.state) queryParams.append('state', options.state);
  if (options.head) queryParams.append('head', options.head);
  if (options.base) queryParams.append('base', options.base);
  if (options.sort) queryParams.append('sort', options.sort);
  if (options.direction) queryParams.append('direction', options.direction);
  if (options.per_page) queryParams.append('per_page', options.per_page.toString());
  if (options.page) queryParams.append('page', options.page.toString());
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  return githubApiRequest(userId, `/repos/${owner}/${repo}/pulls${queryString}`);
}

/**
 * Get pull request details with automatic token refresh
 * @param userId User ID
 * @param owner Repository owner
 * @param repo Repository name
 * @param pullNumber Pull request number
 * @returns Pull request details
 */
export async function getPullRequest(
  userId: string,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<any> {
  return githubApiRequest(userId, `/repos/${owner}/${repo}/pulls/${pullNumber}`);
}

/**
 * Get pull request comments with automatic token refresh
 * @param userId User ID
 * @param owner Repository owner
 * @param repo Repository name
 * @param pullNumber Pull request number
 * @returns List of comments
 */
export async function getPullRequestComments(
  userId: string,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<any[]> {
  return githubApiRequest(userId, `/repos/${owner}/${repo}/pulls/${pullNumber}/comments`);
}

/**
 * Create a pull request comment with automatic token refresh
 * @param userId User ID
 * @param owner Repository owner
 * @param repo Repository name
 * @param pullNumber Pull request number
 * @param body Comment body
 * @param options Additional options
 * @returns Created comment
 */
export async function createPullRequestComment(
  userId: string,
  owner: string,
  repo: string,
  pullNumber: number,
  body: string,
  options: { commit_id?: string; path?: string; position?: number; line?: number; side?: 'LEFT' | 'RIGHT' } = {}
): Promise<any> {
  return githubApiRequest(
    userId,
    `/repos/${owner}/${repo}/pulls/${pullNumber}/comments`,
    {
      method: 'POST',
      body: {
        body,
        ...options,
      },
    }
  );
}
