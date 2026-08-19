-- Fix: Store Supabase Service Role Key in Vault for Edge Function Authentication
-- This allows pg_cron and triggers to invoke Edge Functions with proper auth

-- Step 1: Store the service role key in Vault
-- IMPORTANT: Run this manually after applying the migration:
-- SELECT vault.create_secret('your-service-role-key-here', 'supabase_service_role_key');

-- Step 2: Create helper function to retrieve service role key
CREATE OR REPLACE FUNCTION util.service_role_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  secret_value text;
BEGIN
  SELECT decrypted_secret INTO secret_value 
  FROM vault.decrypted_secrets 
  WHERE name = 'supabase_service_role_key';
  
  IF secret_value IS NULL THEN
    RAISE EXCEPTION 'Service role key not found in Vault. Run: SELECT vault.create_secret(''your-key'', ''supabase_service_role_key'')';
  END IF;
  
  RETURN secret_value;
END;
$$;

-- Step 3: Update invoke_edge_function to use service role key as fallback
CREATE OR REPLACE FUNCTION util.invoke_edge_function(
  name text,
  body jsonb,
  timeout_milliseconds int = 5 * 60 * 1000  -- 5 minute default
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  headers_raw text;
  auth_header text;
BEGIN
  -- Try to reuse PostgREST session headers if available
  headers_raw := current_setting('request.headers', true);
  
  auth_header := CASE
    WHEN headers_raw IS NOT NULL THEN
      (headers_raw::json->>'authorization')
    ELSE
      -- ✅ FIX: Fall back to service role key for pg_cron/trigger calls
      'Bearer ' || util.service_role_key()
  END;
  
  -- Async HTTP request to Edge Function
  PERFORM net.http_post(
    url => util.project_url() || '/functions/v1/' || name,
    headers => jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', auth_header
    ),
    body => body,
    timeout_milliseconds => timeout_milliseconds
  );
END;
$$;

-- Step 4: Grant necessary permissions
GRANT EXECUTE ON FUNCTION util.service_role_key() TO postgres;
GRANT EXECUTE ON FUNCTION util.invoke_edge_function(text, jsonb, int) TO postgres;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete! Now run manually:';
  RAISE NOTICE '   SELECT vault.create_secret(''your-supabase-service-role-key'', ''supabase_service_role_key'');';
END $$;



























