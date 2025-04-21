import { Rule, RuleUpdate } from "app-types/rules";
import { eq } from "drizzle-orm";
import { generateUUID } from "lib/utils";
import { sqliteDb as db } from "../db.sqlite";
import { RulesSqliteSchema } from "../schema.rules";

export const sqliteRulesService = {
  async insertRule({
    name,
    content,
    isEnabled,
    priority,
    userId,
  }: Omit<Rule, "id" | "createdAt" | "updatedAt">): Promise<Rule> {
    const ruleId = generateUUID();
    const now = new Date();
    const timestamp = now.getTime();

    await db.insert(RulesSqliteSchema).values({
      id: ruleId,
      name,
      content,
      isEnabled: isEnabled ?? true,
      priority: priority ?? 0,
      userId,
      createdAt: timestamp,
      updatedAt: timestamp,
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
      .from(RulesSqliteSchema)
      .where(eq(RulesSqliteSchema.id, id));
    
    if (!result.length) return null;
    
    const rule = result[0];
    return {
      id: rule.id,
      name: rule.name,
      content: rule.content,
      isEnabled: Boolean(rule.isEnabled),
      priority: rule.priority,
      userId: rule.userId,
      createdAt: new Date(rule.createdAt),
      updatedAt: new Date(rule.updatedAt),
    };
  },

  async selectRulesByUserId(userId: string): Promise<Rule[]> {
    const result = await db
      .select()
      .from(RulesSqliteSchema)
      .where(eq(RulesSqliteSchema.userId, userId))
      .orderBy(RulesSqliteSchema.priority);
    
    return result.map(rule => ({
      id: rule.id,
      name: rule.name,
      content: rule.content,
      isEnabled: Boolean(rule.isEnabled),
      priority: rule.priority,
      userId: rule.userId,
      createdAt: new Date(rule.createdAt),
      updatedAt: new Date(rule.updatedAt),
    }));
  },

  async selectEnabledRulesByUserId(userId: string): Promise<Rule[]> {
    const result = await db
      .select()
      .from(RulesSqliteSchema)
      .where(
        eq(RulesSqliteSchema.userId, userId),
        eq(RulesSqliteSchema.isEnabled, true)
      )
      .orderBy(RulesSqliteSchema.priority);
    
    return result.map(rule => ({
      id: rule.id,
      name: rule.name,
      content: rule.content,
      isEnabled: Boolean(rule.isEnabled),
      priority: rule.priority,
      userId: rule.userId,
      createdAt: new Date(rule.createdAt),
      updatedAt: new Date(rule.updatedAt),
    }));
  },

  async updateRule(id: string, rule: RuleUpdate): Promise<Rule> {
    const now = new Date();
    const timestamp = now.getTime();

    const updateData: any = { ...rule, updatedAt: timestamp };
    
    await db
      .update(RulesSqliteSchema)
      .set(updateData)
      .where(eq(RulesSqliteSchema.id, id));
    
    const updatedRule = await this.selectRule(id);
    if (!updatedRule) {
      throw new Error(`Rule with id ${id} not found after update`);
    }
    
    return updatedRule;
  },

  async deleteRule(id: string): Promise<void> {
    await db
      .delete(RulesSqliteSchema)
      .where(eq(RulesSqliteSchema.id, id));
  },

  async toggleRuleStatus(id: string, isEnabled: boolean): Promise<Rule> {
    return this.updateRule(id, { isEnabled });
  },
};
