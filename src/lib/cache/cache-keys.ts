export const CacheKeys = {
  thread: (threadId: string) => `thread-${threadId}`,
  user: (userId: string) => `user-${userId}`,
  mcpServerCustomizations: (userId: string) =>
    `mcp-server-customizations-${userId}`,
  agentInstructions: (agent: string) => `agent-instructions-${agent}`,
  e2bSession: (threadId: string) => `e2b:${threadId}`,
};
