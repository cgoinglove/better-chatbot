// GitHub Repository Scanner
// This script uses ES modules syntax to scan for GitHub repositories

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Repository interface
class Repository {
  constructor(name, repoPath, remote = '', branch = '', lastCommit = {}) {
    this.name = name;
    this.path = repoPath;
    this.remote = remote;
    this.branch = branch;
    this.lastCommit = lastCommit;
    this.isGitHubDesktop = false;
  }
}

// Function to check if a directory is a Git repository
function isGitRepo(dirPath) {
  try {
    return fs.existsSync(path.join(dirPath, '.git'));
  } catch (error) {
    return false;
  }
}

// Function to check if a Git repository has a GitHub remote
function hasGitHubRemote(repoPath) {
  try {
    const remotes = execSync('git remote -v', { 
      cwd: repoPath, 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return remotes.includes('github.com');
  } catch (error) {
    return false;
  }
}

// Function to get repository details
function getRepoDetails(repoPath) {
  try {
    const name = path.basename(repoPath);
    
    // Get remote URL
    let remoteUrl = '';
    try {
      remoteUrl = execSync('git config --get remote.origin.url', { 
        cwd: repoPath, 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();
    } catch (error) {
      // No remote or not set
    }
    
    // Get current branch
    let branch = '';
    try {
      branch = execSync('git rev-parse --abbrev-ref HEAD', { 
        cwd: repoPath, 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();
    } catch (error) {
      // Not on a branch
    }
    
    // Get last commit
    let lastCommit = {};
    try {
      const commitInfo = execSync('git log -1 --pretty=format:"%h|%s|%cr"', { 
        cwd: repoPath, 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();
      const [hash, message, date] = commitInfo.split('|');
      lastCommit = { hash, message, date };
    } catch (error) {
      // No commits
    }
    
    return new Repository(name, repoPath, remoteUrl, branch, lastCommit);
  } catch (error) {
    return null;
  }
}

// Get common locations where repositories might be stored
function getCommonRepoLocations() {
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

// Get GitHub Desktop repository locations
function getGitHubDesktopLocations() {
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
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    // Extract repository paths
    if (config && config.repositories) {
      return config.repositories.map(repo => repo.path);
    }
    
    return [];
  } catch (error) {
    return [];
  }
}

// Scan directories for Git repositories
function scanDirectoriesForRepos(directories, maxDepth = 2) {
  const repositories = [];
  
  const scanDirectory = (dirPath, currentDepth) => {
    // Stop if we've reached max depth
    if (currentDepth > maxDepth) {
      return;
    }
    
    try {
      // Check if current directory is a GitHub repository
      if (isGitRepo(dirPath) && hasGitHubRemote(dirPath)) {
        const repoInfo = getRepoDetails(dirPath);
        if (repoInfo) {
          repositories.push(repoInfo);
        }
        
        // Don't scan subdirectories of Git repositories
        return;
      }
      
      // Scan subdirectories
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const subDirPath = path.join(dirPath, entry.name);
          scanDirectory(subDirPath, currentDepth + 1);
        }
      }
    } catch (error) {
      // Silently ignore permission errors
    }
  };
  
  // Process each directory
  for (const dir of directories) {
    scanDirectory(dir, 0);
  }
  
  return repositories;
}

// Main function to scan for repositories
export function scanLocalRepositories() {
  // Get common locations
  const commonLocations = getCommonRepoLocations();
  
  // Get GitHub Desktop locations
  const desktopLocations = getGitHubDesktopLocations();
  
  // Scan common locations
  const commonRepos = scanDirectoriesForRepos(commonLocations);
  
  // Process GitHub Desktop repositories
  const desktopRepos = [];
  for (const location of desktopLocations) {
    if (isGitRepo(location) && hasGitHubRemote(location)) {
      const repoInfo = getRepoDetails(location);
      if (repoInfo) {
        repoInfo.isGitHubDesktop = true;
        desktopRepos.push(repoInfo);
      }
    }
  }
  
  // Combine and deduplicate repositories
  const allRepos = [...desktopRepos, ...commonRepos];
  const uniqueRepos = allRepos.filter((repo, index, self) => 
    index === self.findIndex(r => r.path === repo.path)
  );
  
  return uniqueRepos;
}

// Format repositories for display
export function formatRepositories(repositories) {
  let responseText = `Found ${repositories.length} GitHub repositories:\n\n`;
  
  if (repositories.length === 0) {
    responseText = "No GitHub repositories found on this system.";
  } else {
    repositories.forEach((repo, index) => {
      responseText += `${index + 1}. ${repo.name}\n`;
      responseText += `   Path: ${repo.path}\n`;
      if (repo.remote) responseText += `   Remote: ${repo.remote}\n`;
      if (repo.branch) responseText += `   Branch: ${repo.branch}\n`;
      if (repo.lastCommit && repo.lastCommit.hash) {
        responseText += `   Last Commit: ${repo.lastCommit.hash} - ${repo.lastCommit.message} (${repo.lastCommit.date})\n`;
      }
      if (repo.isGitHubDesktop) responseText += `   Managed by GitHub Desktop\n`;
      responseText += '\n';
    });
  }
  
  return responseText;
}

// Export the main function for direct use
export default function listGitHubRepositories() {
  try {
    const repositories = scanLocalRepositories();
    const formattedResponse = formatRepositories(repositories);
    
    return { 
      content: [{ 
        type: "text", 
        text: formattedResponse 
      }],
      repositories: repositories
    };
  } catch (error) {
    return { 
      content: [{ 
        type: "text", 
        text: `Error listing GitHub repositories: ${error.message || String(error)}` 
      }],
      error: error.message || String(error)
    };
  }
}
