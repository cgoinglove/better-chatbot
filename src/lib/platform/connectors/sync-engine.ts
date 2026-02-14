import { eq } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import {
  ConnectorSchema,
  ConnectorSyncLogSchema,
} from "lib/db/pg/schema.pg";
import { connectorRegistry } from "./registry";
import type { SyncResult } from "./base";

/**
 * Orchestrates the full lifecycle of a connector sync:
 *
 *   1. Load connector configuration from the database.
 *   2. Instantiate the connector via the registry.
 *   3. Connect, sync, disconnect.
 *   4. Persist the sync log and update the connector record.
 */
export class SyncEngine {
  /**
   * Execute a sync for the connector identified by `connectorId`.
   *
   * @param connectorId - UUID of the connector row.
   * @param options.fullSync - When `true`, perform a full re-sync rather
   *                           than an incremental delta.
   * @returns The `SyncResult` produced by the connector.
   * @throws If the connector row is not found or the connector type has no
   *         registered factory.
   */
  async runSync(
    connectorId: string,
    options?: { fullSync?: boolean },
  ): Promise<SyncResult> {
    // 1. Load connector record
    const [connectorRow] = await pgDb
      .select()
      .from(ConnectorSchema)
      .where(eq(ConnectorSchema.id, connectorId))
      .limit(1);

    if (!connectorRow) {
      throw new Error(`Connector not found: ${connectorId}`);
    }

    // 2. Create a sync log entry (status: running)
    const [syncLog] = await pgDb
      .insert(ConnectorSyncLogSchema)
      .values({
        connectorId,
        status: "running",
        recordsProcessed: 0,
        recordsFailed: 0,
        startedAt: new Date(),
      })
      .returning();

    // 3. Mark connector as syncing
    await pgDb
      .update(ConnectorSchema)
      .set({ status: "syncing", updatedAt: new Date() })
      .where(eq(ConnectorSchema.id, connectorId));

    let result: SyncResult;

    try {
      // 4. Instantiate & run
      const connector = connectorRegistry.create(
        connectorRow.type,
        connectorRow.config,
      );

      await connector.connect(connectorRow.config);

      try {
        result = await connector.sync(options);
      } finally {
        await connector.disconnect();
      }

      // 5. Persist successful result
      await pgDb
        .update(ConnectorSyncLogSchema)
        .set({
          status: "completed",
          recordsProcessed: result.recordsProcessed,
          recordsFailed: result.recordsFailed,
          errorMessage:
            result.errors.length > 0 ? result.errors.join("\n") : null,
          completedAt: new Date(),
        })
        .where(eq(ConnectorSyncLogSchema.id, syncLog.id));

      await pgDb
        .update(ConnectorSchema)
        .set({
          status: "connected",
          lastSyncAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(ConnectorSchema.id, connectorId));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // 6. Persist failure
      await pgDb
        .update(ConnectorSyncLogSchema)
        .set({
          status: "failed",
          errorMessage,
          completedAt: new Date(),
        })
        .where(eq(ConnectorSyncLogSchema.id, syncLog.id));

      await pgDb
        .update(ConnectorSchema)
        .set({ status: "error", updatedAt: new Date() })
        .where(eq(ConnectorSchema.id, connectorId));

      throw error;
    }

    return result;
  }
}
