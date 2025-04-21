require('dotenv').config();
const fs = require('fs');
const path = require('path');

function checkEnvFiles() {
  console.log('Checking environment variables...');
  
  // Check .env file
  try {
    if (fs.existsSync('.env')) {
      const envContent = fs.readFileSync('.env', 'utf8');
      console.log('\n.env file exists:');
      
      // Extract GitHub variables
      const githubClientId = envContent.match(/GITHUB_CLIENT_ID=(.+)/);
      const githubRedirectUri = envContent.match(/GITHUB_REDIRECT_URI=(.+)/);
      
      console.log('GITHUB_CLIENT_ID from .env:', githubClientId ? githubClientId[1] : 'Not found');
      console.log('GITHUB_REDIRECT_URI from .env:', githubRedirectUri ? githubRedirectUri[1] : 'Not found');
    } else {
      console.log('.env file does not exist');
    }
  } catch (error) {
    console.error('Error reading .env file:', error);
  }
  
  // Check .env.local file
  try {
    if (fs.existsSync('.env.local')) {
      const envLocalContent = fs.readFileSync('.env.local', 'utf8');
      console.log('\n.env.local file exists:');
      
      // Extract GitHub variables
      const githubClientId = envLocalContent.match(/GITHUB_CLIENT_ID=(.+)/);
      const githubRedirectUri = envLocalContent.match(/GITHUB_REDIRECT_URI=(.+)/);
      
      console.log('GITHUB_CLIENT_ID from .env.local:', githubClientId ? githubClientId[1] : 'Not found');
      console.log('GITHUB_REDIRECT_URI from .env.local:', githubRedirectUri ? githubRedirectUri[1] : 'Not found');
    } else {
      console.log('\n.env.local file does not exist');
    }
  } catch (error) {
    console.error('Error reading .env.local file:', error);
  }
  
  // Check process.env
  console.log('\nProcess environment variables:');
  console.log('GITHUB_CLIENT_ID from process.env:', process.env.GITHUB_CLIENT_ID);
  console.log('GITHUB_REDIRECT_URI from process.env:', process.env.GITHUB_REDIRECT_URI);
}

checkEnvFiles();
