import { OutputSchemaSourceKey } from "./interface";

// Condition operators for different data types
export enum StringConditionOperator {
  Equals = "equals",
  NotEquals = "not_equals",
  Contains = "contains",
  NotContains = "not_contains",
  StartsWith = "starts_with",
  EndsWith = "ends_with",
  IsEmpty = "is_empty",
  IsNotEmpty = "is_not_empty",
}

export enum NumberConditionOperator {
  Equals = "equals",
  NotEquals = "not_equals",
  GreaterThan = "greater_than",
  LessThan = "less_than",
  GreaterThanOrEqual = "greater_than_or_equal",
  LessThanOrEqual = "less_than_or_equal",
}

export enum BooleanConditionOperator {
  IsTrue = "is_true",
  IsFalse = "is_false",
}

export function getFirstConditionOperator(
  type: "string" | "number" | "boolean",
) {
  switch (type) {
    case "string":
      return StringConditionOperator.Equals;
    case "number":
      return NumberConditionOperator.Equals;
    case "boolean":
      return BooleanConditionOperator.IsTrue;
    default:
      return StringConditionOperator.Equals;
  }
}

export type ConditionOperator =
  | StringConditionOperator
  | NumberConditionOperator
  | BooleanConditionOperator;

export type ConditionRule = {
  source: OutputSchemaSourceKey; // Reference to another node's output field
  operator: ConditionOperator;
  value?: string | number | boolean; // Comparison value (not needed for is_empty, is_not_empty, is_true, is_false)
};

// Condition branch for if-elseIf-else structure
export type ConditionBranch = {
  id: "if" | "else" | (string & {});
  type: "if" | "elseIf" | "else";
  conditions: ConditionRule[]; // Not needed for 'else' type
  logicalOperator: "AND" | "OR"; // How to combine multiple conditions, not needed for 'else'
};

export type ConditionBranches = {
  if: ConditionBranch;
  elseIf?: ConditionBranch[]; // Optional multiple elseIf branches
  else: ConditionBranch; // Optional else branch
};
