// GitHub Organization Repositories Lister
// This script fetches repositories from a GitHub organization using the GitHub API
// Run with: node github-org-repos.js <org-name>

import fetch from 'node-fetch';

/**
 * List repositories for a GitHub organization
 * @param {string} org - The organization name (required)
 * @param {Object} options - Optional parameters
 * @param {string} options.type - Repository type: 'all', 'public', 'private', 'forks', 'sources', 'member' (default: 'all')
 * @param {string} options.sort - Sort by: 'created', 'updated', 'pushed', 'full_name' (default: 'created')
 * @param {string} options.direction - Sort direction: 'asc', 'desc' (default: 'desc', or 'asc' when sort is 'full_name')
 * @param {number} options.perPage - Results per page, max 100 (default: 30)
 * @param {number} options.page - Page number (default: 1)
 * @param {string} options.token - GitHub personal access token (optional)
 * @returns {Promise<Object>} - The API response
 */
async function listOrgRepositories(org, options = {}) {
  if (!org) {
    throw new Error('Organization name is required');
  }

  const {
    type = 'all',
    sort = 'created',
    direction = sort === 'full_name' ? 'asc' : 'desc',
    perPage = 30,
    page = 1,
    token
  } = options;

  // Validate parameters
  const validTypes = ['all', 'public', 'private', 'forks', 'sources', 'member'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }

  const validSorts = ['created', 'updated', 'pushed', 'full_name'];
  if (!validSorts.includes(sort)) {
    throw new Error(`Invalid sort: ${sort}. Must be one of: ${validSorts.join(', ')}`);
  }

  const validDirections = ['asc', 'desc'];
  if (!validDirections.includes(direction)) {
    throw new Error(`Invalid direction: ${direction}. Must be one of: ${validDirections.join(', ')}`);
  }

  if (perPage < 1 || perPage > 100) {
    throw new Error('perPage must be between 1 and 100');
  }

  if (page < 1) {
    throw new Error('page must be greater than 0');
  }

  // Build query parameters
  const params = new URLSearchParams({
    type,
    sort,
    direction,
    per_page: perPage,
    page
  });

  // Build request URL
  const url = `https://api.github.com/orgs/${encodeURIComponent(org)}/repos?${params}`;

  // Set up headers
  const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  // Add authorization header if token is provided
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    // Make the request
    const response = await fetch(url, { headers });
    
    // Check if the request was successful
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}${
          errorData ? ` - ${errorData.message}` : ''
        }`
      );
    }

    // Parse and return the response
    const data = await response.json();
    return {
      success: true,
      repositories: data,
      meta: {
        org,
        type,
        sort,
        direction,
        perPage,
        page
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      meta: {
        org,
        type,
        sort,
        direction,
        perPage,
        page
      }
    };
  }
}

/**
 * Format repository data for display
 * @param {Array} repositories - Array of repository objects from GitHub API
 * @returns {string} - Formatted string for display
 */
function formatRepositories(repositories) {
  if (!repositories || repositories.length === 0) {
    return "No repositories found.";
  }

  let output = `Found ${repositories.length} repositories:\n\n`;
  
  repositories.forEach((repo, index) => {
    output += `${index + 1}. ${repo.name}\n`;
    output += `   Description: ${repo.description || 'No description'}\n`;
    output += `   URL: ${repo.html_url}\n`;
    output += `   Language: ${repo.language || 'Not specified'}\n`;
    output += `   Stars: ${repo.stargazers_count}\n`;
    output += `   Forks: ${repo.forks_count}\n`;
    output += `   Created: ${new Date(repo.created_at).toLocaleDateString()}\n`;
    output += `   Updated: ${new Date(repo.updated_at).toLocaleDateString()}\n`;
    output += `   Visibility: ${repo.private ? 'Private' : 'Public'}\n`;
    output += '\n';
  });

  return output;
}

// If this script is run directly, execute with command line arguments
if (process.argv[1].endsWith('github-org-repos.js')) {
  const orgName = process.argv[2];
  const token = process.env.GITHUB_TOKEN;
  
  if (!orgName) {
    console.error('Usage: node github-org-repos.js <org-name>');
    console.error('You can also set GITHUB_TOKEN environment variable for authenticated requests');
    process.exit(1);
  }

  console.log(`Fetching repositories for organization: ${orgName}...`);
  
  listOrgRepositories(orgName, { token })
    .then(result => {
      if (result.success) {
        console.log(formatRepositories(result.repositories));
        console.log(`Total repositories: ${result.repositories.length}`);
      } else {
        console.error(`Error: ${result.error}`);
      }
    })
    .catch(error => {
      console.error(`Unexpected error: ${error.message}`);
    });
}

// Export functions for use in other modules
export {
  listOrgRepositories,
  formatRepositories
};
