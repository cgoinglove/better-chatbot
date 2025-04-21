// Standalone GitHub Repository Scanner
// This script scans your system for GitHub repositories and displays them
//
// Usage:
//   node scan-github-repos.js [options]
//
// Options:
//   --depth=N         Set scan depth (default: 2)
//   --dir=PATH        Add custom directory to scan
//   --format=json|text Output format (default: text)
//   --filter=KEYWORD  Filter repositories by name or URL
//   --help            Show this help message

import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",

  fg: {
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
  },

  bg: {
    black: "\x1b[40m",
    red: "\x1b[41m",
    green: "\x1b[42m",
    yellow: "\x1b[43m",
    blue: "\x1b[44m",
    magenta: "\x1b[45m",
    cyan: "\x1b[46m",
    white: "\x1b[47m",
  },
};

// Parse command line arguments
function parseArgs() {
  const args = {
    depth: 2,
    customDirs: [],
    format: "text",
    filter: "",
    help: false,
  };

  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith("--depth=")) {
      const depth = parseInt(arg.split("=")[1]);
      if (!isNaN(depth) && depth > 0) {
        args.depth = depth;
      }
    } else if (arg.startsWith("--dir=")) {
      const dir = arg.split("=")[1];
      if (dir && fs.existsSync(dir)) {
        args.customDirs.push(dir);
      } else {
        console.warn(
          `${colors.fg.yellow}Warning: Directory not found: ${dir}${colors.reset}`,
        );
      }
    } else if (arg.startsWith("--format=")) {
      const format = arg.split("=")[1].toLowerCase();
      if (["json", "text"].includes(format)) {
        args.format = format;
      }
    } else if (arg.startsWith("--filter=")) {
      args.filter = arg.split("=")[1].toLowerCase();
    } else if (arg === "--help") {
      args.help = true;
    }
  });

  return args;
}

// Function to check if a directory is a Git repository
function isGitRepo(dirPath) {
  try {
    return fs.existsSync(path.join(dirPath, ".git"));
  } catch (error) {
    return false;
  }
}

// Function to check if a Git repository has a GitHub remote
function hasGitHubRemote(repoPath) {
  try {
    const remotes = execSync("git remote -v", {
      cwd: repoPath,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    return remotes.includes("github.com");
  } catch (error) {
    return false;
  }
}

// Function to get repository details
function getRepoDetails(repoPath) {
  try {
    const name = path.basename(repoPath);

    // Get remote URL
    let remoteUrl = "";
    try {
      remoteUrl = execSync("git config --get remote.origin.url", {
        cwd: repoPath,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      }).trim();
    } catch (error) {
      // No remote or not set
    }

    // Get current branch
    let branch = "";
    try {
      branch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: repoPath,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      }).trim();
    } catch (error) {
      // Not on a branch
    }

    // Get last commit
    let lastCommit = {};
    try {
      const commitInfo = execSync('git log -1 --pretty=format:"%h|%s|%cr"', {
        cwd: repoPath,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      }).trim();
      const [hash, message, date] = commitInfo.split("|");
      lastCommit = { hash, message, date };
    } catch (error) {
      // No commits
    }

    return {
      name,
      path: repoPath,
      url: remoteUrl,
      branch,
      lastCommit,
    };
  } catch (error) {
    return null;
  }
}

// Get common locations where repositories might be stored
function getCommonRepoLocations() {
  const homeDir = os.homedir();

  // Common locations based on operating system
  const locations = [
    path.join(homeDir, "Documents"),
    path.join(homeDir, "Projects"),
    path.join(homeDir, "dev"),
    path.join(homeDir, "Development"),
    path.join(homeDir, "code"),
    path.join(homeDir, "src"),
    path.join(homeDir, "workspace"),
    path.join(homeDir, "repos"),
    path.join(homeDir, "git"),
    path.join(homeDir, "github"),
    path.join(homeDir, "work"),
    path.join(homeDir, "personal"),
    path.join(homeDir, "projects"),
    path.join(homeDir, "repositories"),
    process.cwd(), // Current working directory
  ];

  // Add OS-specific locations
  if (process.platform === "win32") {
    // Windows
    locations.push(path.join(homeDir, "Documents", "GitHub"));
    locations.push(path.join(homeDir, "source", "repos"));
    locations.push(path.join("C:\\", "Projects"));
    locations.push(path.join("C:\\", "dev"));
    locations.push(path.join("C:\\", "Development"));
    locations.push(path.join("C:\\", "Users", "Public", "Documents"));
    locations.push(path.join("D:\\", "Projects"));
    locations.push(path.join("D:\\", "dev"));
  } else if (process.platform === "darwin") {
    // macOS
    locations.push(path.join(homeDir, "Documents", "GitHub"));
    locations.push(path.join(homeDir, "Library", "Developer"));
    locations.push(path.join("/", "Applications", "XAMPP", "htdocs"));
    locations.push(path.join("/", "Applications", "MAMP", "htdocs"));
  } else {
    // Linux
    locations.push(path.join(homeDir, "GitHub"));
    locations.push(path.join("/", "var", "www", "html"));
    locations.push(path.join("/", "opt", "projects"));
    locations.push(path.join("/", "srv", "www"));
  }

  // Filter out locations that don't exist
  return locations.filter((loc) => {
    try {
      return fs.existsSync(loc);
    } catch (error) {
      return false;
    }
  });
}

// Get GitHub Desktop repository locations
function getGitHubDesktopLocations() {
  try {
    let configPath = "";

    // GitHub Desktop config location based on OS
    if (process.platform === "win32") {
      configPath = path.join(
        os.homedir(),
        "AppData",
        "Roaming",
        "GitHub Desktop",
        "repositories.json",
      );
    } else if (process.platform === "darwin") {
      configPath = path.join(
        os.homedir(),
        "Library",
        "Application Support",
        "GitHub Desktop",
        "repositories.json",
      );
    } else {
      configPath = path.join(
        os.homedir(),
        ".config",
        "GitHub Desktop",
        "repositories.json",
      );
    }

    // Check if config file exists
    if (!fs.existsSync(configPath)) {
      return [];
    }

    // Read and parse config file
    const configData = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(configData);

    // Extract repository paths
    if (config && config.repositories) {
      return config.repositories.map((repo) => repo.path);
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
        if (entry.isDirectory() && !entry.name.startsWith(".")) {
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
function scanLocalRepositories() {
  console.log("Scanning for GitHub repositories...");

  // Get common locations
  const commonLocations = getCommonRepoLocations();
  console.log(`Scanning ${commonLocations.length} common locations...`);

  // Get GitHub Desktop locations
  const desktopLocations = getGitHubDesktopLocations();
  console.log(
    `Found ${desktopLocations.length} GitHub Desktop repositories...`,
  );

  // Scan common locations
  const commonRepos = scanDirectoriesForRepos(commonLocations);
  console.log(
    `Found ${commonRepos.length} repositories in common locations...`,
  );

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
  console.log(`Found ${desktopRepos.length} GitHub Desktop repositories...`);

  // Combine and deduplicate repositories
  const allRepos = [...desktopRepos, ...commonRepos];
  const uniqueRepos = allRepos.filter(
    (repo, index, self) =>
      index === self.findIndex((r) => r.path === repo.path),
  );

  console.log(
    `Found ${uniqueRepos.length} unique GitHub repositories in total.`,
  );
  return uniqueRepos;
}

// Format repositories for display
function formatRepositories(repositories) {
  let output = `Found ${repositories.length} GitHub repositories:\n\n`;

  if (repositories.length === 0) {
    output = "No GitHub repositories found on this system.";
  } else {
    repositories.forEach((repo, index) => {
      output += `${index + 1}. ${repo.name}\n`;
      output += `   Path: ${repo.path}\n`;
      if (repo.url) output += `   Remote: ${repo.url}\n`;
      if (repo.branch) output += `   Branch: ${repo.branch}\n`;
      if (repo.lastCommit && repo.lastCommit.hash) {
        output += `   Last Commit: ${repo.lastCommit.hash} - ${repo.lastCommit.message} (${repo.lastCommit.date})\n`;
      }
      if (repo.isGitHubDesktop) output += `   Managed by GitHub Desktop\n`;
      output += "\n";
    });
  }

  return output;
}

// Main function
function main() {
  const args = parseArgs();

  // Show help if requested
  if (args.help) {
    console.log(`
${colors.bright}GitHub Repository Scanner${colors.reset}

Usage: node scan-github-repos.js [options]

Options:
  --depth=N         Set scan depth (default: 2)
  --dir=PATH        Add custom directory to scan
  --format=json|text Output format (default: text)
  --filter=KEYWORD  Filter repositories by name or URL
  --help            Show this help message
`);
    return;
  }

  console.log(`${colors.bright}GitHub Repository Scanner${colors.reset}`);
  console.log(`Scan depth: ${args.depth}`);

  // Get common locations
  const commonLocations = getCommonRepoLocations();
  console.log(`Scanning ${commonLocations.length} common locations...`);

  // Add custom directories
  const allLocations = [...commonLocations, ...args.customDirs];
  if (args.customDirs.length > 0) {
    console.log(
      `Added ${args.customDirs.length} custom directories to scan...`,
    );
  }

  // Get GitHub Desktop locations
  const desktopLocations = getGitHubDesktopLocations();
  console.log(
    `Found ${desktopLocations.length} GitHub Desktop repositories...`,
  );

  // Scan common locations
  const commonRepos = scanDirectoriesForRepos(allLocations, args.depth);
  console.log(
    `Found ${commonRepos.length} repositories in scanned locations...`,
  );

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
  console.log(`Found ${desktopRepos.length} GitHub Desktop repositories...`);

  // Combine and deduplicate repositories
  let allRepos = [...desktopRepos, ...commonRepos];
  const uniqueRepos = allRepos.filter(
    (repo, index, self) =>
      index === self.findIndex((r) => r.path === repo.path),
  );

  // Apply filter if specified
  let filteredRepos = uniqueRepos;
  if (args.filter) {
    filteredRepos = uniqueRepos.filter(
      (repo) =>
        repo.name.toLowerCase().includes(args.filter) ||
        (repo.url && repo.url.toLowerCase().includes(args.filter)),
    );
    console.log(
      `Applied filter '${args.filter}': ${filteredRepos.length} repositories match.`,
    );
  }

  console.log(
    `Found ${uniqueRepos.length} unique GitHub repositories in total.`,
  );

  // Output based on format
  if (args.format === "json") {
    console.log(JSON.stringify(filteredRepos, null, 2));
  } else {
    const formattedOutput = formatRepositories(filteredRepos);
    console.log("\n" + formattedOutput);
  }

  // Save to file
  const outputPath = path.join(process.cwd(), "github-repositories.json");
  fs.writeFileSync(outputPath, JSON.stringify(filteredRepos, null, 2), "utf8");
  console.log(
    `${colors.fg.green}Repository data saved to: ${outputPath}${colors.reset}`,
  );
}

// Run the scanner
try {
  main();
} catch (error) {
  console.error(
    `${colors.fg.red}Error scanning for GitHub repositories: ${error.message}${colors.reset}`,
  );
}
