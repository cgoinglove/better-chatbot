-- Automatic Embedding Triggers
-- Run this in Supabase SQL Editor

-- Note: These triggers work with our existing document_chunk table
-- When a chunk is inserted without an embedding, it gets queued for async generation

-- Queue embedding job when a new chunk is created
-- This integrates with our existing document_chunk table structure
CREATE OR REPLACE TRIGGER embed_chunks_on_insert
  AFTER INSERT
  ON document_chunk
  FOR EACH ROW
  WHEN (NEW.id IS NOT NULL)
  EXECUTE FUNCTION util.queue_embeddings('embedding_input', 'embedding');

-- Note: We don't need an UPDATE trigger for content changes 
-- because our chunks are immutable (never updated after creation)

-- Comments
COMMENT ON TRIGGER embed_chunks_on_insert ON document_chunk IS 'Queue embedding generation for new chunks';




























