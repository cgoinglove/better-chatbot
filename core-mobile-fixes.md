# Shared Core Fixes Backlog

These are non-blocking fixes that should benefit both the web app and mobile
app. Required mobile-enabling backend changes belong in this branch directly,
not in this backlog.

## Permission Hardening

- Audit chat server actions for authorization symmetry with HTTP routes. The new
  mobile routes check thread/message ownership before mutation; equivalent server
  actions should be reviewed so direct calls cannot delete or rename resources
  outside the current user.
- Add focused tests around destructive chat operations: delete message, delete
  thread, delete all threads, rename thread, and regenerate from message.

## Error Contracts

- Normalize API error response bodies across web and mobile routes. Some routes
  return plain text responses while others return `{ error }` or `{ message }`.
  A shared shape would simplify web UI handling and native clients.

## Storage UX

- Surface storage misconfiguration consistently in web flows before upload starts,
  matching the structured details returned by `/api/storage/info`.
