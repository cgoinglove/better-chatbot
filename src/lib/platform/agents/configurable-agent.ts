import type { ConfigurableAgent } from "app-types/platform";
import { eq, and } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { ConfigurableAgentSchema } from "lib/db/pg/schema.pg";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_TEMPERATURE = 0.7;

/**
 * Engine for loading and preparing configurable agents.
 *
 * Configurable agents are tenant-scoped, vertical-aware AI agents whose
 * behaviour (system prompt, model, tools, guardrails) is stored in the
 * database and can be modified at runtime without code changes.
 */
export class ConfigurableAgentEngine {
  /**
   * Load a single agent by its ID, scoped to a tenant.
   *
   * @throws If the agent is not found for the given tenant.
   */
  async loadAgent(
    agentId: string,
    tenantId: string,
  ): Promise<ConfigurableAgent> {
    const [row] = await pgDb
      .select()
      .from(ConfigurableAgentSchema)
      .where(
        and(
          eq(ConfigurableAgentSchema.id, agentId),
          eq(ConfigurableAgentSchema.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!row) {
      throw new Error(
        `Configurable agent not found: ${agentId} (tenant: ${tenantId})`,
      );
    }

    return this.toConfigurableAgent(row);
  }

  /**
   * Load all enabled agents for a given tenant and vertical.
   */
  async loadAgentsByVertical(
    tenantId: string,
    vertical: string,
  ): Promise<ConfigurableAgent[]> {
    const rows = await pgDb
      .select()
      .from(ConfigurableAgentSchema)
      .where(
        and(
          eq(ConfigurableAgentSchema.tenantId, tenantId),
          eq(ConfigurableAgentSchema.vertical, vertical),
          eq(ConfigurableAgentSchema.enabled, true),
        ),
      );

    return rows.map((row) => this.toConfigurableAgent(row));
  }

  /**
   * Interpolate context variables into the agent's system prompt.
   *
   * Variables are referenced as `{{variableName}}` in the stored prompt and
   * are replaced with values from the `context` map.  Unresolved
   * placeholders are left intact.
   */
  buildSystemPrompt(
    agent: ConfigurableAgent,
    context?: Record<string, unknown>,
  ): string {
    let prompt = agent.systemPrompt;

    if (context) {
      for (const [key, value] of Object.entries(context)) {
        const placeholder = `{{${key}}}`;
        prompt = prompt.replaceAll(placeholder, String(value ?? ""));
      }
    }

    return prompt;
  }

  /**
   * Return the model identifier for the agent, falling back to the
   * platform default if none is configured.
   */
  getAgentModel(agent: ConfigurableAgent): string {
    return agent.model ?? DEFAULT_MODEL;
  }

  /**
   * Return the sampling temperature for the agent, falling back to the
   * platform default if none is configured.
   */
  getAgentTemperature(agent: ConfigurableAgent): number {
    return agent.temperature ?? DEFAULT_TEMPERATURE;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Map a database row to the `ConfigurableAgent` domain type.
   *
   * The `temperature` column is stored as `numeric` (string in Drizzle)
   * and needs to be coerced to a number.
   */
  private toConfigurableAgent(
    row: typeof ConfigurableAgentSchema.$inferSelect,
  ): ConfigurableAgent {
    return {
      id: row.id,
      tenantId: row.tenantId,
      vertical: row.vertical,
      agentType: row.agentType,
      name: row.name,
      description: row.description ?? null,
      systemPrompt: row.systemPrompt,
      tools: row.tools,
      guardrails: row.guardrails,
      model: row.model ?? null,
      temperature: row.temperature !== null ? Number(row.temperature) : null,
      maxTokens: row.maxTokens ?? null,
      config: row.config,
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
