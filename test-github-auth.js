require('dotenv').config();
const { getGitHubAuthUrl } = require('./dist/lib/github/github-auth');

async function testGitHubAuth() {
  try {
    // Mock user session
    global.getMockUserSession = () => ({ id: 'test-user-id' });
    
    // Generate GitHub auth URL
    const authUrl = await getGitHubAuthUrl();
    
    console.log('GitHub Auth URL:', authUrl);
    console.log('\nEnvironment Variables:');
    console.log('GITHUB_CLIENT_ID:', process.env.GITHUB_CLIENT_ID);
    console.log('GITHUB_REDIRECT_URI:', process.env.GITHUB_REDIRECT_URI);
    
  } catch (error) {
    console.error('Error generating GitHub auth URL:', error);
  }
}

testGitHubAuth();
