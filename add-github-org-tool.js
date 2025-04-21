// Script to add GitHub organization repositories tool to the custom MCP server
// Run with: node add-github-org-tool.js

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
if (fileContent.includes('github_list_org_repositories')) {
  console.log('The github_list_org_repositories tool already exists in the custom MCP server.');
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
  "github_list_org_repositories",
  "List repositories for a GitHub organization.",
  {
    org: z.string().describe("The organization name (required)"),
    type: z.enum(["all", "public", "private", "forks", "sources", "member"]).optional().describe("Repository type (default: all)"),
    sort: z.enum(["created", "updated", "pushed", "full_name"]).optional().describe("Sort by (default: created)"),
    direction: z.enum(["asc", "desc"]).optional().describe("Sort direction (default: desc, or asc when sort is full_name)"),
    per_page: z.number().min(1).max(100).optional().describe("Results per page, max 100 (default: 30)"),
    page: z.number().min(1).optional().describe("Page number (default: 1)"),
  },
  async ({ org, type = "all", sort = "created", direction, per_page = 30, page = 1 }) => {
    try {
      // Use dynamic import to avoid require() issues
      const fetch = (await import('node-fetch')).default;
      
      // Set default direction based on sort
      const sortDirection = direction || (sort === "full_name" ? "asc" : "desc");
      
      // Build query parameters
      const params = new URLSearchParams({
        type,
        sort,
        direction: sortDirection,
        per_page: per_page.toString(),
        page: page.toString()
      });

      // Build request URL
      const url = \`https://api.github.com/orgs/\${encodeURIComponent(org)}/repos?\${params}\`;

      // Set up headers
      const headers = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      };

      // Add authorization header if token is available
      const token = process.env.GITHUB_TOKEN;
      if (token) {
        headers['Authorization'] = \`Bearer \${token}\`;
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
      const repositories = await response.json();
      
      // Format the response
      let responseText = \`Found \${repositories.length} repositories for organization "\${org}":\\n\\n\`;
      
      if (repositories.length === 0) {
        responseText = \`No repositories found for organization "\${org}".\`;
      } else {
        repositories.forEach((repo, index) => {
          responseText += \`\${index + 1}. \${repo.name}\\n\`;
          responseText += \`   Description: \${repo.description || 'No description'}\\n\`;
          responseText += \`   URL: \${repo.html_url}\\n\`;
          responseText += \`   Language: \${repo.language || 'Not specified'}\\n\`;
          responseText += \`   Stars: \${repo.stargazers_count}\\n\`;
          responseText += \`   Forks: \${repo.forks_count}\\n\`;
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
          org,
          type,
          sort,
          direction: sortDirection,
          per_page,
          page,
          total_count: repositories.length
        }
      };
    } catch (error) {
      return { 
        content: [{ 
          type: "text", 
          text: \`Error listing GitHub organization repositories: \${error.message || String(error)}\` 
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

console.log('Successfully added the github_list_org_repositories tool to the custom MCP server!');
console.log('You can now use the my-custom-server_github_list_org_repositories command to list repositories for a GitHub organization.');
console.log('Example usage:');
console.log('  my-custom-server_github_list_org_repositories');
console.log('    org: "microsoft"');
console.log('    type: "public"');
console.log('    sort: "stars"');
console.log('    per_page: 10');
console.log('');
console.log('Note: For authenticated requests, set the GITHUB_TOKEN environment variable before starting your server.');
