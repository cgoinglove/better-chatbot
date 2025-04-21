/**
 * Local GitHub Repository Scanner
 * 
 * This module provides functionality to scan the local system for GitHub repositories.
 * It can detect:
 * 1. Repositories in common locations
 * 2. GitHub Desktop app repositories
 * 3. Custom repository locations
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from 'logger';
import os from 'os';

const execAsync = promisify(exec);

// Interface for repository information
export interface LocalRepository {
  name: string;
  path: string;
  remote?: string;
  branch?: string;
  lastCommit?: {
    hash: string;
    message: string;
    date: string;
  };
  isGitHubDesktop?: boolean;
}

/**
 * Get common locations where repositories might be stored
 */
function getCommonRepoLocations(): string[] {
  const homeDir = os.homedir();
  
  // Common locations based on operating system
  const locations = [
    path.join(homeDir, 'Documents'),
    path.join(homeDir, 'Projects'),
    path.join(homeDir, 'dev'),
    path.join(homeDir, 'Development'),
    path.join(homeDir, 'code'),
    path.join(homeDir, 'src'),
    path.join(homeDir, 'workspace'),
  ];
  
  // Add GitHub Desktop locations based on OS
  if (process.platform === 'win32') {
    locations.push(path.join(homeDir, 'Documents', 'GitHub'));
    locations.push(path.join(homeDir, 'source', 'repos'));
  } else if (process.platform === 'darwin') {
    locations.push(path.join(homeDir, 'Documents', 'GitHub'));
  } else {
    locations.push(path.join(homeDir, 'GitHub'));
  }
  
  return locations.filter(loc => fs.existsSync(loc));
}

/**
 * Get GitHub Desktop repository locations
 */
async function getGitHubDesktopLocations(): Promise<string[]> {
  try {
    let configPath = '';
    
    // GitHub Desktop config location based on OS
    if (process.platform === 'win32') {
      configPath = path.join(os.homedir(), 'AppData', 'Roaming', 'GitHub Desktop', 'repositories.json');
    } else if (process.platform === 'darwin') {
      configPath = path.join(os.homedir(), 'Library', 'Application Support', 'GitHub Desktop', 'repositories.json');
    } else {
      configPath = path.join(os.homedir(), '.config', 'GitHub Desktop', 'repositories.json');
    }
    
    // Check if config file exists
    if (!fs.existsSync(configPath)) {
      return [];
    }
    
    // Read and parse config file
    const configData = await fs.promises.readFile(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    // Extract repository paths
    if (config && config.repositories) {
      return config.repositories.map((repo: any) => repo.path);
    }
    
    return [];
  } catch (error) {
    logger.error('Error getting GitHub Desktop locations:', error);
    return [];
  }
}

/**
 * Check if a directory is a Git repository
 */
async function isGitRepository(dirPath: string): Promise<boolean> {
  try {
    const gitDir = path.join(dirPath, '.git');
    return fs.existsSync(gitDir) && fs.statSync(gitDir).isDirectory();
  } catch (error) {
    return false;
  }
}

/**
 * Check if a Git repository has a GitHub remote
 */
async function hasGitHubRemote(repoPath: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync('git remote -v', { cwd: repoPath });
    
    // Check if any remote contains github.com
    if (stdout.includes('github.com')) {
      // Extract the GitHub remote URL
      const remoteMatch = stdout.match(/origin\s+(https:\/\/github\.com\/[^\s]+|git@github\.com:[^\s]+)/);
      return remoteMatch ? remoteMatch[1] : null;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get repository information
 */
async function getRepositoryInfo(repoPath: string, isGitHubDesktop = false): Promise<LocalRepository | null> {
  try {
    // Check if it's a Git repository
    if (!await isGitRepository(repoPath)) {
      return null;
    }
    
    // Check if it has a GitHub remote
    const remote = await hasGitHubRemote(repoPath);
    if (!remote) {
      return null;
    }
    
    // Get repository name
    const name = path.basename(repoPath);
    
    // Get current branch
    const { stdout: branchOutput } = await execAsync('git branch --show-current', { cwd: repoPath });
    const branch = branchOutput.trim();
    
    // Get last commit
    const { stdout: commitOutput } = await execAsync(
      'git log -1 --pretty=format:"%H|%s|%cd"', 
      { cwd: repoPath }
    );
    
    let lastCommit;
    if (commitOutput) {
      const [hash, message, date] = commitOutput.split('|');
      lastCommit = { hash, message, date };
    }
    
    return {
      name,
      path: repoPath,
      remote,
      branch,
      lastCommit,
      isGitHubDesktop
    };
  } catch (error) {
    logger.error(`Error getting repository info for ${repoPath}:`, error);
    return null;
  }
}

/**
 * Scan directories recursively for Git repositories
 */
async function scanDirectoriesForRepos(directories: string[], maxDepth = 3): Promise<LocalRepository[]> {
  const repositories: LocalRepository[] = [];
  
  // Process each directory
  for (const dir of directories) {
    await scanDirectory(dir, 0, maxDepth, repositories);
  }
  
  return repositories;
}

/**
 * Scan a directory recursively for Git repositories
 */
async function scanDirectory(
  dirPath: string, 
  currentDepth: number, 
  maxDepth: number, 
  repositories: LocalRepository[]
): Promise<void> {
  // Stop if we've reached max depth
  if (currentDepth > maxDepth) {
    return;
  }
  
  try {
    // Check if current directory is a GitHub repository
    if (await isGitRepository(dirPath)) {
      const repoInfo = await getRepositoryInfo(dirPath);
      if (repoInfo) {
        repositories.push(repoInfo);
      }
      
      // Don't scan subdirectories of Git repositories
      return;
    }
    
    // Scan subdirectories
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const subDirPath = path.join(dirPath, entry.name);
        await scanDirectory(subDirPath, currentDepth + 1, maxDepth, repositories);
      }
    }
  } catch (error) {
    // Silently ignore permission errors
    if (error instanceof Error && 'code' in error && error.code !== 'EACCES') {
      logger.error(`Error scanning directory ${dirPath}:`, error);
    }
  }
}

/**
 * Scan for local GitHub repositories
 */
export async function scanLocalRepositories(): Promise<LocalRepository[]> {
  try {
    logger.info('Scanning for local GitHub repositories...');
    
    // Get common locations
    const commonLocations = getCommonRepoLocations();
    logger.info(`Found ${commonLocations.length} common locations to scan`);
    
    // Get GitHub Desktop locations
    const desktopLocations = await getGitHubDesktopLocations();
    logger.info(`Found ${desktopLocations.length} GitHub Desktop repositories`);
    
    // Scan common locations
    const commonRepos = await scanDirectoriesForRepos(commonLocations);
    logger.info(`Found ${commonRepos.length} repositories in common locations`);
    
    // Process GitHub Desktop repositories
    const desktopRepos: LocalRepository[] = [];
    for (const location of desktopLocations) {
      const repoInfo = await getRepositoryInfo(location, true);
      if (repoInfo) {
        desktopRepos.push(repoInfo);
      }
    }
    logger.info(`Processed ${desktopRepos.length} GitHub Desktop repositories`);
    
    // Combine and deduplicate repositories
    const allRepos = [...desktopRepos, ...commonRepos];
    const uniqueRepos = allRepos.filter((repo, index, self) => 
      index === self.findIndex(r => r.path === repo.path)
    );
    
    logger.info(`Found ${uniqueRepos.length} unique local GitHub repositories`);
    return uniqueRepos;
  } catch (error) {
    logger.error('Error scanning for local repositories:', error);
    return [];
  }
}
