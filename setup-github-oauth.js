/**
 * GitHub OAuth Setup Script
 * 
 * This script helps you set up GitHub OAuth credentials for your application.
 * It will create a .env.local file with your GitHub OAuth credentials.
 * 
 * Usage:
 * node setup-github-oauth.js
 */

const fs = require('fs');
const readline = require('readline');
const crypto = require('crypto');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Generate a random webhook secret
const generateWebhookSecret = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Ask for GitHub OAuth credentials
console.log('GitHub OAuth Setup\n');
console.log('This script will help you set up GitHub OAuth credentials for your application.');
console.log('You need to create a GitHub OAuth App first. See GITHUB_OAUTH_SETUP.md for instructions.\n');

rl.question('Enter your GitHub Client ID: ', (clientId) => {
  rl.question('Enter your GitHub Client Secret: ', (clientSecret) => {
    rl.question('Enter your GitHub Redirect URI (default: http://localhost:3000/api/github/callback): ', (redirectUri) => {
      // Generate webhook secret
      const webhookSecret = generateWebhookSecret();
      
      // Set default redirect URI if not provided
      const finalRedirectUri = redirectUri || 'http://localhost:3000/api/github/callback';
      
      // Create .env.local file content
      const envContent = `# GitHub OAuth Configuration
GITHUB_CLIENT_ID=${clientId}
GITHUB_CLIENT_SECRET=${clientSecret}
GITHUB_REDIRECT_URI=${finalRedirectUri}
GITHUB_WEBHOOK_SECRET=${webhookSecret}

# GitHub Repository Storage
GITHUB_REPOS_DIR=./github-repos
`;
      
      // Write to .env.local file
      fs.writeFileSync('.env.local', envContent);
      
      console.log('\nGitHub OAuth credentials have been saved to .env.local');
      console.log('Webhook secret has been generated automatically.');
      console.log('\nNext steps:');
      console.log('1. Restart your Next.js application');
      console.log('2. Navigate to the GitHub page in your application');
      console.log('3. Click "Connect GitHub Account"');
      console.log('\nFor more information, see GITHUB_OAUTH_SETUP.md');
      
      rl.close();
    });
  });
});
