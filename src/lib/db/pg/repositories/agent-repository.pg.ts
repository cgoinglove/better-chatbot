import { Agent, AgentRepository } from "app-types/agent";
import { pgDb as db } from "../db.pg";
import { AgentSchema } from "../schema.pg";
import { and, desc, eq } from "drizzle-orm";
import { generateUUID } from "lib/utils";

export const pgAgentRepository: AgentRepository = {
  async insertAgent(agent) {
    const [result] = await db
      .insert(AgentSchema)
      .values({
        id: generateUUID(),
        name: agent.name,
        description: agent.description,
        icon: agent.icon,
        userId: agent.userId,
        instructions: agent.instructions,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return result as Agent;
  },

  async selectAgentById(id, userId) {
    const [result] = await db
      .select()
      .from(AgentSchema)
      .where(and(eq(AgentSchema.id, id), eq(AgentSchema.userId, userId)));
    return result as Agent | null;
  },

  async selectAgentsByUserId(userId) {
    const results = await db
      .select({
        id: AgentSchema.id,
        name: AgentSchema.name,
        description: AgentSchema.description,
        icon: AgentSchema.icon,
        userId: AgentSchema.userId,
        createdAt: AgentSchema.createdAt,
        updatedAt: AgentSchema.updatedAt,
      })
      .from(AgentSchema)
      .where(eq(AgentSchema.userId, userId))
      .orderBy(desc(AgentSchema.updatedAt));
    return results as Omit<Agent, "instructions">[];
  },

  async updateAgent(id, userId, agent) {
    const [result] = await db
      .update(AgentSchema)
      .set({
        ...(agent as object),
        updatedAt: new Date(),
      })
      .where(and(eq(AgentSchema.id, id), eq(AgentSchema.userId, userId)))
      .returning();
    return result as Agent;
  },

  async upsertAgent(agent) {
    const [result] = await db
      .insert(AgentSchema)
      .values({
        id: agent.id || generateUUID(),
        name: agent.name,
        description: agent.description,
        icon: agent.icon,
        userId: agent.userId,
        instructions: agent.instructions,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [AgentSchema.id],
        set: {
          name: agent.name,
          description: agent.description,
          icon: agent.icon,
          instructions: agent.instructions,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result as Agent;
  },

  async deleteAgent(id, userId) {
    await db
      .delete(AgentSchema)
      .where(and(eq(AgentSchema.id, id), eq(AgentSchema.userId, userId)));
  },
};
