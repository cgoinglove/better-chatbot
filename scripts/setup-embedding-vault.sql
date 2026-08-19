-- Setup Script: Store Supabase Service Role Key in Vault
-- This is required for pg_cron to invoke Edge Functions for embeddings

-- ============================================================================
-- STEP 1: Store Service Role Key in Vault
-- ============================================================================
-- IMPORTANT: Replace 'YOUR_SUPABASE_SERVICE_ROLE_KEY' with your actual key
-- You can find it in: Supabase Dashboard > Settings > API > service_role key

SELECT vault.create_secret(
  'YOUR_SUPABASE_SERVICE_ROLE_KEY',  -- ← REPLACE THIS
  'supabase_service_role_key'
);

-- Expected output: UUID of the created secret

-- ============================================================================
-- STEP 2: Verify Secret is Stored
-- ============================================================================
SELECT 
  id,
  name,
  created_at,
  -- Don't log the actual secret value
  CASE 
    WHEN decrypted_secret IS NOT NULL THEN '✅ Secret exists (hidden)'
    ELSE '❌ Secret not found'
  END as status
FROM vault.decrypted_secrets 
WHERE name = 'supabase_service_role_key';

-- ============================================================================
-- STEP 3: Test the Helper Function
-- ============================================================================
-- This should return your service role key (or an error if not found)
SELECT util.service_role_key();

-- ============================================================================
-- STEP 4: Store Project URL in Vault (if not already done)
-- ============================================================================
-- Local development:
-- SELECT vault.create_secret('http://kong:8000', 'project_url');

-- Production (replace with your actual URL):
-- SELECT vault.create_secret('https://your-project.supabase.co', 'project_url');

-- ============================================================================
-- STEP 5: Test Edge Function Invocation
-- ============================================================================
-- This will try to invoke the 'embed' Edge Function with a test payload
-- Check Supabase logs to see if it reaches the function
SELECT util.invoke_edge_function(
  'embed',
  '[{"jobId": 0, "id": "test", "schema": "public", "table": "document_embeddings", "contentFunction": "embedding_input", "embeddingColumn": "embedding"}]'::jsonb
);

-- Check net._http_response table for results
SELECT 
  id,
  status_code,
  content,
  created
FROM net._http_response
ORDER BY created DESC
LIMIT 5;

-- ============================================================================
-- TROUBLESHOOTING: Check Embedding Queue Status
-- ============================================================================

-- 1. Check if there are pending jobs in the queue
SELECT COUNT(*) as pending_jobs
FROM pgmq.read('embedding_jobs', 60, 100);

-- 2. Check embedding generation status
SELECT 
  COUNT(*) as total_chunks,
  COUNT(embedding) FILTER (WHERE embedding IS NOT NULL) as embedded_chunks,
  COUNT(embedding) FILTER (WHERE embedding IS NULL) as pending_chunks
FROM document_embeddings;

-- 3. Check recent HTTP responses from Edge Function calls
SELECT 
  status_code,
  content::jsonb->>'x-completed-jobs' as completed,
  content::jsonb->>'x-failed-jobs' as failed,
  created
FROM net._http_response
WHERE url LIKE '%/functions/v1/embed%'
ORDER BY created DESC
LIMIT 10;

-- 4. Check pg_cron job status
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  last_run,
  next_run,
  last_run_duration
FROM cron.job
WHERE jobname = 'process-embeddings';

-- ============================================================================
-- CLEANUP (if you need to reset)
-- ============================================================================

-- Remove old secret (if you need to update it)
-- DELETE FROM vault.secrets WHERE name = 'supabase_service_role_key';

-- Clear all embedding jobs from queue
-- SELECT pgmq.purge_queue('embedding_jobs');

-- Manually trigger embedding processing (for testing)
-- SELECT util.process_embeddings();



























