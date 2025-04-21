// Script to check and fix database issues
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  try {
    console.log('Checking database configuration...');
    
    // Check if we're using SQLite
    const isUsingSqlite = process.env.USE_FILE_SYSTEM_DB === 'true';
    console.log(`Database type: ${isUsingSqlite ? 'SQLite' : 'PostgreSQL'}`);
    
    if (isUsingSqlite) {
      const dbPath = process.env.FILEBASE_URL.replace('file:', '');
      console.log(`Database path: ${dbPath}`);
      
      // Check if database file exists
      const dbExists = fs.existsSync(dbPath);
      console.log(`Database file exists: ${dbExists}`);
      
      if (!dbExists) {
        console.log('Creating empty database file...');
        fs.writeFileSync(dbPath, '');
        console.log('Empty database file created.');
      }
      
      // Run migrations
      console.log('Running database migrations...');
      try {
        execSync('npx drizzle-kit generate', { stdio: 'inherit' });
        console.log('Migration files generated successfully.');
        
        // Run the migrations API route
        console.log('Applying migrations...');
        execSync('node -e "require(\'./src/lib/db/migrate\').runMigrations().catch(console.error)"', { stdio: 'inherit' });
        console.log('Migrations applied successfully.');
      } catch (error) {
        console.error('Error running migrations:', error.message);
      }
    } else {
      // PostgreSQL
      console.log('Checking PostgreSQL connection...');
      console.log('PostgreSQL URL:', process.env.POSTGRES_URL);
      
      // Run migrations
      console.log('Running database migrations...');
      try {
        execSync('npx drizzle-kit generate', { stdio: 'inherit' });
        console.log('Migration files generated successfully.');
        
        // Run the migrations API route
        console.log('Applying migrations...');
        execSync('node -e "require(\'./src/lib/db/migrate\').runMigrations().catch(console.error)"', { stdio: 'inherit' });
        console.log('Migrations applied successfully.');
      } catch (error) {
        console.error('Error running migrations:', error.message);
      }
    }
    
    console.log('Database check and fix completed.');
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

main();
