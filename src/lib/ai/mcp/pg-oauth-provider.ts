import "server-only";

import type {
  OAuthTokens,
  OAuthClientInformationFull,
  OAuthClientMetadata,
  OAuthClientInformation,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import {
  OAuthClientProvider,
  UnauthorizedError,
} from "@modelcontextprotocol/sdk/client/auth.js";

import globalLogger from "lib/logger";
import { colorize } from "consola/utils";
import { generateUUID } from "lib/utils";
import { pgMcpOAuthRepository } from "lib/db/pg/repositories/mcp-oauth-repository.pg";
import { McpOAuthSession } from "app-types/mcp";
import { ConsolaInstance } from "consola";

/**
 * PostgreSQL-based OAuth client provider for MCP servers
 * Manages OAuth authentication state and tokens with session expiration
 */
export class PgOAuthClientProvider implements OAuthClientProvider {
  private currentOAuthState: string = generateUUID(); // Random UUID for OAuth security
  private cachedAuthData: McpOAuthSession | undefined;
  private logger: ConsolaInstance;

  constructor(
    private config: {
      name: string;
      mcpServerId: string;
      serverUrl: string;
      _clientMetadata: OAuthClientMetadata;
      onRedirectToAuthorization: (authUrl: URL) => Promise<void>;
    },
  ) {
    this.logger = globalLogger.withDefaults({
      message: colorize("dim", `[MCP OAuth Provider ${this.config.name}] `),
    });
  }

  private async getAuthData() {
    if (this.cachedAuthData) {
      return this.cachedAuthData;
    }
    this.cachedAuthData = await pgMcpOAuthRepository.getOAuthSession(
      this.config.mcpServerId,
    );
    return this.cachedAuthData;
  }

  private async saveAuthData(data: Partial<McpOAuthSession>) {
    this.cachedAuthData = await pgMcpOAuthRepository.saveOAuthSession(
      this.config.mcpServerId,
      {
        ...data,
        serverUrl: this.config.serverUrl,
        state: this.currentOAuthState, // Update current state
      },
    );
    return this.cachedAuthData;
  }

  get redirectUrl(): string {
    return this.config._clientMetadata.redirect_uris[0];
  }

  get clientMetadata(): OAuthClientMetadata {
    return this.config._clientMetadata;
  }

  state(): string {
    return this.currentOAuthState;
  }

  async clientInformation(): Promise<OAuthClientInformation | undefined> {
    const authData = await this.getAuthData();
    if (authData?.clientInfo) {
      if (
        !authData.tokens &&
        authData.clientInfo.redirect_uris[0] != this.redirectUrl
      ) {
        await pgMcpOAuthRepository.deleteOAuthData(this.config.mcpServerId);
        this.cachedAuthData = undefined;
        return undefined;
      }
      return authData.clientInfo;
    }

    return undefined;
  }

  async saveClientInformation(
    clientCredentials: OAuthClientInformationFull,
  ): Promise<void> {
    await this.saveAuthData({
      clientInfo: clientCredentials,
    });

    this.logger.debug(`OAuth client credentials stored successfully`);
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    const authData = await this.getAuthData();
    if (authData?.tokens) {
      return authData.tokens;
    }

    return undefined;
  }

  async saveTokens(accessTokens: OAuthTokens): Promise<void> {
    await this.saveAuthData({
      tokens: accessTokens,
    });

    this.logger.info(`OAuth tokens stored successfully`);
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    authorizationUrl.searchParams.set("state", this.state());
    await this.config.onRedirectToAuthorization(authorizationUrl);
  }

  async saveCodeVerifier(pkceVerifier: string): Promise<void> {
    await this.saveAuthData({
      codeVerifier: pkceVerifier,
    });
  }

  async codeVerifier(): Promise<string> {
    const authData = await this.getAuthData();
    if (!authData?.codeVerifier) {
      throw new UnauthorizedError("OAuth code verifier not found");
    }
    return authData.codeVerifier;
  }

  async invalidateCredentials(
    invalidationScope: "all" | "client" | "tokens" | "verifier",
  ): Promise<void> {
    this.logger.info(
      `Invalidating OAuth credentials for server ${this.config.mcpServerId}, scope: ${invalidationScope}`,
    );

    try {
      switch (invalidationScope) {
        case "all":
        case "tokens":
        case "verifier":
          await pgMcpOAuthRepository.deleteOAuthData(this.config.mcpServerId);
          this.cachedAuthData = undefined;
          this.logger.info(`OAuth credentials invalidated`);
          break;

        case "client":
          this.logger.debug(
            `Client credential invalidation - clearing all data`,
          );
          await pgMcpOAuthRepository.deleteOAuthData(this.config.mcpServerId);
          this.cachedAuthData = undefined;
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to invalidate OAuth credentials: ${error}`);
      throw error;
    }
  }
}
