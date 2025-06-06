export const CacheKeys = {
  project: (projectId: string) => `project-${projectId}`,
  thread: (threadId: string) => `thread-${threadId}`,
  user: (userId: string) => `user-${userId}`,
  mcpServerCustomizations: (userId: string) =>
    `mcp-server-customizations-${userId}`,
};
