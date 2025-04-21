// Script to add GitHub repository listing tool to the custom MCP server
// Run with: node add-github-repo-list-tool.js

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the custom MCP server file
const serverFilePath = join(__dirname, 'custom-mcp-server', 'index.ts');

// Check if the file exists
if (!existsSync(serverFilePath)) {
  console.error(`Error: Could not find the custom MCP server file at ${serverFilePath}`);
  process.exit(1);
}

// Read the file content
let fileContent = readFileSync(serverFilePath, 'utf8');

// Check if the tool already exists
if (fileContent.includes('github_list_repositories_by_owner')) {
  console.log('The github_list_repositories_by_owner tool already exists in the custom MCP server.');
  process.exit(0);
}

// Find the position to insert the new tool (after the last server.tool call)
const lastToolIndex = fileContent.lastIndexOf('server.tool(');
if (lastToolIndex === -1) {
  console.error('Error: Could not find any server.tool calls in the custom MCP server file.');
  process.exit(1);
}

// Find the end of the last tool definition
let bracketCount = 0;
let endIndex = lastToolIndex;
let inString = false;
let stringChar = '';

for (let i = lastToolIndex; i < fileContent.length; i++) {
  const char = fileContent[i];
  
  // Handle string literals
  if ((char === '"' || char === "'") && (i === 0 || fileContent[i-1] !== '\\')) {
    if (!inString) {
      inString = true;
      stringChar = char;
    } else if (char === stringChar) {
      inString = false;
    }
  }
  
  // Count brackets only when not in a string
  if (!inString) {
    if (char === '(') bracketCount++;
    if (char === ')') {
      bracketCount--;
      if (bracketCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }
}

// New tool implementation
const newTool = `

server.tool(
  "github_list_repositories_by_owner",
  "List repositories owned by a user or organization with filtering options.",
  {
    owner: z.string().describe("The username or organization name (required)"),
    archived: z.boolean().optional().describe("Show only archived repositories"),
    noArchived: z.boolean().optional().describe("Omit archived repositories"),
    fork: z.boolean().optional().describe("Show only forks"),
    source: z.boolean().optional().describe("Show only non-forks"),
    language: z.string().optional().describe("Filter by primary coding language"),
    limit: z.number().min(1).max(100).optional().describe("Maximum number of repositories to list (default: 30)"),
    topic: z.string().optional().describe("Filter by topic"),
    visibility: z.enum(["public", "private", "internal"]).optional().describe("Filter by repository visibility"),
  },
  async ({ owner, archived, noArchived, fork, source, language, limit = 30, topic, visibility }) => {
    try {
      // Use dynamic import to avoid require() issues
      const fetch = (await import('node-fetch')).default;
      
      // Validate parameters
      if (archived && noArchived) {
        throw new Error('Cannot specify both archived and noArchived');
      }

      if (fork && source) {
        throw new Error('Cannot specify both fork and source');
      }

      // Determine if we're fetching for a user or an organization
      let apiUrl;
      try {
        // First, try to get user information
        const userResponse = await fetch(\`https://api.github.com/users/\${encodeURIComponent(owner)}\`, {
          headers: {
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            ...(process.env.GITHUB_TOKEN && { 'Authorization': \`Bearer \${process.env.GITHUB_TOKEN}\` })
          }
        });
        
        const userData = await userResponse.json();
        
        if (userData.type === 'Organization') {
          apiUrl = \`https://api.github.com/orgs/\${encodeURIComponent(owner)}/repos\`;
        } else {
          apiUrl = \`https://api.github.com/users/\${encodeURIComponent(owner)}/repos\`;
        }
      } catch (error) {
        // Default to user endpoint if we can't determine
        apiUrl = \`https://api.github.com/users/\${encodeURIComponent(owner)}/repos\`;
      }

      // Build query parameters
      const params = new URLSearchParams({
        per_page: Math.min(limit, 100).toString()
      });

      // Add type parameter if fork or source is specified
      if (fork) {
        params.append('type', 'forks');
      } else if (source) {
        params.append('type', 'sources');
      }

      // Build request URL
      const url = \`\${apiUrl}?\${params}\`;

      // Set up headers
      const headers = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      };

      // Add authorization header if token is available
      if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = \`Bearer \${process.env.GITHUB_TOKEN}\`;
      }

      // Make the request
      const response = await fetch(url, { headers });
      
      // Check if the request was successful
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          \`GitHub API error: \${response.status} \${response.statusText}\${
            errorData ? \` - \${errorData.message}\` : ''
          }\`
        );
      }

      // Parse the response
      let repositories = await response.json();
      
      // Apply client-side filters
      if (archived === true) {
        repositories = repositories.filter(repo => repo.archived);
      } else if (noArchived === true) {
        repositories = repositories.filter(repo => !repo.archived);
      }
      
      if (language) {
        repositories = repositories.filter(repo => 
          repo.language && repo.language.toLowerCase() === language.toLowerCase()
        );
      }
      
      if (topic) {
        // We need to fetch topics for each repository
        const reposWithTopics = await Promise.all(
          repositories.map(async repo => {
            const topicsUrl = \`https://api.github.com/repos/\${owner}/\${repo.name}/topics\`;
            const topicsResponse = await fetch(topicsUrl, { headers });
            
            if (topicsResponse.ok) {
              const topicsData = await topicsResponse.json();
              repo.topics = topicsData.names || [];
            } else {
              repo.topics = [];
            }
            
            return repo;
          })
        );
        
        repositories = reposWithTopics.filter(repo => 
          repo.topics.some(t => t.toLowerCase() === topic.toLowerCase())
        );
      }
      
      if (visibility) {
        repositories = repositories.filter(repo => {
          if (visibility === 'public') return !repo.private;
          if (visibility === 'private') return repo.private;
          if (visibility === 'internal') return repo.visibility === 'internal';
          return true;
        });
      }
      
      // Limit the results
      repositories = repositories.slice(0, limit);
      
      // Format the response
      let responseText = \`Found \${repositories.length} repositories for \${owner}:\\n\\n\`;
      
      // Apply filters description
      const filters = [];
      if (archived) filters.push('archived only');
      if (noArchived) filters.push('non-archived only');
      if (fork) filters.push('forks only');
      if (source) filters.push('sources only');
      if (language) filters.push(\`language: \${language}\`);
      if (topic) filters.push(\`topic: \${topic}\`);
      if (visibility) filters.push(\`visibility: \${visibility}\`);
      
      if (filters.length > 0) {
        responseText += \`Filters applied: \${filters.join(', ')}\\n\\n\`;
      }
      
      if (repositories.length === 0) {
        responseText = \`No repositories found for \${owner} with the specified filters.\`;
      } else {
        repositories.forEach((repo, index) => {
          responseText += \`\${index + 1}. \${repo.name}\\n\`;
          if (repo.description) responseText += \`   Description: \${repo.description}\\n\`;
          responseText += \`   URL: \${repo.html_url}\\n\`;
          
          if (repo.language) responseText += \`   Language: \${repo.language}\\n\`;
          responseText += \`   Stars: \${repo.stargazers_count}\\n\`;
          responseText += \`   Forks: \${repo.forks_count}\\n\`;
          
          if (repo.fork) responseText += \`   Fork: Yes\${repo.parent ? \` (from \${repo.parent.full_name})\` : ''}\\n\`;
          if (repo.archived) responseText += \`   Archived: Yes\\n\`;
          if (repo.topics && repo.topics.length > 0) responseText += \`   Topics: \${repo.topics.join(', ')}\\n\`;
          
          responseText += \`   Created: \${new Date(repo.created_at).toLocaleDateString()}\\n\`;
          responseText += \`   Updated: \${new Date(repo.updated_at).toLocaleDateString()}\\n\`;
          responseText += \`   Visibility: \${repo.private ? 'Private' : 'Public'}\\n\`;
          responseText += '\\n';
        });
      }
      
      return { 
        content: [{ 
          type: "text", 
          text: responseText 
        }],
        repositories: repositories,
        meta: {
          owner,
          filters: {
            archived,
            noArchived,
            fork,
            source,
            language,
            limit,
            topic,
            visibility
          },
          count: repositories.length
        }
      };
    } catch (error) {
      return { 
        content: [{ 
          type: "text", 
          text: \`Error listing GitHub repositories: \${error.message || String(error)}\` 
        }],
        error: error.message || String(error)
      };
    }
  },
);`;

// Insert the new tool after the last tool
const updatedContent = fileContent.slice(0, endIndex) + newTool + fileContent.slice(endIndex);

// Write the updated content back to the file
writeFileSync(serverFilePath, updatedContent, 'utf8');

console.log('Successfully added the github_list_repositories_by_owner tool to the custom MCP server!');
console.log('You can now use the my-custom-server_github_list_repositories_by_owner command to list repositories for a user or organization.');
console.log('Example usage:');
console.log('  my-custom-server_github_list_repositories_by_owner');
console.log('    owner: "vercel"');
console.log('    language: "javascript"');
console.log('    limit: 10');
console.log('    source: true');
console.log('');
console.log('Note: For authenticated requests, set the GITHUB_TOKEN environment variable before starting your server.');
