# Workflow Scheduler

Trigger published workflows on a recurring cadence by combining the Scheduler node with the `/api/workflow/schedules/dispatch` endpoint. This guide explains what you need to configure, how schedule execution works, and a few examples for wiring it up to cron jobs or external task runners.

## Requirements

- **Workflow Scheduler Secret** – set `WORKFLOW_SCHEDULER_SECRET` in `.env` (any random string). Every dispatch request must present this secret.
- **Published workflow** – only published workflows that contain at least one Scheduler node are eligible to run. Draft workflows are ignored.
- **Cron or job runner** – you must call the dispatch endpoint on a cadence (e.g., Vercel Cron, GitHub Actions, Cloudflare Workers, Kubernetes CronJob, or a local `cron` entry).

## Configuring Scheduler Nodes

1. Add a **Scheduler** node to your workflow and fill in:
   - `cron` – standard 5-part cron expression (validated via `cron-parser`).
   - `timezone` – Olson TZ string (defaults to the workflow owner's timezone).
   - `enabled` – scheduler rows are skipped when disabled.
   - `payload` – optional JSON object passed as the workflow input when this schedule runs.
2. Publish the workflow. Saving/publishing will upsert the node's schedule in the `workflow_schedule` table and compute the next run time.

When a schedule fires, the workflow executor runs with:

- The node's `payload` merged into the execution `query`.
- Optional workflow context containing the owner's id, name, and email (when available).
- History disabled and a 5-minute timeout to keep scheduler runs short-lived.

## Dispatch Endpoint

```
POST /api/workflow/schedules/dispatch
```

### Authentication

Send the scheduler secret by using one of the supported headers:

- `Authorization: Bearer <WORKFLOW_SCHEDULER_SECRET>`
- `x-workflow-scheduler-secret: <WORKFLOW_SCHEDULER_SECRET>`
- `x-cron-secret: <WORKFLOW_SCHEDULER_SECRET>`

The request is rejected with `401 Unauthorized` when the secret is missing or mismatched. A `500` error indicates the secret is not configured on the server.

### Request Body

`Content-Type: application/json` with the following optional fields:

- `limit` – maximum number of schedules to process (default `5`, min `1`, max `25`).
- `dryRun` – when `true`, schedules are locked then immediately released (useful for monitoring or smoke tests).

### Response Shape

```json
{
  "ok": true,
  "result": {
    "scanned": 3,
    "locked": 2,
    "success": 2,
    "failed": 0,
    "skipped": 1,
    "errors": []
  }
}
```

- `scanned` – due schedules inspected during this dispatch.
- `locked` – schedules successfully locked by this worker.
- `success` / `failed` – execution outcome counts.
- `skipped` – schedules skipped because they were already locked, disabled, or the request was a dry run.
- `errors` – array of `{ scheduleId, message }` entries for failed runs.

Locks automatically expire after five minutes to protect against stuck workers. Each successful run recomputes the next run time using the stored cron expression.

## Example Cron Invocations

### Local cron (every minute)

```bash
* * * * * curl -s -X POST \
  -H "x-workflow-scheduler-secret: $WORKFLOW_SCHEDULER_SECRET" \
  https://your-domain.com/api/workflow/schedules/dispatch > /dev/null
```

### Vercel Cron Job

1. Set `WORKFLOW_SCHEDULER_SECRET` in your Vercel project settings.
2. Add a cron entry in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/workflow/schedules/dispatch",
      "schedule": "*/5 * * * *",
      "headers": {
        "x-workflow-scheduler-secret": "@WORKFLOW_SCHEDULER_SECRET"
      }
    }
  ]
}
```

Vercel automatically injects the secret value referenced by the `@` syntax.

### GitHub Actions

```yaml
name: Workflow Scheduler
on:
  schedule:
    - cron: "*/10 * * * *"
jobs:
  dispatch:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger schedules
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.WORKFLOW_SCHEDULER_SECRET }}" \
            https://your-domain.com/api/workflow/schedules/dispatch
```

## Troubleshooting

- **`Unauthorized`** – confirm the header value matches `WORKFLOW_SCHEDULER_SECRET` on the server.
- **`ok: true` but `skipped` > 0** – another worker already locked those schedules, or the request used `dryRun: true`.
- **Workflows never run** – ensure the workflow is published and the Scheduler node is enabled with a valid cron + timezone.
- **Need visibility** – temporarily run with `dryRun: true` to gather lock stats without executing flows.

With these steps in place, your Scheduler nodes will run reliably at whatever cadence you define.
