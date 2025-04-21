// Test script for GitHub repository listing functionality
// Run with: node test-github-repo-list.js <owner> [options]

import { listRepositories, formatRepositories } from './github-repo-list.js';

async function main() {
  // Get owner from command line arguments
  const owner = process.argv[2] || 'vercel'; // Default to 'vercel' if not provided
  
  // Parse command line options
  const options = {
    token: process.env.GITHUB_TOKEN
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
  console.log('Options:', JSON.stringify(options, null, 2));
  
  try {
    const result = await listRepositories(owner, options);
    
    if (result.success) {
      console.log(formatRepositories(result.repositories, result.meta));
      console.log(`Total repositories shown: ${result.repositories.length}`);
      
      if (result.repositories.length === result.meta.options.limit) {
        console.log(`Note: Results limited to ${result.meta.options.limit} repositories. There may be more available.`);
      }
    } else {
      console.error(`Error: ${result.error}`);
    }
  } catch (error) {
    console.error(`Unexpected error: ${error.message}`);
  }
}

main();
