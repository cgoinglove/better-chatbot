import {
  BaseConnector,
  type ConnectorObjectSchema,
  type DataRecord,
  type SyncResult,
} from "../../platform/connectors/base";
import { SalesforceClient, type SalesforceDescribeResult } from "./client";
import { SalesforceSync } from "./sync";
import type { SalesforceAuthConfig, SalesforceObject } from "./types";
import { getDefaultSoqlFields } from "./mappings";

// ---------------------------------------------------------------------------
// Configuration types
// ---------------------------------------------------------------------------

type SalesforceConnectorConfig = {
  id: string;
  name: string;
  tenantId: string;
  auth: SalesforceAuthConfig;
  /** Objects to sync. Defaults to Lead, Contact, Account, Opportunity. */
  syncObjects?: SalesforceObject[];
  /** ISO-8601 timestamp of the last successful sync (for incremental). */
  lastSyncAt?: string;
};

// ---------------------------------------------------------------------------
// Standard objects we support for schema / sync
// ---------------------------------------------------------------------------

const DEFAULT_SYNC_OBJECTS: SalesforceObject[] = [
  "Lead",
  "Contact",
  "Account",
  "Opportunity",
];

// ---------------------------------------------------------------------------
// SalesforceConnector
// ---------------------------------------------------------------------------

/**
 * Concrete connector implementation for Salesforce CRM.
 *
 * Extends the platform `BaseConnector` abstract class and provides:
 *   - OAuth 2.0-based connection management
 *   - Incremental and full data sync (via SalesforceSync)
 *   - Ad-hoc SOQL query execution
 *   - Schema introspection for standard objects
 */
export class SalesforceConnector extends BaseConnector {
  private client: SalesforceClient | null = null;
  private readonly syncEngine: SalesforceSync;
  private readonly tenantId: string;
  private readonly authConfig: SalesforceAuthConfig;
  private readonly syncObjects: SalesforceObject[];
  private lastSyncAt: Date | undefined;

  constructor(config: SalesforceConnectorConfig) {
    super(config.id, "salesforce", config.name, "disconnected");
    this.tenantId = config.tenantId;
    this.authConfig = config.auth;
    this.syncObjects = config.syncObjects ?? DEFAULT_SYNC_OBJECTS;
    this.lastSyncAt = config.lastSyncAt
      ? new Date(config.lastSyncAt)
      : undefined;
    this.syncEngine = new SalesforceSync();
  }

  // -----------------------------------------------------------------------
  // BaseConnector: connect
  // -----------------------------------------------------------------------

  /**
   * Establish a connection to Salesforce by creating a client and
   * authenticating using the stored configuration.
   *
   * If the config already contains a valid access token it will be used
   * directly; otherwise an authorization code or refresh token flow is
   * triggered.
   *
   * @param config - Optional runtime overrides (e.g. an `authorizationCode`
   *                 from a fresh OAuth redirect).
   */
  async connect(config: Record<string, unknown> = {}): Promise<void> {
    try {
      this.client = new SalesforceClient(this.authConfig);

      const authorizationCode = config.authorizationCode as string | undefined;

      if (authorizationCode) {
        await this.client.authenticate(authorizationCode);
      } else if (this.authConfig.accessToken) {
        // Token already present -- the client will auto-refresh if expired.
      } else if (this.authConfig.refreshToken) {
        await this.client.refreshAccessToken();
      } else {
        throw new Error(
          "Cannot connect to Salesforce: no access token, refresh token, or " +
            "authorization code provided.",
        );
      }

      this.status = "connected";
    } catch (err) {
      this.status = "error";
      this.client = null;
      throw new Error(
        `Salesforce connection failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // -----------------------------------------------------------------------
  // BaseConnector: disconnect
  // -----------------------------------------------------------------------

  /** Clear the client reference and mark the connector as disconnected. */
  async disconnect(): Promise<void> {
    this.client = null;
    this.status = "disconnected";
  }

  // -----------------------------------------------------------------------
  // BaseConnector: testConnection
  // -----------------------------------------------------------------------

  /**
   * Verify that the connection is alive by running a trivial SOQL query
   * that returns no data but validates authentication and API access.
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      this.ensureClient();
      await this.client!.query<{ Id: string }>(
        "SELECT Id FROM Lead LIMIT 1",
      );
      return { success: true, message: "Successfully connected to Salesforce." };
    } catch (err) {
      return {
        success: false,
        message: `Connection test failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  // -----------------------------------------------------------------------
  // BaseConnector: sync
  // -----------------------------------------------------------------------

  /**
   * Pull data from Salesforce into the platform database.
   *
   * By default, performs an incremental sync using the `LastModifiedDate`
   * watermark stored from the previous run. Pass `{ fullSync: true }` to
   * re-sync all records.
   */
  async sync(options?: { fullSync?: boolean }): Promise<SyncResult> {
    this.ensureClient();
    this.status = "syncing";

    try {
      const since = options?.fullSync ? undefined : this.lastSyncAt;
      const result = await this.syncEngine.syncAll(
        this.client!,
        this.tenantId,
        since,
      );

      // Update the watermark for the next incremental sync.
      this.lastSyncAt = new Date();
      this.status = "connected";

      return result;
    } catch (err) {
      this.status = "error";
      throw new Error(
        `Salesforce sync failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // -----------------------------------------------------------------------
  // BaseConnector: query
  // -----------------------------------------------------------------------

  /**
   * Execute an ad-hoc query against Salesforce.
   *
   * If `filters.soql` is provided, it is executed directly as a SOQL query.
   * Otherwise a default SELECT for the given `objectType` is constructed.
   *
   * @param objectType - The Salesforce SObject API name (e.g. "Lead").
   * @param filters    - Optional `{ soql?: string; limit?: number }`.
   */
  async query(
    objectType: string,
    filters?: Record<string, unknown>,
  ): Promise<DataRecord[]> {
    this.ensureClient();

    const soql = (filters?.soql as string) || this.buildDefaultQuery(objectType, filters);
    const records = await this.client!.queryAll<Record<string, unknown>>(soql);

    return records.map((record) => ({
      id: (record.Id as string) ?? "",
      objectType,
      data: record,
      syncedAt: new Date(),
    }));
  }

  // -----------------------------------------------------------------------
  // BaseConnector: getSchema
  // -----------------------------------------------------------------------

  /**
   * Return the schema of all Salesforce object types that this connector
   * is configured to sync.
   *
   * If the connector is not yet connected, a static schema based on the
   * default SOQL fields is returned. When connected, a live `describe`
   * call is made for richer metadata.
   */
  getSchema(): ConnectorObjectSchema[] {
    // Return static schema based on default SOQL fields. This avoids
    // making network calls in a synchronous method and works even when
    // the connector is not connected.
    return this.syncObjects.map((objectType) => {
      const fields = getDefaultSoqlFields(objectType);
      return {
        objectType,
        fields: fields.map((name) => ({
          name,
          type: inferFieldType(name),
          required: name === "Id",
        })),
      };
    });
  }

  // -----------------------------------------------------------------------
  // Extended: live describe
  // -----------------------------------------------------------------------

  /**
   * Perform a live `describe` call to Salesforce for a specific object type.
   * Requires an active connection.
   */
  async describeLive(objectType: string): Promise<SalesforceDescribeResult> {
    this.ensureClient();
    return this.client!.describe(objectType);
  }

  // -----------------------------------------------------------------------
  // Extended: access to current auth config (for persisting tokens)
  // -----------------------------------------------------------------------

  /**
   * Returns the current auth config including refreshed tokens so that
   * callers can persist them for future sessions.
   */
  getAuthConfig(): SalesforceAuthConfig | null {
    return this.client?.getAuthConfig() ?? null;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private ensureClient(): void {
    if (!this.client) {
      throw new Error(
        "SalesforceConnector is not connected. Call connect() first.",
      );
    }
  }

  /**
   * Build a default SOQL SELECT query for the given object type.
   */
  private buildDefaultQuery(
    objectType: string,
    filters?: Record<string, unknown>,
  ): string {
    const knownObject = this.syncObjects.includes(objectType as SalesforceObject);
    const fields = knownObject
      ? getDefaultSoqlFields(objectType as SalesforceObject).join(", ")
      : "Id, Name, CreatedDate, LastModifiedDate";

    const limit = typeof filters?.limit === "number" ? filters.limit : 200;
    let soql = `SELECT ${fields} FROM ${objectType}`;

    // Build simple WHERE clause from filters (excluding meta-keys).
    const whereConditions: string[] = [];
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (["soql", "limit", "offset", "orderBy"].includes(key)) continue;
        if (typeof value === "string") {
          whereConditions.push(`${key} = '${value.replace(/'/g, "\\'")}'`);
        } else if (typeof value === "number" || typeof value === "boolean") {
          whereConditions.push(`${key} = ${value}`);
        }
      }
    }

    if (whereConditions.length > 0) {
      soql += ` WHERE ${whereConditions.join(" AND ")}`;
    }

    const orderBy = (filters?.orderBy as string) || "LastModifiedDate DESC";
    soql += ` ORDER BY ${orderBy}`;
    soql += ` LIMIT ${limit}`;

    return soql;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Best-effort field type inference from the field name. This is used for the
 * static schema (when we don't have a live describe result).
 */
function inferFieldType(fieldName: string): string {
  if (fieldName === "Id" || fieldName.endsWith("Id")) return "id";
  if (fieldName.includes("Date") || fieldName.includes("Time")) return "datetime";
  if (fieldName.includes("Revenue") || fieldName.includes("Amount") || fieldName.includes("Cost"))
    return "currency";
  if (fieldName.includes("Number") || fieldName.includes("Probability")) return "double";
  if (fieldName === "Website") return "url";
  if (fieldName === "Email") return "email";
  if (fieldName === "Phone") return "phone";
  if (fieldName.includes("Description")) return "textarea";
  return "string";
}
