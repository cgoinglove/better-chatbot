// Client-side permission helpers
// These mirror the server-side permissions but work with the client session

import { admin, editor, user as userRole } from "./roles";
import type { BetterAuthRole } from "./types";
import { parseRoleString, isBetterAuthRole } from "./types";

/**
 * Get the role permissions based on user's role string
 * Defaults to 'user' role if undefined or null
 */
function getRolePermissions(role: string | undefined | null): BetterAuthRole {
  const cleanRole = parseRoleString(role);

  // Default to 'user' role if no role is provided
  switch (cleanRole) {
    case "admin":
      return admin as BetterAuthRole;
    case "editor":
      return editor as BetterAuthRole;
    case "user":
    default:
      return userRole as BetterAuthRole;
  }
}

/**
 * Check if role has specific permission for a resource
 */
function hasPermission(
  userRoleString: string | undefined | null,
  permission:
    | "use"
    | "create"
    | "list"
    | "delete"
    | "update"
    | "view"
    | "share",
  resource: "agent" | "workflow" | "mcp",
): boolean {
  const roleObject = getRolePermissions(userRoleString);

  // Validate role object structure
  if (!isBetterAuthRole(roleObject)) {
    console.error("Invalid role object structure");
    return false;
  }

  const statements = roleObject.statements;
  const resourcePermissions = statements[resource] || [];
  return (
    Array.isArray(resourcePermissions) &&
    resourcePermissions.includes(permission)
  );
}

/**
 * Check if user can create agents (client-side)
 */
export function canCreateAgent(userRoleString?: string | null): boolean {
  return hasPermission(userRoleString, "create", "agent");
}

/**
 * Check if user can edit agents (client-side)
 */
export function canEditAgent(userRoleString?: string | null): boolean {
  return hasPermission(userRoleString, "update", "agent");
}

/**
 * Check if user can delete agents (client-side)
 */
export function canDeleteAgent(userRoleString?: string | null): boolean {
  return hasPermission(userRoleString, "delete", "agent");
}

/**
 * Check if user can create workflows (client-side)
 */
export function canCreateWorkflow(userRoleString?: string | null): boolean {
  return hasPermission(userRoleString, "create", "workflow");
}

/**
 * Check if user can edit workflows (client-side)
 */
export function canEditWorkflow(userRoleString?: string | null): boolean {
  return hasPermission(userRoleString, "update", "workflow");
}

/**
 * Check if user can delete workflows (client-side)
 */
export function canDeleteWorkflow(userRoleString?: string | null): boolean {
  return hasPermission(userRoleString, "delete", "workflow");
}

/**
 * Check if user can create MCP connections (client-side)
 */
export function canCreateMCP(userRoleString?: string | null): boolean {
  return hasPermission(userRoleString, "create", "mcp");
}

/**
 * Check if user can edit MCP connections (client-side)
 */
export function canEditMCP(userRoleString?: string | null): boolean {
  return hasPermission(userRoleString, "update", "mcp");
}

/**
 * Check if user can change visibility of MCP connections (client-side)
 */
export function canChangeVisibilityMCP(
  userRoleString?: string | null,
): boolean {
  return hasPermission(userRoleString, "share", "mcp");
}

/**
 * Check if user can delete MCP connections (client-side)
 */
export function canDeleteMCP(userRoleString?: string | null): boolean {
  return hasPermission(userRoleString, "delete", "mcp");
}

/**
 * Check if user can use agents/workflows/MCP (client-side)
 */
export function canUseResource(
  userRoleString?: string | null,
  resourceType: "agent" | "workflow" | "mcp" = "agent",
): boolean {
  return hasPermission(userRoleString, "use", resourceType);
}

/**
 * Check if user can view resources (client-side)
 */
export function canViewResource(
  userRoleString?: string | null,
  resourceType: "agent" | "workflow" | "mcp" = "agent",
): boolean {
  return hasPermission(userRoleString, "view", resourceType);
}
