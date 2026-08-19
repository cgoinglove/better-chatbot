-- Enable Required Extensions for Production RAG Pipeline
-- Run this in Supabase SQL Editor

-- Vector operations with pgvector
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Job queuing with automatic retries
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Async HTTP requests to Edge Functions  
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Scheduled task processing
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Utility for clearing columns on update
CREATE EXTENSION IF NOT EXISTS hstore WITH SCHEMA extensions;

-- Comment
COMMENT ON EXTENSION vector IS 'Vector similarity search for embeddings';
COMMENT ON EXTENSION pgmq IS 'PostgreSQL message queue for async job processing';
COMMENT ON EXTENSION pg_net IS 'Async HTTP requests to Edge Functions';
COMMENT ON EXTENSION pg_cron IS 'Scheduled task execution';




























