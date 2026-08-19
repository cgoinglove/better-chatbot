# Production RAG Pipeline Setup Guide

This guide covers setting up the async RAG pipeline with Supabase Edge Functions, pgmq queuing, and automatic embedding generation.

## Architecture Overview

```
Upload PDF → Chunk Text → Store Chunks → Queue Jobs → Edge Function → Generate Embeddings
                ↓            ↓              ↓            ↓
           Document     document_chunk   pgmq Queue  pg_cron
                                                       Scheduler
                                                         ↓
                                                   Retry on Failure
```

## Key Benefits

✅ **No API Timeouts** - Embeddings generated asynchronously  
✅ **Automatic Retries** - pgmq handles failed jobs  
✅ **Scalable** - Batch processing for large volumes  
✅ **Cost Tracking** - Via Vercel AI Gateway (optional)  
✅ **User-Selectable Models** - Per-project embedding models  

## Setup Steps

### 1. Run SQL Migrations in Supabase

Run these SQL files in your Supabase SQL Editor (in order):

1. `supabase/migrations/001_enable_rag_extensions.sql` - Enable pgvector, pgmq, pg_cron
2. `supabase/migrations/002_rag_utilities.sql` - Utility functions
3. `supabase_migrations_manual.sql` - Schema updates (embedding_model, user_id)
4. `supabase/migrations/003_embedding_queue.sql` - Queue and processing
5. `supabase/migrations/004_embedding_triggers.sql` - Automatic triggers

**Important:** After running `002_rag_utilities.sql`, add your project URL to Vault:

```sql
-- For production (Vercel)
SELECT vault.create_secret('https://your-app.vercel.app', 'project_url');

-- For local development
SELECT vault.create_secret('http://localhost:3000', 'project_url');
```

### 2. Deploy Supabase Edge Function

Install Supabase CLI if you haven't:

```bash
npm install -g supabase
```

Deploy the embed function:

```bash
cd supabase
supabase functions deploy embed
```

Set environment secrets:

```bash
# Optional: For AI Gateway integration
supabase secrets set AI_GATEWAY_URL=https://gateway.vercel.com/v1
supabase secrets set AI_GATEWAY_API_KEY=your-gateway-key

# For Autumn tracking callbacks
supabase secrets set PROJECT_URL=https://your-app.vercel.app
```

### 3. Configure Environment Variables

Add to your `.env.local`:

```env
# Already configured (Supabase)
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Optional: AI Gateway for cost tracking
AI_GATEWAY_URL=https://gateway.vercel.com/v1
AI_GATEWAY_API_KEY=your-gateway-key
```

### 4. Test the Pipeline

1. **Upload a document** via the Projects UI
2. **Check queue status** in Supabase SQL Editor:

   ```sql
   SELECT * FROM pgmq.read('embedding_jobs', 10, 1);
   ```

3. **Monitor Edge Function** logs in Supabase Dashboard
4. **Check embedding progress** via API:

   ```bash
   curl https://your-app.vercel.app/api/projects/{projectId}/status
   ```

## How It Works

### Upload Flow

1. User uploads PDF to project
2. API route chunks the PDF text
3. Chunks stored in `document_chunk` table (without embeddings)
4. **Trigger fires** → Inserts job into `pgmq` queue
5. `pg_cron` runs every 10 seconds → Calls `util.process_embeddings()`
6. Edge Function generates embeddings in batches
7. Embeddings stored in `document_embedding` table

### Search Flow

1. User sends search query via `/api/projects/{id}/search`
2. API generates embedding for query (using project's embedding model)
3. pgvector cosine similarity search finds relevant chunks
4. Results returned with similarity scores

## API Endpoints

### Search Documents

```bash
POST /api/projects/{projectId}/search
{
  "query": "your search query",
  "limit": 5,
  "threshold": 0.7
}
```

### Get Embedding Status

```bash
GET /api/projects/{projectId}/status
```

Returns:

```json
{
  "totalChunks": 45,
  "embeddedChunks": 45,
  "pendingChunks": 0,
  "progress": 100,
  "documents": [...]
}
```

### Generate Embedding (for queries)

```bash
POST /api/embeddings/generate
{
  "text": "your text",
  "projectId": "uuid"
}
```

## Monitoring

### Check Queue Status

```sql
-- View pending jobs
SELECT COUNT(*) FROM pgmq.read('embedding_jobs', 10, 1);

-- View failed jobs (jobs that exceeded visibility timeout)
SELECT * FROM pgmq.metrics('embedding_jobs');
```

### Check Embedding Progress

```sql
-- Per project
SELECT 
  p.name,
  COUNT(dc.id) as total_chunks,
  COUNT(de.embedding) as embedded_chunks
FROM archive p
LEFT JOIN document_chunk dc ON dc.project_id = p.id
LEFT JOIN document_embedding de ON de.chunk_id = dc.id
GROUP BY p.id, p.name;
```

### View Cron Schedule

```sql
SELECT * FROM cron.job;
```

## Troubleshooting

### No embeddings being generated

1. Check pg_cron is running:

   ```sql
   SELECT * FROM cron.job WHERE jobname = 'process-embeddings';
   ```

2. Check queue has jobs:

   ```sql
   SELECT COUNT(*) FROM pgmq.q_embedding_jobs;
   ```

3. Check Edge Function logs in Supabase Dashboard

### Edge Function errors

Check Supabase Edge Function logs:

- Go to Supabase Dashboard
- Navigate to Edge Functions → embed
- View logs for errors

Common issues:

- Missing `SUPABASE_DB_URL` secret
- Invalid embedding model in project
- Database connection timeout

### Slow embedding generation

Adjust `pg_cron` frequency in migration `003`:

```sql
-- Process more frequently (every 5 seconds)
SELECT cron.schedule(
  'process-embeddings',
  '5 seconds',
  $$SELECT util.process_embeddings();$$
);
```

Or increase batch size:

```sql
SELECT util.process_embeddings(
  batch_size => 20,  -- Process 20 chunks per batch
  max_requests => 20 -- Allow up to 20 concurrent batches
);
```

## Cost Optimization

### Embedding Models

Choose cheaper models for less critical projects:

- `text-embedding-3-small` (1536 dims) - Default, balanced
- `text-embedding-004` (768 dims) - Google, cheaper
- `mistral-embed` (1024 dims) - European data residency

### Chunking Strategy

Adjust chunk size in `src/lib/ai/rag/ingest.ts`:

```typescript
const CHUNK_SIZE = 1000; // Smaller = more chunks = more API calls
const CHUNK_OVERLAP = 200; // More overlap = better context but more chunks
```

## Security Considerations

- ✅ RLS enabled on all tables
- ✅ User isolation via `user_id` filtering
- ✅ Service Role Key only used server-side
- ✅ Better Auth session validation on all API routes
- ✅ Project ownership verified before operations

## Next Steps

1. **Test the pipeline** with a small PDF
2. **Monitor queue** and Edge Function logs
3. **Implement search UI** for end users
4. **Add retrieval tool** to chat for RAG-powered responses

## Support

For issues or questions, refer to:

- Supabase pgvector docs: <https://supabase.com/docs/guides/ai/vector-embeddings>
- Vercel AI SDK docs: <https://sdk.vercel.ai/docs>




























