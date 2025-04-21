import { Rule } from "app-types/rules";
import { rulesService } from "lib/db/rules-service";
import logger from "logger";

/**
 * Rule Engine class for managing and applying rules to chat sessions
 */
export class RuleEngine {
  private static instance: RuleEngine;
  private ruleCache: Map<string, Rule[]> = new Map();

  private constructor() {}

  /**
   * Get the singleton instance of the RuleEngine
   */
  public static getInstance(): RuleEngine {
    if (!RuleEngine.instance) {
      RuleEngine.instance = new RuleEngine();
    }
    return RuleEngine.instance;
  }

  /**
   * Clear the rule cache for a specific user
   * @param userId The user ID to clear the cache for
   */
  public clearCache(userId: string): void {
    this.ruleCache.delete(userId);
  }

  /**
   * Get all enabled rules for a user
   * @param userId The user ID to get rules for
   * @returns An array of enabled rules
   */
  public async getEnabledRules(userId: string): Promise<Rule[]> {
    try {
      // Check cache first
      if (this.ruleCache.has(userId)) {
        return this.ruleCache.get(userId) || [];
      }

      // Fetch from database
      const rules = await rulesService.selectEnabledRulesByUserId(userId);
      
      // Update cache
      this.ruleCache.set(userId, rules);
      
      return rules;
    } catch (error) {
      logger.error("Error fetching enabled rules:", error);
      return [];
    }
  }

  /**
   * Generate a system prompt by combining all enabled rules
   * @param userId The user ID to generate the system prompt for
   * @param basePrompt Optional base prompt to include
   * @returns The combined system prompt
   */
  public async generateSystemPrompt(userId: string, basePrompt?: string): Promise<string> {
    try {
      const rules = await this.getEnabledRules(userId);
      
      // Sort rules by priority (higher priority first)
      const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);
      
      // Combine rule content
      const ruleContent = sortedRules.map(rule => rule.content).join("\n\n");
      
      // Combine with base prompt if provided
      const systemPrompt = basePrompt 
        ? `${basePrompt}\n\n${ruleContent}`
        : ruleContent;
      
      return systemPrompt;
    } catch (error) {
      logger.error("Error generating system prompt:", error);
      return basePrompt || "";
    }
  }
}
