// GitHub Repository Lister
// Lists repositories owned by a user or organization with filtering options
// Similar to the 'gh repo list' command

import fetch from 'node-fetch';

/**
 * List repositories owned by a user or organization
 * @param {string} owner - The username or organization name (required)
 * @param {Object} options - Optional parameters
 * @param {boolean} options.archived - Show only archived repositories
 * @param {boolean} options.noArchived - Omit archived repositories
 * @param {boolean} options.fork - Show only forks
 * @param {boolean} options.source - Show only non-forks
 * @param {string} options.language - Filter by primary coding language
 * @param {number} options.limit - Maximum number of repositories to list (default: 30)
 * @param {string} options.topic - Filter by topic
 * @param {string} options.visibility - Filter by repository visibility: public, private, or internal
 * @param {string} options.token - GitHub personal access token (optional)
 * @returns {Promise<Object>} - The API response
 */
async function listRepositories(owner, options = {}) {
  if (!owner) {
    throw new Error('Owner (username or organization) is required');
  }

  const {
    archived,
    noArchived,
    fork,
    source,
    language,
    limit = 30,
    topic,
    visibility,
    token
  } = options;

  // Validate parameters
  if (archived && noArchived) {
    throw new Error('Cannot specify both --archived and --no-archived');
  }

  if (fork && source) {
    throw new Error('Cannot specify both --fork and --source');
  }

  if (visibility && !['public', 'private', 'internal'].includes(visibility)) {
    throw new Error('Visibility must be one of: public, private, internal');
  }

  if (limit < 1 || limit > 100) {
    throw new Error('Limit must be between 1 and 100');
  }

  // Determine if we're fetching for a user or an organization
  let apiUrl;
  try {
    // First, try to get user information
    const userResponse = await fetch(`https://api.github.com/users/${encodeURIComponent(owner)}`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });
    
    const userData = await userResponse.json();
    
    if (userData.type === 'Organization') {
      apiUrl = `https://api.github.com/orgs/${encodeURIComponent(owner)}/repos`;
    } else {
      apiUrl = `https://api.github.com/users/${encodeURIComponent(owner)}/repos`;
    }
  } catch (error) {
    // Default to user endpoint if we can't determine
    apiUrl = `https://api.github.com/users/${encodeURIComponent(owner)}/repos`;
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
  const url = `${apiUrl}?${params}`;

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
          const topicsUrl = `https://api.github.com/repos/${owner}/${repo.name}/topics`;
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

    return {
      success: true,
      repositories,
      meta: {
        owner,
        options: {
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
      success: false,
      error: error.message,
      meta: {
        owner,
        options: {
          archived,
          noArchived,
          fork,
          source,
          language,
          limit,
          topic,
          visibility
        }
      }
    };
  }
}

/**
 * Format repository data for display
 * @param {Array} repositories - Array of repository objects from GitHub API
 * @param {Object} meta - Metadata about the request
 * @returns {string} - Formatted string for display
 */
function formatRepositories(repositories, meta) {
  if (!repositories || repositories.length === 0) {
    return `No repositories found for ${meta.owner} with the specified filters.`;
  }

  let output = `Found ${repositories.length} repositories for ${meta.owner}:\n\n`;
  
  // Apply filters description
  const filters = [];
  if (meta.options.archived) filters.push('archived only');
  if (meta.options.noArchived) filters.push('non-archived only');
  if (meta.options.fork) filters.push('forks only');
  if (meta.options.source) filters.push('sources only');
  if (meta.options.language) filters.push(`language: ${meta.options.language}`);
  if (meta.options.topic) filters.push(`topic: ${meta.options.topic}`);
  if (meta.options.visibility) filters.push(`visibility: ${meta.options.visibility}`);
  
  if (filters.length > 0) {
    output += `Filters applied: ${filters.join(', ')}\n\n`;
  }
  
  repositories.forEach((repo, index) => {
    output += `${index + 1}. ${repo.name}\n`;
    if (repo.description) output += `   Description: ${repo.description}\n`;
    output += `   URL: ${repo.html_url}\n`;
    
    if (repo.language) output += `   Language: ${repo.language}\n`;
    output += `   Stars: ${repo.stargazers_count}\n`;
    output += `   Forks: ${repo.forks_count}\n`;
    
    if (repo.fork) output += `   Fork: Yes${repo.parent ? ` (from ${repo.parent.full_name})` : ''}\n`;
    if (repo.archived) output += `   Archived: Yes\n`;
    if (repo.topics && repo.topics.length > 0) output += `   Topics: ${repo.topics.join(', ')}\n`;
    
    output += `   Created: ${new Date(repo.created_at).toLocaleDateString()}\n`;
    output += `   Updated: ${new Date(repo.updated_at).toLocaleDateString()}\n`;
    output += `   Visibility: ${repo.private ? 'Private' : 'Public'}\n`;
    output += '\n';
  });

  return output;
}

// If this script is run directly, execute with command line arguments
if (process.argv[1].endsWith('github-repo-list.js')) {
  const owner = process.argv[2];
  const token = process.env.GITHUB_TOKEN;
  
  if (!owner) {
    console.error('Usage: node github-repo-list.js <owner> [options]');
    console.error('You can also set GITHUB_TOKEN environment variable for authenticated requests');
    process.exit(1);
  }

  // Parse command line options
  const options = {
    token
  };
  
  for (let i = 3; i < process.argv.length; i++) {
    const arg = process.argv[i];
    
    if (arg === '--archived') options.archived = true;
    else if (arg === '--no-archived') options.noArchived = true;
    else if (arg === '--fork') options.fork = true;
    else if (arg === '--source') options.source = true;
    else if (arg === '--language' || arg === '-l') options.language = process.argv[++i];
    else if (arg === '--limit' || arg === '-L') options.limit = parseInt(process.argv[++i], 10);
    else if (arg === '--topic') options.topic = process.argv[++i];
    else if (arg === '--visibility') options.visibility = process.argv[++i];
  }

  console.log(`Fetching repositories for ${owner}...`);
  
  listRepositories(owner, options)
    .then(result => {
      if (result.success) {
        console.log(formatRepositories(result.repositories, result.meta));
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
  listRepositories,
  formatRepositories
};
