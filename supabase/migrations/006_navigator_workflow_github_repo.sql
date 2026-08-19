-- Ralph build agent stores org-level GitHub repo metadata on workflow callbacks
ALTER TABLE navigator_workflows
  ADD COLUMN IF NOT EXISTS github_repo text,
  ADD COLUMN IF NOT EXISTS github_repo_url text;
