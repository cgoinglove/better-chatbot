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
    this.logger.debug(
      `OAuth redirect URL: ${this.config._clientMetadata.redirect_uris[0]}`,
    );
    return this.config._clientMetadata.redirect_uris[0];
  }

  get clientMetadata(): OAuthClientMetadata {
    this.logger.debug(
      `OAuth client metadata: ${JSON.stringify(this.config._clientMetadata)}`,
    );
    return this.config._clientMetadata;
  }

  state(): string {
    return this.currentOAuthState;
  }

  async clientInformation(): Promise<OAuthClientInformation | undefined> {
    this.logger.debug(
      `Retrieving OAuth client information for server ${this.config.mcpServerId}`,
    );

    const authData = await this.getAuthData();
    if (authData?.clientInfo) {
      this.logger.debug(`Found OAuth client information`);
      return authData.clientInfo;
    }

    this.logger.debug(`No OAuth client information found for server`);
    return undefined;
  }

  async saveClientInformation(
    clientCredentials: OAuthClientInformationFull,
  ): Promise<void> {
    this.logger.info(
      `Storing OAuth client credentials for server ${this.config.mcpServerId}, client_id=${clientCredentials.client_id}`,
    );

    await this.saveAuthData({
      clientInfo: clientCredentials,
    });

    this.logger.debug(`OAuth client credentials stored successfully`);
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    this.logger.debug(
      `Retrieving OAuth tokens for server ${this.config.mcpServerId}`,
    );

    const authData = await this.getAuthData();
    if (authData?.tokens) {
      this.logger.debug(`Found OAuth tokens`);
      return authData.tokens;
    }

    this.logger.debug(`No OAuth tokens found for server`);
    return undefined;
  }

  async saveTokens(accessTokens: OAuthTokens): Promise<void> {
    this.logger.info(
      `Storing OAuth tokens for server ${this.config.mcpServerId}, has_refresh_token=${!!accessTokens.refresh_token}`,
    );

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
    this.logger.info(
      `Storing PKCE code verifier for server ${this.config.mcpServerId}`,
    );

    await this.saveAuthData({
      codeVerifier: pkceVerifier,
    });

    this.logger.debug(`PKCE code verifier stored`);
  }

  async codeVerifier(): Promise<string> {
    this.logger.debug(
      `Retrieving PKCE code verifier for server ${this.config.mcpServerId}`,
    );

    const authData = await pgMcpOAuthRepository.getOAuthSessionByState(
      this.currentOAuthState,
    );
    if (!authData?.codeVerifier) {
      throw new UnauthorizedError("OAuth code verifier not found");
    }

    this.logger.debug(`Found PKCE code verifier`);
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
