# Self-hosting

Everything you need to run better-chatbot yourself, in the order you will need
it. The [README](../README.md) has the three-variable quick start; this is the
reference behind it.

## Requirements

- **Postgres 15+ with `pgvector`.** Document embeddings are stored as
  `vector(1536)`, so the extension is not optional. The bundled compose file
  uses `pgvector/pgvector:pg17`; Supabase, Neon and RDS all offer it.
- **Node 20+ and pnpm 10** if you are running without Docker.
- **A model provider.** The Vercel AI Gateway is the default; Ollama, LM Studio,
  TensorX or any OpenAI-compatible endpoint work too.

## Required configuration

| Variable | Purpose |
| --- | --- |
| `POSTGRES_URL` | Postgres connection string, pgvector enabled |
| `BETTER_AUTH_SECRET` | Session signing key — `npx @better-auth/cli@latest secret` |
| `AI_GATEWAY_API_KEY` | Serves every model in the catalog |

The server refuses to start without these and tells you which one is missing. If
you configure a different provider (`TENSORX_API_KEY`, `GROQ_API_KEY`,
`OLLAMA_BASE_URL`, `OPENAI_COMPATIBLE_DATA`), that satisfies the model
requirement in place of the gateway key.

Once you are not on localhost, also set `BETTER_AUTH_URL` and
`NEXT_PUBLIC_BASE_URL` to the public URL of your instance, or sign-in redirects
and OAuth callbacks will point at the wrong host.

## Storage

File uploads go to Supabase Storage. Without it the app runs fine — attachments,
avatars and generated images are simply unavailable.

1. Create a Supabase project (the free tier is enough; you are using it for
   object storage, not as your database unless you want to).
2. Create three buckets: `attachments` (private), `avatars` (public) and
   `ai-generated` (public).
3. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL`.

`NEXT_PUBLIC_SUPABASE_URL` must match `SUPABASE_URL`. The browser uses it to
build file URLs and to run resumable (TUS) uploads, which is how large files
avoid request-size limits. Uploads fail with a clear message if it is unset.

## Retrieval

Project documents are chunked, embedded through your model provider, and
searched with pgvector. This needs no extra service.

`AGENTSET_API_KEY` adds knowledge bases — hosted ingestion and retrieval with
reranking and citations. Without it, knowledge bases are unavailable and
projects fall back to local search.

## Background jobs

Scheduled tasks, project-brain ingestion and the sandbox reaper run on Inngest.
For local development `npx inngest-cli dev` needs no keys; for production set
`INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY`.

You can run without Inngest. Two of the jobs are plain HTTP endpoints — set
`SCHEDULED_TASK_SECRET` and drive them from cron:

```bash
curl -X POST https://your-instance/api/scheduled-tasks/cron \
  -H "X-Scheduled-Task-Auth: $SCHEDULED_TASK_SECRET"

curl -X POST https://your-instance/api/sandbox/reaper \
  -H "X-Scheduled-Task-Auth: $SCHEDULED_TASK_SECRET"
```

Project-brain ingestion has no HTTP fallback and stays idle without Inngest.

## Redis

Optional, and used for one thing: resumable chat streams. With `REDIS_URL` set,
a response keeps generating when the viewer closes the tab and can be picked up
again, and a stop from one browser reaches an instance serving another. Without
it, a stream is bound to the viewer that started it and the cache is
per-instance — fine for a single-instance deployment.

## Sign-in

Email and password works out of the box; the first account created becomes the
administrator. OAuth is available for GitHub, Google and Microsoft — set the
corresponding `*_CLIENT_ID` and `*_CLIENT_SECRET` pairs.

`DISABLE_SIGN_UP=1` closes registration after you have made your accounts, which
is what you want on an instance exposed to the internet.

**Password resets:** Better Auth generates the reset link, but this edition
ships no email provider, so nothing delivers it. Reset passwords from the admin
area, or implement `sendPasswordResetEmail` in `apps/web/src/lib/gate/impl.ts`
to hook up your own mail service.

## Running behind a proxy

Terminate TLS at your proxy and forward to port 3000. Set `BETTER_AUTH_URL` and
`NEXT_PUBLIC_BASE_URL` to the public HTTPS URL so cookies get the right domain
and secure flag. For local HTTP without certificates, `NO_HTTPS=1`.

## Database maintenance

Migrations run automatically at boot. To apply them yourself:

```bash
pnpm db:migrate
```

On a database you created with `pnpm db:push` rather than migrations, start with
`SKIP_DB_MIGRATE=1` so boot does not try to replay history the database never
had.

`POSTGRES_POOL_MAX` is the pool size **per instance**. Keep
`instances × POSTGRES_POOL_MAX` under your database's connection limit —
a pooled Postgres is easy to exhaust under concurrent chat load.

Back up with `pg_dump` before upgrading. Nothing here is exotic; it is a single
Postgres database plus whatever you put in object storage.

## Upgrading from 1.x

See [Upgrading](../README.md#upgrading-from-1x). Back up first — the migration
is one-way.

## Telemetry

There is none. No analytics, no phone-home, no usage reporting. If you want
observability for your own instance, set `SUPERLOG_PUBLIC_TOKEN` and traces go
to the endpoint you configure — and nowhere else.
