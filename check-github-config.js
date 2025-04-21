require('dotenv').config();
const { createClient } = require('@libsql/client');

async function checkGitHubConfig() {
  try {
    // Create SQLite client
    const client = createClient({ url: process.env.FILEBASE_URL });
    
    // Check if the github_config table exists
    try {
      const tables = await client.execute(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='github_config'
      `);
      
      console.log('Tables:', tables.rows);
      
      if (tables.rows.length > 0) {
        // Get GitHub configs
        const configs = await client.execute(`
          SELECT * FROM github_config
        `);
        
        console.log('GitHub Configs:', configs.rows);
      } else {
        console.log('github_config table does not exist');
      }
    } catch (error) {
      console.error('Error checking tables:', error);
    }
    
    // Check environment variables
    console.log('Environment Variables:');
    console.log('GITHUB_CLIENT_ID:', process.env.GITHUB_CLIENT_ID);
    console.log('GITHUB_REDIRECT_URI:', process.env.GITHUB_REDIRECT_URI);
    
    // Close the client
    await client.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkGitHubConfig();
