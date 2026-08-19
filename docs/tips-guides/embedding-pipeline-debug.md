# Debugging the Embedding Pipeline

## Problem: Embeddings Not Generating

If uploaded documents are not getting embeddings, follow this debugging guide.

---

## 🔍 Root Cause Analysis

The embedding pipeline uses these components:

```text
Document Upload
    ↓
document_embeddings table (embedding = NULL)
    ↓
Trigger: embed_chunks_on_insert
    ↓
util.queue_embeddings() → pgmq queue
    ↓
pg_cron: process-embeddings (runs every 10 seconds)
    ↓
util.process_embeddings()
    ↓
util.invoke_edge_function('embed', jobs)
    ↓
Supabase Edge Function
    ↓
Embeddings stored in database
```

**Common Failure Point**: `util.invoke_edge_function()` returns 401 Unauthorized because:
- pg_cron has no HTTP request context
- No Authorization header available
- Service role key not configured in Vault

---

## ✅ Step-by-Step Fix

### 1. Apply the Migration

```bash
cd /Users/hagenrothmann/Downloads/keinsaas-navigator

# Apply the fix migration
supabase db push
```

This updates `util.invoke_edge_function()` to use the service role key as fallback.

---

### 2. Store Service Role Key in Vault

**Option A: Via Supabase SQL Editor**

1. Go to Supabase Dashboard → SQL Editor
2. Run this query (replace with your actual key):

```sql
SELECT vault.create_secret(
  'eyJhbGc...your-actual-service-role-key-here',
  'supabase_service_role_key'
);
```

**Option B: Via Local psql**

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Store the secret
SELECT vault.create_secret(
  'YOUR_SERVICE_ROLE_KEY',
  'supabase_service_role_key'
);
```

**Where to find your Service Role Key:**
- Supabase Dashboard → Settings → API → `service_role` key (secret)

---

### 3. Verify Configuration

Run the setup script:

```bash
# Open Supabase SQL Editor
# Run: scripts/setup-embedding-vault.sql
```

Or manually run these queries:

```sql
-- ✅ Verify secret exists
SELECT 
  name,
  CASE 
    WHEN decrypted_secret IS NOT NULL THEN '✅ Secret exists'
    ELSE '❌ Secret not found'
  END as status
FROM vault.decrypted_secrets 
WHERE name = 'supabase_service_role_key';

-- ✅ Test helper function
SELECT util.service_role_key();
-- Should return your service role key

-- ✅ Check if Edge Function is deployed
SELECT util.invoke_edge_function('embed', '[]'::jsonb);
-- Check net._http_response for status
```

---

### 4. Deploy the Edge Function (if not already done)

```bash
cd /Users/hagenrothmann/Downloads/keinsaas-navigator

# Make sure you have the edge function
ls supabase/functions/embed/index.ts

# Deploy it
supabase functions deploy embed \
  --project-ref YOUR_PROJECT_REF

# Set required secrets
supabase secrets set \
  AI_GATEWAY_URL=https://gateway.vercel.com/v1 \
  AI_GATEWAY_API_KEY=your-gateway-api-key \
  PROJECT_URL=https://your-app.vercel.app
```

---

### 5. Verify pg_cron Job

```sql
-- Check if the job is scheduled
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  last_run,
  next_run
FROM cron.job
WHERE jobname = 'process-embeddings';

-- If not found, create it:
SELECT cron.schedule(
  'process-embeddings',
  '10 seconds',
  $$SELECT util.process_embeddings();$$
);
```

---

### 6. Test the Full Pipeline

#### Step 1: Create a test embedding (manual)

```sql
-- Insert a test chunk
INSERT INTO document_embeddings (
  user_id,
  attachment_id,
  chunk_index,
  chunk_text,
  embedding
) VALUES (
  'your-user-id',
  'test-attachment-id',
  0,
  'This is a test chunk for embedding generation.',
  NULL  -- Trigger should queue this
);

-- Check if job was queued
SELECT COUNT(*) FROM pgmq.read('embedding_jobs', 60, 10);
```

#### Step 2: Manually trigger processing

```sql
-- Force immediate processing
SELECT util.process_embeddings();

-- Check HTTP responses
SELECT 
  status_code,
  content::jsonb->>'x-completed-jobs' as completed,
  content::jsonb->>'x-failed-jobs' as failed,
  created
FROM net._http_response
WHERE url LIKE '%/functions/v1/embed%'
ORDER BY created DESC
LIMIT 5;
```

#### Step 3: Verify embedding was generated

```sql
SELECT 
  id,
  chunk_text,
  CASE 
    WHEN embedding IS NOT NULL THEN '✅ Embedding generated'
    ELSE '❌ Still NULL'
  END as status
FROM document_embeddings
WHERE chunk_text = 'This is a test chunk for embedding generation.';
```

---

## 🔍 Debugging Queries

### Check Embedding Status

```sql
-- Overall status
SELECT 
  COUNT(*) as total_chunks,
  COUNT(embedding) FILTER (WHERE embedding IS NOT NULL) as embedded,
  COUNT(*) - COUNT(embedding) as pending,
  ROUND(100.0 * COUNT(embedding) / NULLIF(COUNT(*), 0), 2) as completion_pct
FROM document_embeddings;

-- Per-project status
SELECT 
  p.name as project_name,
  COUNT(*) as total_chunks,
  COUNT(de.embedding) as embedded,
  COUNT(*) - COUNT(de.embedding) as pending
FROM document_embeddings de
JOIN projects p ON p.id = de.project_id
GROUP BY p.name
ORDER BY pending DESC;
```

### Check Queue Status

```sql
-- Pending jobs in queue
SELECT COUNT(*) as pending_jobs
FROM pgmq.read('embedding_jobs', 60, 100);

-- Check for stuck jobs (visibility timeout expired)
SELECT 
  msg_id,
  message,
  enqueued_at,
  vt  -- visibility timeout
FROM pgmq.read('embedding_jobs', 60, 100)
WHERE vt < now();
```

### Check Edge Function Logs

```sql
-- Recent Edge Function invocations
SELECT 
  status_code,
  content,
  error_msg,
  created
FROM net._http_response
WHERE url LIKE '%/functions/v1/embed%'
ORDER BY created DESC
LIMIT 20;

-- Failed invocations
SELECT 
  status_code,
  content,
  error_msg,
  created
FROM net._http_response
WHERE url LIKE '%/functions/v1/embed%'
  AND status_code >= 400
ORDER BY created DESC;
```

### Check Triggers

```sql
-- Verify triggers are enabled
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname IN ('embed_chunks_on_insert', 'embed_chunks_on_update');

-- If disabled, enable them:
-- ALTER TABLE document_embeddings ENABLE TRIGGER embed_chunks_on_insert;
-- ALTER TABLE document_embeddings ENABLE TRIGGER embed_chunks_on_update;
```

---

## 🛠️ Common Issues & Fixes

### Issue 1: 401 Unauthorized

**Symptom:**
```sql
SELECT * FROM net._http_response WHERE status_code = 401;
```

**Fix:**
- Service role key not in Vault
- Run: `SELECT vault.create_secret('your-key', 'supabase_service_role_key');`

---

### Issue 2: Edge Function Not Found (404)

**Symptom:**
```sql
SELECT * FROM net._http_response WHERE status_code = 404;
```

**Fix:**
```bash
# Deploy the Edge Function
supabase functions deploy embed --project-ref YOUR_REF
```

---

### Issue 3: Queue Not Processing

**Symptom:**
```sql
-- Many jobs in queue, no processing
SELECT COUNT(*) FROM pgmq.read('embedding_jobs', 60, 100);
-- Returns high count, but embeddings stay NULL
```

**Fix:**
```sql
-- Check pg_cron job
SELECT * FROM cron.job WHERE jobname = 'process-embeddings';

-- Manually trigger
SELECT util.process_embeddings();
```

---

### Issue 4: Jobs Stuck in Queue

**Symptom:**
- Jobs never complete
- `net._http_response` shows errors

**Fix:**
```sql
-- Clear the queue and retry
SELECT pgmq.purge_queue('embedding_jobs');

-- Delete and re-insert embeddings to re-trigger
DELETE FROM document_embeddings WHERE embedding IS NULL;
-- Re-upload documents
```

---

### Issue 5: AI Gateway Errors

**Symptom:**
```
Error: AI Gateway authentication failed
```

**Fix:**
```bash
# Check Edge Function secrets
supabase secrets list

# Set missing secrets
supabase secrets set \
  AI_GATEWAY_URL=https://gateway.vercel.com/v1 \
  AI_GATEWAY_API_KEY=your-key
```

---

## 🎯 Health Check Script

Run this to get a full status report:

```sql
DO $$
DECLARE
  total_chunks int;
  embedded_chunks int;
  pending_jobs int;
  recent_errors int;
BEGIN
  -- Check embeddings
  SELECT COUNT(*), COUNT(embedding) 
  INTO total_chunks, embedded_chunks
  FROM document_embeddings;
  
  -- Check queue
  SELECT COUNT(*) INTO pending_jobs
  FROM pgmq.read('embedding_jobs', 1, 1);
  
  -- Check recent errors
  SELECT COUNT(*) INTO recent_errors
  FROM net._http_response
  WHERE url LIKE '%/functions/v1/embed%'
    AND status_code >= 400
    AND created > now() - interval '1 hour';
  
  -- Report
  RAISE NOTICE '=== EMBEDDING PIPELINE HEALTH ===';
  RAISE NOTICE 'Total chunks: %', total_chunks;
  RAISE NOTICE 'Embedded: %', embedded_chunks;
  RAISE NOTICE 'Pending: %', total_chunks - embedded_chunks;
  RAISE NOTICE 'Queued jobs: %', pending_jobs;
  RAISE NOTICE 'Recent errors (1h): %', recent_errors;
  
  IF embedded_chunks = total_chunks THEN
    RAISE NOTICE '✅ All chunks embedded!';
  ELSIF pending_jobs > 0 THEN
    RAISE NOTICE '⏳ Processing in progress...';
  ELSIF recent_errors > 0 THEN
    RAISE NOTICE '❌ Errors detected. Check net._http_response table.';
  ELSE
    RAISE NOTICE '⚠️ No progress. Check pg_cron job.';
  END IF;
END $$;
```

---

## 📊 Monitoring Dashboard Queries

### Real-Time Embedding Progress

```sql
SELECT 
  p.name,
  COUNT(*) as total,
  COUNT(de.embedding) as done,
  COUNT(*) - COUNT(de.embedding) as pending,
  ROUND(100.0 * COUNT(de.embedding) / COUNT(*), 1) as pct
FROM document_embeddings de
JOIN projects p ON p.id = de.project_id
GROUP BY p.name;
```

### Edge Function Performance

```sql
SELECT 
  DATE_TRUNC('hour', created) as hour,
  COUNT(*) as invocations,
  AVG((content::jsonb->>'x-completed-jobs')::int) as avg_completed,
  AVG((content::jsonb->>'x-failed-jobs')::int) as avg_failed
FROM net._http_response
WHERE url LIKE '%/functions/v1/embed%'
  AND created > now() - interval '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

---

## 🎓 Next Steps

After fixing embeddings:

1. Test RAG search: `POST /api/rag/search`
2. Verify vector similarity results
3. Monitor Autumn cost tracking
4. Set up alerts for embedding failures

---

## 📚 Related Documentation

- [Supabase Vault Docs](https://supabase.com/docs/guides/database/vault)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [pg_cron Extension](https://github.com/citusdata/pg_cron)
- [pgmq Queue](https://github.com/tembo-io/pgmq)



























