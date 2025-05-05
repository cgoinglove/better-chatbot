export const CacheKeys = {
  project: (projectId: string) => `project-${projectId}`,
  thread: (threadId: string) => `thread-${threadId}`,
  mcpBinding: (ownerId: string, ownerType: string) =>
    `mcp-binding-${ownerId}-${ownerType}`,
};
