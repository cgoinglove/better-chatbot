-- Cleanup model_route_audit
-- Prevents unbounded growth of the routing telemetry table.

-- Purge model_route_audit rows older than 90 days.
-- The router writes one fire-and-forget row per routed message
-- (lib/ai/routing/service.ts) and nothing reads it back, so old rows are pure
-- telemetry. Billing lives in member_ai_usage_period / member_ai_reservation,
-- not here, so pruning is safe.
SELECT cron.schedule(
  'cleanup-model-route-audit',
  '0 0 * * *',
  $$DELETE FROM model_route_audit WHERE created_at < NOW() - INTERVAL '90 days';$$
);
