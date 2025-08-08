## 🔐 MCP OAuth Flow

The app acts as the OAuth client and stores OAuth sessions in PostgreSQL. On server startup, MCP clients attempt to connect. If authentication is required, the client enters the authorizing state and the UI prompts the user to authorize.

```mermaid
sequenceDiagram
  autonumber
  participant User as User
  participant UI as MCPCard/UI
  participant App as Next App (Server)
  participant Client as MCPClient
  participant Provider as PgOAuthClientProvider
  participant Repo as OAuthRepository(DB)
  participant OAuthSrv as OAuth Server(MCP)

  Note over App: Server boot → MCP manager init
  App->>Client: connect()
  Client->>Provider: attach OAuth provider if needed
  Provider->>Repo: find token session
  alt token session exists
    Provider-->>Client: use authenticated session
  else no token session
    Provider->>Repo: use in‑progress or create new state session
    Client-->>UI: status = authorizing (needs user action)
  end

  User->>UI: click Authorize
  UI->>App: authorizeMcpClientAction(id)
  App->>Client: refreshClient(id)
  Client-->>UI: authorizationUrl
  UI->>OAuthSrv: popup login/consent
  OAuthSrv-->>App: /api/mcp/oauth/callback?code&state
  App->>Repo: get session by state
  App->>Client: finishAuth(code)
  Client->>Provider: saveTokens(tokens)
  Provider->>Repo: saveTokensAndCleanup(mcpServerId, state)
  App->>Client: refreshClient(id)
  App-->>UI: postMessage(MCP_OAUTH_SUCCESS)
```

Notes:

- Multi‑instance safe: unique state per attempt; when tokens are saved, incomplete sessions for the same server are cleaned up.
- Security guard: redirect URI mismatch clears all sessions and restarts the flow.


