require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate a random webhook secret
function generateWebhookSecret() {
  return crypto.randomBytes(32).toString('hex');
}

async function fixGitHubConfig() {
  try {
    console.log('Fixing GitHub configuration...');
    
    // Check if .env.local exists
    const envLocalPath = path.join(process.cwd(), '.env.local');
    let envLocalExists = false;
    
    try {
      await fs.promises.access(envLocalPath);
      envLocalExists = true;
      console.log('.env.local file exists, will update it');
    } catch (error) {
      console.log('.env.local file does not exist, will create it');
    }
    
    // Get values from .env
    const clientId = 'Ov23lit6THgs0fFCuCLC'; // Your actual GitHub Client ID
    const clientSecret = '4b28ea1c8dd852e181237c7967b56b013f538a9d'; // Your actual GitHub Client Secret
    const redirectUri = 'http://localhost:3000/api/github/callback';
    const webhookSecret = generateWebhookSecret();
    
    // Create .env.local content
    const envContent = `# GitHub OAuth Configuration
GITHUB_CLIENT_ID=${clientId}
GITHUB_CLIENT_SECRET=${clientSecret}
GITHUB_REDIRECT_URI=${redirectUri}
GITHUB_WEBHOOK_SECRET=${webhookSecret}

# GitHub Repository Storage
GITHUB_REPOS_DIR=./github-repos
`;
    
    // Write to .env.local file
    await fs.promises.writeFile(envLocalPath, envContent);
    
    console.log('GitHub OAuth credentials have been saved to .env.local');
    console.log('Webhook secret has been generated automatically.');
    console.log('\nNext steps:');
    console.log('1. Restart your Next.js application');
    console.log('2. Navigate to the GitHub page in your application');
    console.log('3. Click "Connect GitHub Account"');
  } catch (error) {
    console.error('Error fixing GitHub configuration:', error);
  }
}

fixGitHubConfig();
