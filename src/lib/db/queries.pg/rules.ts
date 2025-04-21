import { Rule, RuleUpdate } from "app-types/rules";
import { eq } from "drizzle-orm";
import { generateUUID } from "lib/utils";
import { pgDb as db } from "../db.pg";
import { RulesPgSchema } from "../schema.rules";

export const pgRulesService = {
  async insertRule({
    name,
    content,
    isEnabled,
    priority,
    userId,
  }: Omit<Rule, "id" | "createdAt" | "updatedAt">): Promise<Rule> {
    const ruleId = generateUUID();
    const now = new Date();

    await db.insert(RulesPgSchema).values({
      id: ruleId,
      name,
      content,
      isEnabled: isEnabled ?? true,
      priority: priority ?? 0,
      userId,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: ruleId,
      name,
      content,
      isEnabled: isEnabled ?? true,
      priority: priority ?? 0,
      userId,
      createdAt: now,
      updatedAt: now,
    };
  },

  async selectRule(id: string): Promise<Rule | null> {
    const result = await db
      .select()
      .from(RulesPgSchema)
      .where(eq(RulesPgSchema.id, id));
    
    return result[0] ? result[0] : null;
  },

  async selectRulesByUserId(userId: string): Promise<Rule[]> {
    const result = await db
      .select()
      .from(RulesPgSchema)
      .where(eq(RulesPgSchema.userId, userId))
      .orderBy(RulesPgSchema.priority);
    
    return result;
  },

  async selectEnabledRulesByUserId(userId: string): Promise<Rule[]> {
    const result = await db
      .select()
      .from(RulesPgSchema)
      .where(
        eq(RulesPgSchema.userId, userId),
        eq(RulesPgSchema.isEnabled, true)
      )
      .orderBy(RulesPgSchema.priority);
    
    return result;
  },

  async updateRule(id: string, rule: RuleUpdate): Promise<Rule> {
    const now = new Date();
    const updateData = { ...rule, updatedAt: now };
    
    const result = await db
      .update(RulesPgSchema)
      .set(updateData)
      .where(eq(RulesPgSchema.id, id))
      .returning();
    
    if (!result.length) {
      throw new Error(`Rule with id ${id} not found`);
    }
    
    return result[0];
  },

  async deleteRule(id: string): Promise<void> {
    await db
      .delete(RulesPgSchema)
      .where(eq(RulesPgSchema.id, id));
  },

  async toggleRuleStatus(id: string, isEnabled: boolean): Promise<Rule> {
    return this.updateRule(id, { isEnabled });
  },
};
