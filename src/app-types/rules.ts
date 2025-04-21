/**
 * Represents a rule in the Rule Engine
 */
export type Rule = {
  id: string;
  name: string;
  content: string;
  isEnabled: boolean;
  priority: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Partial rule type for updates and creation
 */
export type RuleUpdate = Partial<Omit<Rule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;

/**
 * Service interface for rule operations
 */
export type RuleService = {
  insertRule(rule: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>): Promise<Rule>;
  selectRule(id: string): Promise<Rule | null>;
  selectRulesByUserId(userId: string): Promise<Rule[]>;
  selectEnabledRulesByUserId(userId: string): Promise<Rule[]>;
  updateRule(id: string, rule: RuleUpdate): Promise<Rule>;
  deleteRule(id: string): Promise<void>;
  toggleRuleStatus(id: string, isEnabled: boolean): Promise<Rule>;
};
