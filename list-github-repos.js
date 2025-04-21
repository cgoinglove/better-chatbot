// Simple script to list GitHub repositories
// Run with: node --experimental-modules list-github-repos.js

import listGitHubRepositories from './github-scanner.js';

// Run the scanner and print the results
const result = listGitHubRepositories();
console.log(JSON.stringify(result, null, 2));
