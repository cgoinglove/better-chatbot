// Load environment variables
require('dotenv').config();

// Import the database client
const { createClient } = require('@libsql/client');

// Create a client
const client = createClient({ url: process.env.FILEBASE_URL });

async function createVectorTables() {
  try {
    console.log('Creating vector database tables...');
    
    // Create document table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS document (
        id TEXT PRIMARY KEY NOT NULL,
        library_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        file_path TEXT,
        mime_type TEXT,
        size INTEGER,
        metadata TEXT,
        created_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    
    // Create document_embedding table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS document_embedding (
        id TEXT PRIMARY KEY NOT NULL,
        document_id TEXT NOT NULL,
        library_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        embedding TEXT NOT NULL,
        metadata TEXT,
        created_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    
    // Create indexes
    await client.execute(`CREATE INDEX IF NOT EXISTS document_library_id_idx ON document (library_id)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS document_user_id_idx ON document (user_id)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS document_embedding_document_id_idx ON document_embedding (document_id)`);
    await client.execute(`CREATE INDEX IF NOT EXISTS document_embedding_library_id_idx ON document_embedding (library_id)`);
    
    console.log('Vector database tables created successfully');
  } catch (error) {
    console.error('Error creating vector database tables:', error);
  }
}

// Run the function
createVectorTables()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
