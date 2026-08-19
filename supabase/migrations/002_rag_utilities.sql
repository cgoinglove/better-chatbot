-- RAG Utility Functions and Secrets
-- Run this in Supabase SQL Editor

-- Schema for utility functions
CREATE SCHEMA IF NOT EXISTS util;

-- IMPORTANT: First add your project URL to Vault manually via SQL Editor:
-- For Cloud: SELECT vault.create_secret('https://your-project.vercel.app', 'project_url');
-- For Local: SELECT vault.create_secret('http://localhost:3000', 'project_url');

-- Utility to get project URL for Edge Function callbacks
CREATE OR REPLACE FUNCTION util.project_url()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  secret_value text;
BEGIN
  SELECT decrypted_secret INTO secret_value 
  FROM vault.decrypted_secrets 
  WHERE name = 'project_url';
  RETURN secret_value;
END;
$$;

-- Generic function to invoke any Edge Function
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
  -- Reuse PostgREST session headers if available
  headers_raw := current_setting('request.headers', true);
  
  auth_header := CASE
    WHEN headers_raw IS NOT NULL THEN
      (headers_raw::json->>'authorization')
    ELSE
      NULL
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

-- Utility trigger to clear a column on update
CREATE OR REPLACE FUNCTION util.clear_column()
RETURNS trigger
LANGUAGE plpgsql 
AS $$
DECLARE
  clear_column text := TG_ARGV[0];
BEGIN
  NEW := NEW #= hstore(clear_column, NULL);
  RETURN NEW;
END;
$$;

-- Comment
COMMENT ON SCHEMA util IS 'Utility functions for RAG pipeline';
COMMENT ON FUNCTION util.project_url() IS 'Get project URL from vault for Edge Function calls';
COMMENT ON FUNCTION util.invoke_edge_function(text, jsonb, int) IS 'Invoke Edge Function asynchronously via pg_net';
COMMENT ON FUNCTION util.clear_column() IS 'Trigger function to clear a column on update';




























