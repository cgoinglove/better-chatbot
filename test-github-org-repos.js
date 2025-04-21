// Test script for GitHub organization repositories functionality
// Run with: node test-github-org-repos.js <org-name>

import { listOrgRepositories, formatRepositories } from './github-org-repos.js';

async function main() {
  // Get organization name from command line arguments
  const orgName = process.argv[2] || 'microsoft'; // Default to 'microsoft' if not provided
  
  console.log(`Fetching repositories for organization: ${orgName}...`);
  
  try {
    // Get GitHub token from environment variable if available
    const token = process.env.GITHUB_TOKEN;
    
    // Fetch repositories with a smaller page size for testing
    const result = await listOrgRepositories(orgName, { 
      perPage: 5,
      token
    });
    
    if (result.success) {
      console.log(formatRepositories(result.repositories));
      console.log(`Total repositories shown: ${result.repositories.length}`);
      console.log(`Note: This is limited to ${result.meta.perPage} repositories per page.`);
      
      if (result.repositories.length === result.meta.perPage) {
        console.log('There may be more repositories available. Try increasing the perPage parameter or paginating through results.');
      }
    } else {
      console.error(`Error: ${result.error}`);
    }
  } catch (error) {
    console.error(`Unexpected error: ${error.message}`);
  }
}

main();
