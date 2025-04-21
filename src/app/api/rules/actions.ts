"use server";

import { Rule, RuleUpdate } from "app-types/rules";
import { rulesService } from "lib/db/rules-service";
import { RuleEngine } from "lib/ai/rule-engine";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export async function selectRulesByUserIdAction(): Promise<Rule[]> {
  try {
    const userId = getMockUserSession().id;
    return await rulesService.selectRulesByUserId(userId);
  } catch (error) {
    logger.error("Error fetching rules:", error);
    return [];
  }
}

export async function selectRuleAction(id: string): Promise<Rule | null> {
  try {
    const rule = await rulesService.selectRule(id);
    
    if (!rule) {
      return null;
    }
    
    // Verify the rule belongs to the current user
    const userId = getMockUserSession().id;
    if (rule.userId !== userId) {
      return null;
    }
    
    return rule;
  } catch (error) {
    logger.error("Error fetching rule:", error);
    return null;
  }
}

export async function createRuleAction(rule: Omit<Rule, "id" | "userId" | "createdAt" | "updatedAt">): Promise<Rule | null> {
  try {
    const userId = getMockUserSession().id;
    
    const newRule = await rulesService.insertRule({
      ...rule,
      userId,
    });
    
    // Clear the rule cache to ensure the new rule is used
    RuleEngine.getInstance().clearCache(userId);
    
    return newRule;
  } catch (error) {
    logger.error("Error creating rule:", error);
    return null;
  }
}

export async function updateRuleAction(id: string, update: RuleUpdate): Promise<Rule | null> {
  try {
    // Verify the rule exists and belongs to the current user
    const existingRule = await rulesService.selectRule(id);
    if (!existingRule) {
      return null;
    }
    
    const userId = getMockUserSession().id;
    if (existingRule.userId !== userId) {
      return null;
    }
    
    const updatedRule = await rulesService.updateRule(id, update);
    
    // Clear the rule cache to ensure the updated rule is used
    RuleEngine.getInstance().clearCache(userId);
    
    return updatedRule;
  } catch (error) {
    logger.error("Error updating rule:", error);
    return null;
  }
}

export async function deleteRuleAction(id: string): Promise<boolean> {
  try {
    // Verify the rule exists and belongs to the current user
    const existingRule = await rulesService.selectRule(id);
    if (!existingRule) {
      return false;
    }
    
    const userId = getMockUserSession().id;
    if (existingRule.userId !== userId) {
      return false;
    }
    
    await rulesService.deleteRule(id);
    
    // Clear the rule cache to ensure the deleted rule is no longer used
    RuleEngine.getInstance().clearCache(userId);
    
    return true;
  } catch (error) {
    logger.error("Error deleting rule:", error);
    return false;
  }
}

export async function toggleRuleStatusAction(id: string, isEnabled: boolean): Promise<Rule | null> {
  try {
    // Verify the rule exists and belongs to the current user
    const existingRule = await rulesService.selectRule(id);
    if (!existingRule) {
      return null;
    }
    
    const userId = getMockUserSession().id;
    if (existingRule.userId !== userId) {
      return null;
    }
    
    const updatedRule = await rulesService.toggleRuleStatus(id, isEnabled);
    
    // Clear the rule cache to ensure the updated rule status is used
    RuleEngine.getInstance().clearCache(userId);
    
    return updatedRule;
  } catch (error) {
    logger.error("Error toggling rule status:", error);
    return null;
  }
}
