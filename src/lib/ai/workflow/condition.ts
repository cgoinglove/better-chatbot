import { safe } from "ts-safe";
import { OutputSchemaSourceKey } from "./workflow.interface";

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
  Equals = StringConditionOperator.Equals,
  NotEquals = StringConditionOperator.NotEquals,
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

export function checkConditionBranch(
  branch: ConditionBranch,
  getSourceValue: (
    source: OutputSchemaSourceKey,
  ) => string | number | boolean | undefined,
): boolean {
  const results = branch.conditions?.map((condition) => {
    return checkConditionRule({
      operator: condition.operator,
      target: String(condition.value || ""),
      source: getSourceValue(condition.source),
    });
  }) ?? [false];
  if (branch.logicalOperator === "AND") {
    return results.every((result) => result);
  }
  return results.some((result) => result);
}

function checkConditionRule({
  operator,
  target,
  source,
}: {
  operator: ConditionOperator;
  target: string;
  source?: string | number | boolean;
}): boolean {
  return safe(() => {
    switch (operator) {
      case StringConditionOperator.Equals:
        if (source == target) return true;
        break;
      case StringConditionOperator.NotEquals:
        if (source != target) return true;
        break;
      case StringConditionOperator.Contains:
        if (String(source).includes(String(target))) return true;
        break;
      case StringConditionOperator.NotContains:
        if (!String(source).includes(String(target))) return true;
        break;
      case StringConditionOperator.StartsWith:
        if (String(source).startsWith(String(target))) return true;
        break;
      case StringConditionOperator.EndsWith:
        if (String(source).endsWith(String(target))) return true;
        break;
      case StringConditionOperator.IsEmpty:
        if (!source) return true;
        break;
      case StringConditionOperator.IsNotEmpty:
        if (source) return true;
        break;
      case NumberConditionOperator.GreaterThan:
        if (Number(source) > Number(target)) return true;
        break;
      case NumberConditionOperator.LessThan:
        if (Number(source) < Number(target)) return true;
        break;
      case NumberConditionOperator.GreaterThanOrEqual:
        if (Number(source) >= Number(target)) return true;
        break;
      case NumberConditionOperator.LessThanOrEqual:
        if (Number(source) <= Number(target)) return true;
        break;
      case BooleanConditionOperator.IsTrue:
        if (source) return true;
        break;
      case BooleanConditionOperator.IsFalse:
        if (!source) return true;
        break;
    }
    return false;
  })
    .ifFail((e) => {
      console.error(e);
      return false;
    })
    .unwrap();
}
