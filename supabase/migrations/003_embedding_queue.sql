-- Embedding Queue and Processing Functions
-- Run this in Supabase SQL Editor

-- Create embedding jobs queue
SELECT pgmq.create('embedding_jobs');

-- Function to generate embedding input from chunk
-- This works with our existing document_chunk table
CREATE OR REPLACE FUNCTION embedding_input(chunk document_chunk)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Return chunk content for embedding
  RETURN chunk.content;
END;
$$;

-- Trigger function to queue embedding generation jobs
CREATE OR REPLACE FUNCTION util.queue_embeddings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  content_function text := TG_ARGV[0];
  embedding_column text := TG_ARGV[1];
BEGIN
  PERFORM pgmq.send(
    queue_name => 'embedding_jobs',
    msg => jsonb_build_object(
      'id', NEW.id,
      'schema', TG_TABLE_SCHEMA,
      'table', TG_TABLE_NAME,
      'contentFunction', content_function,
      'embeddingColumn', embedding_column,
      'userId', NEW.user_id,
      'projectId', NEW.project_id
    )
  );
  RETURN NEW;
END;
$$;

-- Function to process embedding jobs from queue in batches
CREATE OR REPLACE FUNCTION util.process_embeddings(
  batch_size int = 10,
  max_requests int = 10,
  timeout_milliseconds int = 5 * 60 * 1000 -- 5 minute timeout
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  job_batches jsonb[];
  batch jsonb;
BEGIN
  WITH
    -- Get jobs and assign batch numbers
    numbered_jobs AS (
      SELECT
        message || jsonb_build_object('jobId', msg_id) as job_info,
        (row_number() OVER (ORDER BY 1) - 1) / batch_size as batch_num
      FROM pgmq.read(
        queue_name => 'embedding_jobs',
        vt => timeout_milliseconds / 1000,
        qty => max_requests * batch_size
      )
    ),
    -- Group jobs into batches
    batched_jobs AS (
      SELECT
        jsonb_agg(job_info) as batch_array,
        batch_num
      FROM numbered_jobs
      GROUP BY batch_num
    )
  -- Aggregate all batches
  SELECT array_agg(batch_array)
  FROM batched_jobs
  INTO job_batches;
  
  -- Invoke Edge Function for each batch
  FOREACH batch IN ARRAY job_batches LOOP
    PERFORM util.invoke_edge_function(
      name => 'embed',
      body => batch,
      timeout_milliseconds => timeout_milliseconds
    );
  END LOOP;
END;
$$;

-- Schedule processing every 10 seconds via pg_cron
-- Note: Adjust frequency based on your needs
SELECT cron.schedule(
  'process-embeddings',
  '10 seconds',
  $$SELECT util.process_embeddings();$$
);

-- Comments
COMMENT ON FUNCTION embedding_input(document_chunk) IS 'Extract text from chunk for embedding generation';
COMMENT ON FUNCTION util.queue_embeddings() IS 'Trigger function to queue embedding jobs in pgmq';
COMMENT ON FUNCTION util.process_embeddings(int, int, int) IS 'Process embedding jobs from queue in batches';




























