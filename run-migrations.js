// Script to run database migrations
const { runMigrations } = require('./src/lib/db/migrate');

async function main() {
  try {
    console.log('Starting database migrations...');
    await runMigrations();
    console.log('Database migrations completed successfully!');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

main();
