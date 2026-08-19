-- Cleanup Extension Tables
-- Prevents unbounded growth of pg_net and pg_cron system tables

-- Purge pg_net HTTP response history older than 1 day
-- net._http_response stores every response from net.http_post() calls made by
-- util.invoke_edge_function() in the embedding pipeline
SELECT cron.schedule(
  'cleanup-net-http-response',
  '0 * * * *',
  $$DELETE FROM net._http_response WHERE created < NOW() - INTERVAL '1 day';$$
);

-- Purge pg_cron job run history older than 7 days
-- cron.job_run_details accumulates ~8,640 rows/day from the 10-second
-- process-embeddings job
SELECT cron.schedule(
  'cleanup-cron-job-run-details',
  '0 0 * * *',
  $$DELETE FROM cron.job_run_details WHERE end_time < NOW() - INTERVAL '7 days';$$
);
