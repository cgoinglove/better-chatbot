/**
 * Git Service
 * 
 * This service handles Git operations like cloning repositories.
 */

import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import logger from 'logger';
import { githubAccountService } from 'lib/db/github-account-service';
import { githubService } from 'lib/db/github-service';

const execAsync = promisify(exec);

// Base directory for cloned repositories
const BASE_REPOS_DIR = process.env.GITHUB_REPOS_DIR || path.join(process.cwd(), 'github-repos');

/**
 * Clone progress event
 */
export interface CloneProgressEvent {
  type: 'progress' | 'error' | 'complete';
  message: string;
  progress?: number; // 0-100
  error?: Error;
}

/**
 * Clone repository options
 */
export interface CloneOptions {
  branch?: string;
  depth?: number;
  onProgress?: (event: CloneProgressEvent) => void;
}

/**
 * Clone a GitHub repository
 * @param userId User ID
 * @param repoOwner Repository owner
 * @param repoName Repository name
 * @param options Clone options
 * @returns Path to the cloned repository
 */
export async function cloneRepository(
  userId: string,
  repoOwner: string,
  repoName: string,
  options: CloneOptions = {}
): Promise<string> {
  try {
    // Get GitHub account for the user
    const account = await githubAccountService.getAccountByUserId(userId);
    
    if (!account) {
      throw new Error('No GitHub account linked');
    }
    
    // Create base directory if it doesn't exist
    const userReposDir = path.join(BASE_REPOS_DIR, userId);
    await fs.mkdir(userReposDir, { recursive: true });
    
    // Repository directory
    const repoDir = path.join(userReposDir, `${repoOwner}_${repoName}`);
    
    // Check if directory already exists
    try {
      await fs.access(repoDir);
      
      // Directory exists, check if it's a Git repository
      try {
        await execAsync('git status', { cwd: repoDir });
        
        // It's a Git repository, pull latest changes
        options.onProgress?.({ type: 'progress', message: 'Repository already exists, pulling latest changes...', progress: 10 });
        
        const branchArg = options.branch ? ` origin ${options.branch}` : '';
        await execAsync(`git pull${branchArg}`, { cwd: repoDir });
        
        options.onProgress?.({ type: 'complete', message: 'Repository updated successfully', progress: 100 });
        
        return repoDir;
      } catch (error) {
        // Not a Git repository, remove directory and clone
        await fs.rm(repoDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Directory doesn't exist, proceed with clone
    }
    
    // Prepare clone command
    let cloneUrl = `https://github.com/${repoOwner}/${repoName}.git`;
    
    // Add authentication if we have a token
    if (account.accessToken) {
      cloneUrl = `https://${account.accessToken}@github.com/${repoOwner}/${repoName}.git`;
    }
    
    // Build clone command with options
    let cloneCommand = `git clone ${cloneUrl} "${repoDir}"`;
    
    if (options.branch) {
      cloneCommand += ` --branch ${options.branch}`;
    }
    
    if (options.depth) {
      cloneCommand += ` --depth ${options.depth}`;
    }
    
    // Start cloning
    options.onProgress?.({ type: 'progress', message: 'Starting repository clone...', progress: 0 });
    
    const process = exec(cloneCommand);
    
    // Handle progress
    if (options.onProgress) {
      process.stdout?.on('data', (data) => {
        options.onProgress?.({ type: 'progress', message: data.toString(), progress: 50 });
      });
      
      process.stderr?.on('data', (data) => {
        // Git sends progress to stderr
        const message = data.toString();
        
        // Try to parse progress percentage
        let progress = 50;
        const match = message.match(/Receiving objects:\s+(\d+)%/);
        if (match && match[1]) {
          progress = parseInt(match[1], 10);
        }
        
        options.onProgress?.({ type: 'progress', message, progress });
      });
    }
    
    // Wait for clone to complete
    return new Promise((resolve, reject) => {
      process.on('close', async (code) => {
        if (code === 0) {
          options.onProgress?.({ type: 'complete', message: 'Repository cloned successfully', progress: 100 });
          
          // Add repository to database
          try {
            const repo = await githubService.insertRepository({
              name: `${repoOwner}/${repoName}`,
              path: repoDir,
              description: `Cloned from GitHub: ${repoOwner}/${repoName}`,
              isEnabled: true,
              userId,
            });
            
            // Index the repository
            await githubService.indexRepository(repo.id);
          } catch (error) {
            logger.error('Error adding repository to database:', error);
          }
          
          resolve(repoDir);
        } else {
          const error = new Error(`Clone failed with code ${code}`);
          options.onProgress?.({ type: 'error', message: `Clone failed with code ${code}`, error });
          reject(error);
        }
      });
      
      process.on('error', (error) => {
        options.onProgress?.({ type: 'error', message: error.message, error });
        reject(error);
      });
    });
  } catch (error) {
    logger.error('Error cloning repository:', error);
    throw error;
  }
}

/**
 * Get branches for a local repository
 * @param repoPath Path to the repository
 * @returns List of branches
 */
export async function getLocalBranches(repoPath: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync('git branch -a', { cwd: repoPath });
    
    return stdout
      .split('\n')
      .map(branch => branch.trim())
      .filter(branch => branch.length > 0)
      .map(branch => branch.replace(/^\*\s+/, '')) // Remove asterisk from current branch
      .map(branch => branch.replace(/^remotes\/origin\//, '')); // Remove remote prefix
  } catch (error) {
    logger.error('Error getting local branches:', error);
    throw error;
  }
}

/**
 * Checkout a branch in a local repository
 * @param repoPath Path to the repository
 * @param branch Branch name
 */
export async function checkoutBranch(repoPath: string, branch: string): Promise<void> {
  try {
    // Check if branch exists locally
    const { stdout: localBranches } = await execAsync('git branch', { cwd: repoPath });
    
    if (localBranches.includes(branch)) {
      // Branch exists locally, just checkout
      await execAsync(`git checkout ${branch}`, { cwd: repoPath });
    } else {
      // Check if branch exists remotely
      const { stdout: remoteBranches } = await execAsync('git branch -r', { cwd: repoPath });
      
      if (remoteBranches.includes(`origin/${branch}`)) {
        // Branch exists remotely, checkout tracking branch
        await execAsync(`git checkout -b ${branch} origin/${branch}`, { cwd: repoPath });
      } else {
        throw new Error(`Branch ${branch} not found`);
      }
    }
  } catch (error) {
    logger.error('Error checking out branch:', error);
    throw error;
  }
}
