// Supabase Edge Function for Async Embedding Generation
// Uses Vercel AI Gateway for cost tracking and provider failover

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { embed } from "npm:ai";
import { createGatewayProvider } from "npm:@ai-sdk/gateway";
import { z } from "npm:zod";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

// Initialize Vercel AI Gateway provider
const gateway = createGatewayProvider({
  baseURL:
    Deno.env.get("VERCEL_AI_GATEWAY_URL") ??
    Deno.env.get("AI_GATEWAY_URL") ??
    "https://gateway.vercel.ai/v1",
  apiKey:
    Deno.env.get("VERCEL_AI_GATEWAY_API_KEY") ??
    Deno.env.get("AI_GATEWAY_API_KEY"),
});

// Initialize Postgres client
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!);

// Job schema validation
const jobSchema = z.object({
  jobId: z.number(),
  id: z.string(), // UUID of document_chunk
  schema: z.string(),
  table: z.string(),
  contentFunction: z.string(),
  embeddingColumn: z.string(),
  userId: z.string().optional(),
  projectId: z.string().optional(),
});

type Job = z.infer<typeof jobSchema>;
type FailedJob = Job & { error: string };

const QUEUE_NAME = "embedding_jobs";

// Main handler
Deno.serve(async (req) => {
  if (
    req.method !== "POST" ||
    req.headers.get("content-type") !== "application/json"
  ) {
    return new Response("expected POST with json body", { status: 400 });
  }

  const parseResult = z.array(jobSchema).safeParse(await req.json());
  if (parseResult.error) {
    return new Response(`invalid body: ${parseResult.error.message}`, {
      status: 400,
    });
  }

  const pendingJobs = parseResult.data;
  const completedJobs: Job[] = [];
  const failedJobs: FailedJob[] = [];

  async function processJobs() {
    let job: Job | undefined;
    while ((job = pendingJobs.shift()) !== undefined) {
      try {
        await processJob(job);
        completedJobs.push(job);
      } catch (error) {
        failedJobs.push({
          ...job,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  try {
    await Promise.race([processJobs(), catchUnload()]);
  } catch (error) {
    failedJobs.push(
      ...pendingJobs.map((job) => ({
        ...job,
        error: error instanceof Error ? error.message : String(error),
      })),
    );
  }

  console.log(
    `Finished: ${completedJobs.length} completed, ${failedJobs.length} failed`,
  );

  return new Response(JSON.stringify({ completedJobs, failedJobs }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "x-completed-jobs": String(completedJobs.length),
      "x-failed-jobs": String(failedJobs.length),
    },
  });
});

/**
 * Generate embedding for text using Vercel AI Gateway
 */
async function generateEmbedding(
  text: string,
  embeddingModel: string = "text-embedding-3-small",
) {
  // Map model name to gateway format (e.g., "text-embedding-3-small" -> "openai/text-embedding-3-small")
  // Support both formats for flexibility
  const gatewayModelId = embeddingModel.includes("/")
    ? embeddingModel // Already in gateway format
    : `openai/${embeddingModel}`; // Convert to gateway format

  // Get model from gateway using string ID
  const model = gateway(gatewayModelId);

  const result = await embed({
    model,
    value: text,
  });

  return result.embedding;
}

/**
 * Process a single embedding job
 */
async function processJob(job: Job) {
  const {
    jobId,
    id,
    schema,
    table,
    contentFunction,
    embeddingColumn: _embeddingColumn,
    userId: _userId,
    projectId: _projectId,
  } = job;

  // Get the chunk content
  const [row]: any[] = await sql`
    SELECT id, ${sql(contentFunction)}(t) as content
    FROM ${sql(schema)}.${sql(table)} t
    WHERE id = ${id}
  `;

  if (!row) throw new Error(`row not found: ${schema}.${table}/${id}`);
  if (typeof row.content !== "string") throw new Error(`invalid content type`);

  // Get embedding model from project (if projectId provided)
  let embeddingModel = "text-embedding-3-small"; // default
  if (_projectId) {
    try {
      const [project]: any[] = await sql`
        SELECT embedding_model FROM archive WHERE id = ${_projectId}
      `;
      if (project?.embedding_model) {
        embeddingModel = project.embedding_model;
      }
    } catch (error) {
      console.warn(
        "Could not fetch project embedding model, using default:",
        error,
      );
    }
  }

  // Generate embedding
  const embedding = await generateEmbedding(row.content, embeddingModel);

  // For our schema: Update the document_embedding table with the generated embedding
  // The chunk row itself doesn't have an embedding column
  // So we need to find or create the embedding record
  await sql`
    INSERT INTO document_embedding (chunk_id, embedding, model, created_at)
    VALUES (${id}, ${JSON.stringify(embedding)}, ${embeddingModel}, NOW())
    ON CONFLICT (chunk_id) 
    DO UPDATE SET 
      embedding = ${JSON.stringify(embedding)},
      model = ${embeddingModel}
  `;

  // Delete the job from the queue
  await sql`SELECT pgmq.delete(${QUEUE_NAME}, ${jobId}::bigint)`;

  console.log(`Processed chunk ${id} with model ${embeddingModel}`);
}

/**
 * Handle Edge Function unload events
 */
function catchUnload() {
  return new Promise((_, reject) => {
    addEventListener("beforeunload", (ev: any) => {
      reject(new Error(ev.detail?.reason));
    });
  });
}
