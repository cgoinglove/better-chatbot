import type {
  SalesforceAuthConfig,
  SalesforceQueryResult,
} from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SalesforceDescribeField = {
  name: string;
  label: string;
  type: string;
  length: number;
  nillable: boolean;
  updateable: boolean;
  createable: boolean;
  custom: boolean;
  referenceTo: string[];
};

export type SalesforceDescribeResult = {
  name: string;
  label: string;
  labelPlural: string;
  keyPrefix: string;
  fields: SalesforceDescribeField[];
  queryable: boolean;
  createable: boolean;
  updateable: boolean;
  deletable: boolean;
  urls: Record<string, string>;
};

type SalesforceErrorBody = {
  message: string;
  errorCode: string;
  fields?: string[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_VERSION = "v59.0";

/** Maximum number of retries for rate-limited or transient-error responses. */
const MAX_RETRIES = 3;

/** Base delay (ms) for exponential back-off between retries. */
const BASE_RETRY_DELAY_MS = 1_000;

// ---------------------------------------------------------------------------
// SalesforceClient
// ---------------------------------------------------------------------------

/**
 * Lightweight Salesforce REST API client that uses the standard `fetch` API
 * with OAuth 2.0 authentication, automatic token refresh, rate-limit handling
 * via exponential back-off, and full SOQL query pagination support.
 */
export class SalesforceClient {
  private config: SalesforceAuthConfig;
  private apiBase: string;

  constructor(config: SalesforceAuthConfig) {
    this.config = { ...config };
    // Ensure the instance URL never has a trailing slash
    this.config.instanceUrl = this.config.instanceUrl.replace(/\/+$/, "");
    this.apiBase = `${this.config.instanceUrl}/services/data/${API_VERSION}`;
  }

  // -----------------------------------------------------------------------
  // Authentication
  // -----------------------------------------------------------------------

  /**
   * Exchange an authorization code for an access / refresh token pair via
   * the Salesforce OAuth 2.0 token endpoint.
   *
   * @param authorizationCode - The code returned by the Salesforce authorize redirect.
   */
  async authenticate(authorizationCode?: string): Promise<void> {
    const params = new URLSearchParams();

    if (authorizationCode) {
      params.set("grant_type", "authorization_code");
      params.set("code", authorizationCode);
      params.set("redirect_uri", this.config.redirectUri);
    } else if (this.config.refreshToken) {
      params.set("grant_type", "refresh_token");
      params.set("refresh_token", this.config.refreshToken);
    } else {
      throw new Error(
        "SalesforceClient.authenticate() requires either an authorization code or a refresh token.",
      );
    }

    params.set("client_id", this.config.clientId);
    params.set("client_secret", this.config.clientSecret);

    const response = await fetch(
      `${this.config.instanceUrl}/services/oauth2/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Salesforce OAuth token exchange failed (${response.status}): ${body}`,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      instance_url: string;
      issued_at: string;
    };

    this.config.accessToken = data.access_token;
    if (data.refresh_token) {
      this.config.refreshToken = data.refresh_token;
    }
    // Salesforce tokens last 2 hours by default; we mark expiry 5 minutes
    // early to allow for clock-skew and network latency.
    this.config.tokenExpiresAt =
      Number(data.issued_at) + 2 * 60 * 60 * 1_000 - 5 * 60 * 1_000;

    // The instance URL returned by Salesforce may differ from the one the
    // caller configured (e.g. after org migration). Always prefer the
    // authoritative URL.
    if (data.instance_url) {
      this.config.instanceUrl = data.instance_url.replace(/\/+$/, "");
      this.apiBase = `${this.config.instanceUrl}/services/data/${API_VERSION}`;
    }
  }

  /**
   * Refresh the current access token using the stored refresh token.
   * Falls back to calling {@link authenticate} without a code.
   */
  async refreshAccessToken(): Promise<void> {
    if (!this.config.refreshToken) {
      throw new Error(
        "SalesforceClient.refreshAccessToken() requires a refresh token. " +
          "Call authenticate() with an authorization code first.",
      );
    }

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.config.refreshToken,
    });

    const response = await fetch(
      `${this.config.instanceUrl}/services/oauth2/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Salesforce token refresh failed (${response.status}): ${body}`,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      issued_at: string;
      instance_url?: string;
    };

    this.config.accessToken = data.access_token;
    this.config.tokenExpiresAt =
      Number(data.issued_at) + 2 * 60 * 60 * 1_000 - 5 * 60 * 1_000;

    if (data.instance_url) {
      this.config.instanceUrl = data.instance_url.replace(/\/+$/, "");
      this.apiBase = `${this.config.instanceUrl}/services/data/${API_VERSION}`;
    }
  }

  // -----------------------------------------------------------------------
  // SOQL queries
  // -----------------------------------------------------------------------

  /**
   * Execute a SOQL query and return the first page of results.
   */
  async query<T>(soql: string): Promise<SalesforceQueryResult<T>> {
    return this.request<SalesforceQueryResult<T>>(
      `/query?q=${encodeURIComponent(soql)}`,
    );
  }

  /**
   * Fetch the next page of a paginated SOQL query result.
   *
   * @param nextRecordsUrl - The relative URL returned by the previous page
   *                         (the `nextRecordsUrl` field).
   */
  async queryMore<T>(
    nextRecordsUrl: string,
  ): Promise<SalesforceQueryResult<T>> {
    // `nextRecordsUrl` from Salesforce is already a path like
    // "/services/data/v59.0/query/01g...". We strip any duplicated base
    // so that `request()` builds the correct absolute URL.
    const path = nextRecordsUrl.startsWith("/services/data/")
      ? nextRecordsUrl.replace(`/services/data/${API_VERSION}`, "")
      : nextRecordsUrl;
    return this.request<SalesforceQueryResult<T>>(path);
  }

  /**
   * Auto-paginate through all SOQL result pages and return every record
   * as a single flat array.
   */
  async queryAll<T>(soql: string): Promise<T[]> {
    const records: T[] = [];
    let result = await this.query<T>(soql);
    records.push(...result.records);

    while (!result.done && result.nextRecordsUrl) {
      result = await this.queryMore<T>(result.nextRecordsUrl);
      records.push(...result.records);
    }

    return records;
  }

  // -----------------------------------------------------------------------
  // CRUD operations
  // -----------------------------------------------------------------------

  /**
   * Retrieve a single record by its Salesforce ID.
   */
  async getRecord<T>(objectType: string, id: string): Promise<T> {
    return this.request<T>(`/sobjects/${objectType}/${id}`);
  }

  /**
   * Create a new record. Returns the ID assigned by Salesforce.
   */
  async createRecord(
    objectType: string,
    data: Record<string, unknown>,
  ): Promise<string> {
    const result = await this.request<{ id: string; success: boolean }>(
      `/sobjects/${objectType}`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
    return result.id;
  }

  /**
   * Update an existing record. Salesforce returns `204 No Content` on
   * success, so there is no response body.
   */
  async updateRecord(
    objectType: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await this.request<void>(
      `/sobjects/${objectType}/${id}`,
      { method: "PATCH", body: JSON.stringify(data) },
    );
  }

  // -----------------------------------------------------------------------
  // Metadata
  // -----------------------------------------------------------------------

  /**
   * Retrieve the describe metadata for a Salesforce SObject.
   */
  async describe(objectType: string): Promise<SalesforceDescribeResult> {
    return this.request<SalesforceDescribeResult>(
      `/sobjects/${objectType}/describe`,
    );
  }

  // -----------------------------------------------------------------------
  // Access to current config (for persisting tokens externally)
  // -----------------------------------------------------------------------

  /** Returns a copy of the current auth configuration (includes tokens). */
  getAuthConfig(): SalesforceAuthConfig {
    return { ...this.config };
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /**
   * Core HTTP request method used by all public API methods.
   *
   * Responsibilities:
   *   - Attach the Bearer token header.
   *   - Transparently refresh an expired token and retry on 401.
   *   - Retry rate-limited (HTTP 429) or server-error (5xx) responses
   *     with exponential back-off.
   *   - Surface Salesforce error details as structured Error messages.
   */
  private async request<T>(
    path: string,
    options?: RequestInit,
  ): Promise<T> {
    if (!this.config.accessToken) {
      throw new Error(
        "SalesforceClient is not authenticated. Call authenticate() first.",
      );
    }

    // If we know the token is expired, proactively refresh before the request.
    if (
      this.config.tokenExpiresAt &&
      Date.now() >= this.config.tokenExpiresAt &&
      this.config.refreshToken
    ) {
      await this.refreshAccessToken();
    }

    const url = `${this.apiBase}${path}`;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.config.accessToken}`,
        Accept: "application/json",
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
      };

      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...(options?.headers as Record<string, string> | undefined) },
      });

      // ---- Success ---------------------------------------------------
      if (response.ok) {
        // 204 No Content (e.g. PATCH update)
        if (response.status === 204) {
          return undefined as T;
        }
        return (await response.json()) as T;
      }

      // ---- Session expired / invalid token ---------------------------
      if (response.status === 401 && attempt === 0 && this.config.refreshToken) {
        await this.refreshAccessToken();
        // Retry immediately (this counts as the first retry).
        continue;
      }

      // ---- Rate limited (429) or server error (5xx) -- back off ------
      if (response.status === 429 || response.status >= 500) {
        lastError = await this.buildErrorFromResponse(response);
        if (attempt < MAX_RETRIES) {
          const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
          await this.sleep(delay);
          continue;
        }
      }

      // ---- Any other error -- fail immediately -----------------------
      throw await this.buildErrorFromResponse(response);
    }

    // Exhausted all retries.
    throw lastError ?? new Error(`Salesforce request failed after ${MAX_RETRIES} retries: ${url}`);
  }

  /**
   * Build a descriptive Error from a non-OK Salesforce response.
   */
  private async buildErrorFromResponse(response: Response): Promise<Error> {
    let detail: string;
    try {
      const body = (await response.json()) as SalesforceErrorBody[] | SalesforceErrorBody;
      const errors = Array.isArray(body) ? body : [body];
      detail = errors
        .map((e) => `[${e.errorCode}] ${e.message}`)
        .join("; ");
    } catch {
      detail = await response.text().catch(() => "unknown error");
    }
    return new Error(
      `Salesforce API error ${response.status} (${response.statusText}): ${detail}`,
    );
  }

  /** Simple non-blocking delay. */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
