import type { VerticalDefinition } from "app-types/platform";

/**
 * Registry for vertical definitions.
 *
 * Verticals represent domain-specific configurations (e.g. "sales-hunter",
 * "healthcare-ops") that bundle agents, connectors, metrics, and dashboards
 * into a cohesive package.
 */
class VerticalRegistry {
  private verticals = new Map<string, VerticalDefinition>();

  /**
   * Register a vertical definition. Overwrites any existing registration
   * with the same `id`.
   */
  register(vertical: VerticalDefinition): void {
    this.verticals.set(vertical.id, vertical);
  }

  /**
   * Retrieve a vertical by its unique identifier.
   * Returns `undefined` if not registered.
   */
  get(id: string): VerticalDefinition | undefined {
    return this.verticals.get(id);
  }

  /**
   * Return all registered verticals.
   */
  getAll(): VerticalDefinition[] {
    return Array.from(this.verticals.values());
  }

  /**
   * Return only the verticals whose IDs are present in the provided
   * `tenantVerticals` allow-list.
   */
  getEnabled(tenantVerticals: string[]): VerticalDefinition[] {
    const allowed = new Set(tenantVerticals);
    return this.getAll().filter((v) => allowed.has(v.id));
  }
}

/** Module-level singleton instance. */
export const verticalRegistry = new VerticalRegistry();
