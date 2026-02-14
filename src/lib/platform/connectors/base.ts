import type { ConnectorStatus, ConnectorType } from "app-types/platform";

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------

export type SyncResult = {
  recordsProcessed: number;
  recordsFailed: number;
  errors: string[];
};

export type DataRecord = {
  id: string;
  objectType: string;
  data: Record<string, unknown>;
  syncedAt: Date;
};

export type ConnectorObjectSchema = {
  objectType: string;
  fields: { name: string; type: string; required: boolean }[];
};

// ---------------------------------------------------------------------------
// Abstract base class
// ---------------------------------------------------------------------------

/**
 * Base class that every concrete connector implementation must extend.
 *
 * Connectors encapsulate the logic for communicating with an external data
 * source (CRM, file import, EDI feed, etc.) and expose a uniform interface
 * for the platform sync engine and query layer.
 */
export abstract class BaseConnector {
  readonly id: string;
  readonly type: ConnectorType;
  readonly name: string;
  status: ConnectorStatus;

  constructor(
    id: string,
    type: ConnectorType,
    name: string,
    status: ConnectorStatus = "disconnected",
  ) {
    this.id = id;
    this.type = type;
    this.name = name;
    this.status = status;
  }

  /** Establish a connection to the external data source. */
  abstract connect(config: Record<string, unknown>): Promise<void>;

  /** Gracefully close the connection. */
  abstract disconnect(): Promise<void>;

  /** Verify that the current configuration can reach the data source. */
  abstract testConnection(): Promise<{ success: boolean; message: string }>;

  /**
   * Pull data from the external source.
   * @param options.fullSync - When `true`, re-sync all records instead of
   *                           performing an incremental delta sync.
   */
  abstract sync(options?: { fullSync?: boolean }): Promise<SyncResult>;

  /**
   * Query records of a specific object type with optional filters.
   */
  abstract query(
    objectType: string,
    filters?: Record<string, unknown>,
  ): Promise<DataRecord[]>;

  /** Return the schema of all object types exposed by this connector. */
  abstract getSchema(): ConnectorObjectSchema[];
}
