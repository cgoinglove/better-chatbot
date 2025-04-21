// Simple script to list GitHub repositories (CommonJS version)
// Run with: node list-github-repos-cjs.js

const { listGitHubRepositories } = require('./github-scanner-cjs.js');

// Run the scanner and print the results
const result = listGitHubRepositories();
console.log(JSON.stringify(result, null, 2));
