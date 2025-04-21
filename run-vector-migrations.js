// Load environment variables
require('dotenv').config();

// Import the ensureVectorTables function
const { ensureVectorTables } = require('./dist/lib/db/vector-service-init');

// Run the function to ensure vector tables exist
ensureVectorTables()
  .then(() => {
    console.log('Vector tables created successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error creating vector tables:', error);
    process.exit(1);
  });
