import { BaseConnector } from "./base";

type ConnectorFactory = (config: Record<string, unknown>) => BaseConnector;

/**
 * Registry that maps connector type strings to their factory functions.
 *
 * Each concrete connector module should call `connectorRegistry.register()`
 * at import time so the platform can create connector instances on demand.
 */
class ConnectorRegistry {
  private factories = new Map<string, ConnectorFactory>();

  /**
   * Register a factory function for a given connector type.
   *
   * @param type   - Unique connector type identifier (e.g. "salesforce").
   * @param factory - Function that receives a runtime config object and
   *                  returns a fully-initialised `BaseConnector` instance.
   */
  register(
    type: string,
    factory: (config: Record<string, unknown>) => BaseConnector,
  ): void {
    this.factories.set(type, factory);
  }

  /**
   * Create a new connector instance for the given type.
   *
   * @throws {Error} If no factory has been registered for `type`.
   */
  create(type: string, config: Record<string, unknown>): BaseConnector {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new Error(
        `No connector factory registered for type "${type}". ` +
          `Available types: ${this.getAvailableTypes().join(", ") || "(none)"}`,
      );
    }
    return factory(config);
  }

  /**
   * Return the list of all registered connector type identifiers.
   */
  getAvailableTypes(): string[] {
    return Array.from(this.factories.keys());
  }
}

/** Module-level singleton instance. */
export const connectorRegistry = new ConnectorRegistry();
