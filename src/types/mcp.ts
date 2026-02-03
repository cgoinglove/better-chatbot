import {
  OAuthClientInformationFull,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { Tool } from "ai";
import { tag } from "lib/tag";
import { z } from "zod";

export const MCPRemoteConfigZodSchema = z.object({
  url: z.string().url().describe("The URL of the SSE endpoint"),
  headers: z.record(z.string(), z.string()).optional(),
});

export const MCPStdioConfigZodSchema = z.object({
  command: z.string().min(1).describe("The command to run"),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
});

export const AllowedMCPServerZodSchema = z.object({
  tools: z.array(z.string()),
  // resources: z.array(z.string()).optional(),
});

export type AllowedMCPServer = z.infer<typeof AllowedMCPServerZodSchema>;

export type MCPRemoteConfig = z.infer<typeof MCPRemoteConfigZodSchema>;
export type MCPStdioConfig = z.infer<typeof MCPStdioConfigZodSchema>;

export type MCPServerConfig = MCPRemoteConfig | MCPStdioConfig;

export type MCPToolInfo = {
  name: string;
  description: string;
  inputSchema?: {
    type?: any;
    properties?: Record<string, any>;
    required?: string[];
  };
};

// Authentication provider types for MCP servers
export type McpAuthProvider = "okta" | "oauth2" | "none";

// Authentication configuration for MCP servers
export type McpAuthConfig = {
  issuer?: string; // e.g., https://your-domain.okta.com
  clientId?: string;
  scopes?: string[];
  audience?: string;
};

export type MCPServerInfo = {
  id: string;
  name: string;
  config?: MCPServerConfig; // Optional - hidden from non-owners for security
  visibility: "public" | "private";
  error?: unknown;
  enabled: boolean;
  userId: string;
  status:
    | "connected"
    | "disconnected"
    | "loading"
    | "authorizing"
    | "auth_required";
  toolInfo: MCPToolInfo[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
  userName?: string | null;
  userAvatar?: string | null;
  description?: string; // For ShareableCard compatibility
  icon?: {
    value?: string;
    style?: {
      backgroundColor?: string;
    };
  };
  // User Session Authorization - enables per-user session isolation
  // When true, each user maintains their own authorization session with this MCP server
  userSessionAuth?: boolean;
  // Indicates if the current user has an active authorized session
  isAuthorized?: boolean;
  // Authentication configuration (admin-configured)
  requiresAuth?: boolean;
  authProvider?: McpAuthProvider;
  authConfig?: McpAuthConfig;
  // Per-user authentication status (runtime)
  userAuthStatus?: "authenticated" | "unauthenticated" | "expired";
};

export type McpServerInsert = {
  name: string;
  config: MCPServerConfig;
  id?: string;
  userId: string;
  visibility?: "public" | "private";
  userSessionAuth?: boolean; // User Session Authorization - per-user session isolation
  toolInfo?: MCPToolInfo[];
  requiresAuth?: boolean;
  authProvider?: McpAuthProvider;
  authConfig?: McpAuthConfig;
};

export type McpServerSelect = {
  name: string;
  config: MCPServerConfig;
  id: string;
  userId: string;
  visibility: "public" | "private";
  userSessionAuth: boolean; // User Session Authorization - per-user session isolation
  toolInfo?: MCPToolInfo[] | null;
  requiresAuth: boolean;
  authProvider: McpAuthProvider;
  authConfig?: McpAuthConfig;
};

export type VercelAIMcpTool = Tool & {
  _mcpServerName: string;
  _mcpServerId: string;
  _originToolName: string;
};

export const VercelAIMcpToolTag = tag<VercelAIMcpTool>("mcp");

export interface MCPRepository {
  save(server: McpServerInsert): Promise<McpServerSelect>;
  selectById(id: string): Promise<McpServerSelect | null>;
  selectByServerName(name: string): Promise<McpServerSelect | null>;
  selectAll(): Promise<McpServerSelect[]>;
  selectAllForUser(userId: string): Promise<McpServerSelect[]>;
  deleteById(id: string): Promise<void>;
  existsByServerName(name: string): Promise<boolean>;
  updateVisibility(id: string, visibility: "public" | "private"): Promise<void>;
  updateUserSessionAuth(id: string, userSessionAuth: boolean): Promise<void>;
}

export const McpToolCustomizationZodSchema = z.object({
  toolName: z.string().min(1),
  mcpServerId: z.string().min(1),
  prompt: z.string().max(1000).optional().nullable(),
});

export type McpToolCustomization = {
  id: string;
  userId: string;
  toolName: string;
  mcpServerId: string;
  prompt?: string | null;
};

export type McpToolCustomizationRepository = {
  select(key: {
    userId: string;
    mcpServerId: string;
    toolName: string;
  }): Promise<McpToolCustomization | null>;
  selectByUserIdAndMcpServerId: (key: {
    userId: string;
    mcpServerId: string;
  }) => Promise<McpToolCustomization[]>;
  selectByUserId: (
    userId: string,
  ) => Promise<(McpToolCustomization & { serverName: string })[]>;
  upsertToolCustomization: (
    data: PartialBy<McpToolCustomization, "id">,
  ) => Promise<McpToolCustomization>;
  deleteToolCustomization: (key: {
    userId: string;
    mcpServerId: string;
    toolName: string;
  }) => Promise<void>;
};

export const McpServerCustomizationZodSchema = z.object({
  mcpServerId: z.string().min(1),
  prompt: z.string().max(3000).optional().nullable(),
});

export type McpServerCustomization = {
  id: string;
  userId: string;
  mcpServerId: string;
  prompt?: string | null;
};

export type McpServerCustomizationRepository = {
  selectByUserIdAndMcpServerId: (key: {
    userId: string;
    mcpServerId: string;
  }) => Promise<(McpServerCustomization & { serverName: string }) | null>;
  selectByUserId: (
    userId: string,
  ) => Promise<(McpServerCustomization & { serverName: string })[]>;
  upsertMcpServerCustomization: (
    data: PartialBy<McpServerCustomization, "id">,
  ) => Promise<McpServerCustomization>;
  deleteMcpServerCustomizationByMcpServerIdAndUserId: (key: {
    mcpServerId: string;
    userId: string;
  }) => Promise<void>;
};

export type McpServerCustomizationsPrompt = {
  name: string;
  id: string;
  prompt?: string;
  tools?: {
    [toolName: string]: string;
  };
};

const TextContent = z.object({
  type: z.literal("text"),
  text: z.string(),
  _meta: z.object({}).passthrough().optional(),
});

const ImageContent = z.object({
  type: z.literal("image"),
  data: z.string(),
  mimeType: z.string(),
  _meta: z.object({}).passthrough().optional(),
});

const AudioContent = z.object({
  type: z.literal("audio"),
  data: z.string(),
  mimeType: z.string(),
  _meta: z.object({}).passthrough().optional(),
});

const ResourceLinkContent = z.object({
  type: z.literal("resource_link"),
  name: z.string(),
  title: z.string().optional(),
  uri: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  _meta: z.object({}).passthrough().optional(),
});

const ResourceText = z.object({
  uri: z.string(),
  mimeType: z.string().optional(),
  _meta: z.object({}).passthrough().optional(),
  text: z.string(),
});

const ResourceBlob = z.object({
  uri: z.string(),
  mimeType: z.string().optional(),
  _meta: z.object({}).passthrough().optional(),
  blob: z.string(),
});

const ResourceContent = z.object({
  type: z.literal("resource"),
  resource: z.union([ResourceText, ResourceBlob]),
  _meta: z.object({}).passthrough().optional(),
});

const ContentUnion = z.union([
  TextContent,
  ImageContent,
  AudioContent,
  ResourceLinkContent,
  ResourceContent,
]);

export const CallToolResultSchema = z.object({
  _meta: z.object({}).passthrough().optional(),
  content: z.array(ContentUnion).default([]),
  structuredContent: z.object({}).passthrough().optional(),
  isError: z.boolean().optional(),
});

export type CallToolResult = z.infer<typeof CallToolResultSchema>;

export type McpOAuthSession = {
  id: string;
  mcpServerId: string;
  userId?: string | null; // User Session Authorization - when set, session is user-specific
  serverUrl: string;
  clientInfo?: OAuthClientInformationFull;
  tokens?: OAuthTokens;
  codeVerifier?: string;
  state?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type McpOAuthRepository = {
  // 1. Query methods

  // Get session with valid tokens (authorized)
  // When userId is provided, looks for user-specific authorization session
  // When userId is undefined, looks for shared/server-level session
  getAuthenticatedSession(
    mcpServerId: string,
    userId?: string,
  ): Promise<McpOAuthSession | undefined>;

  // Get session by OAuth state (for callback handling)
  getSessionByState(state: string): Promise<McpOAuthSession | undefined>;

  // 2. Create/Update methods

  // Create new OAuth session
  createSession(
    mcpServerId: string,
    data: Partial<McpOAuthSession>,
  ): Promise<McpOAuthSession>;

  // Update existing session by state
  updateSessionByState(
    state: string,
    data: Partial<McpOAuthSession>,
  ): Promise<McpOAuthSession>;

  // Save tokens and cleanup incomplete sessions
  saveTokensAndCleanup(
    state: string,
    mcpServerId: string,
    data: Partial<McpOAuthSession>,
  ): Promise<McpOAuthSession>;

  // Delete a session by its OAuth state
  deleteByState(state: string): Promise<void>;
};

// ============================================================================
// USER SESSION AND AUTHORIZATION MANAGEMENT
// ============================================================================
// This section defines types for managing user sessions and authorization
// for MCP server access. Each user maintains their own authorization state
// per MCP server, ensuring session isolation and proper access governance.
// ============================================================================

/**
 * User Session Authorization - stores user-specific authorization tokens for MCP servers
 * Each user has an isolated session per MCP server they're authorized to access.
 */
export type UserSessionAuthorization = {
  id: string;
  userId: string;
  mcpServerId: string;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  tokenType?: string;
  expiresAt?: Date;
  scope?: string;
  state?: string;
  codeVerifier?: string;
  createdAt: Date;
  updatedAt: Date;
};

// Alias for backward compatibility
export type McpUserOAuthSession = UserSessionAuthorization;

/**
 * User Session Authorization Repository
 * Manages user authorization sessions for MCP server access
 */
export type UserSessionAuthorizationRepository = {
  // Query methods

  /**
   * Get authenticated session for a user and MCP server
   * Returns the user's authorization if they have valid tokens
   */
  getAuthenticatedSession(
    userId: string,
    mcpServerId: string,
  ): Promise<UserSessionAuthorization | undefined>;

  /**
   * Get session by OAuth state (for callback handling)
   * Used during the OAuth flow to match callbacks to sessions
   */
  getSessionByState(
    state: string,
  ): Promise<UserSessionAuthorization | undefined>;

  /**
   * Check if user has valid (non-expired) tokens for an MCP server
   * Returns true if the user is authorized and tokens haven't expired
   */
  hasValidTokens(userId: string, mcpServerId: string): Promise<boolean>;

  /**
   * Get all MCP servers the user is authorized to access
   * Returns list of MCP server IDs where user has valid authorization
   */
  getAuthenticatedServersForUser(userId: string): Promise<string[]>;

  // Create/Update methods

  /**
   * Create or update authorization session for user
   * Used to initialize OAuth flow or update session state
   */
  upsertSession(
    userId: string,
    mcpServerId: string,
    data: Partial<UserSessionAuthorization>,
  ): Promise<UserSessionAuthorization>;

  /**
   * Save tokens after successful OAuth callback
   * Stores the authorization tokens for the user's session
   */
  saveTokens(
    state: string,
    tokens: {
      accessToken: string;
      refreshToken?: string;
      idToken?: string;
      expiresAt?: Date;
      scope?: string;
    },
  ): Promise<UserSessionAuthorization>;

  /**
   * Update session by OAuth state
   * Used during OAuth flow to update session with new data
   */
  updateSessionByState(
    state: string,
    data: Partial<UserSessionAuthorization>,
  ): Promise<UserSessionAuthorization>;

  // Delete methods

  /**
   * Revoke user's authorization for a specific MCP server
   */
  deleteSession(userId: string, mcpServerId: string): Promise<void>;

  /**
   * Delete session by OAuth state
   * Used for cleanup during OAuth flow errors
   */
  deleteByState(state: string): Promise<void>;

  /**
   * Revoke all user's MCP server authorizations
   * Used when user logs out or account is deleted
   */
  deleteAllForUser(userId: string): Promise<void>;
};

// Alias for backward compatibility
export type McpUserOAuthRepository = UserSessionAuthorizationRepository;
