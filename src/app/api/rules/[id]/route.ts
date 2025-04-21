import { Rule, RuleUpdate } from "app-types/rules";
import { rulesService } from "lib/db/rules-service";
import { RuleEngine } from "lib/ai/rule-engine";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const rule = await rulesService.selectRule(id);
    
    if (!rule) {
      return new Response("Rule not found", { status: 404 });
    }
    
    // Verify the rule belongs to the current user
    const userId = getMockUserSession().id;
    if (rule.userId !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    
    return Response.json(rule);
  } catch (error: any) {
    logger.error("Error fetching rule:", error);
    return new Response(error.message || "Failed to fetch rule", { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const data = await request.json();
    
    // Verify the rule exists and belongs to the current user
    const existingRule = await rulesService.selectRule(id);
    if (!existingRule) {
      return new Response("Rule not found", { status: 404 });
    }
    
    const userId = getMockUserSession().id;
    if (existingRule.userId !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    
    const { name, content, isEnabled, priority } = data as RuleUpdate;
    
    const updatedRule = await rulesService.updateRule(id, {
      name,
      content,
      isEnabled,
      priority,
    });
    
    // Clear the rule cache to ensure the updated rule is used
    RuleEngine.getInstance().clearCache(userId);
    
    return Response.json(updatedRule);
  } catch (error: any) {
    logger.error("Error updating rule:", error);
    return new Response(error.message || "Failed to update rule", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Verify the rule exists and belongs to the current user
    const existingRule = await rulesService.selectRule(id);
    if (!existingRule) {
      return new Response("Rule not found", { status: 404 });
    }
    
    const userId = getMockUserSession().id;
    if (existingRule.userId !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    
    await rulesService.deleteRule(id);
    
    // Clear the rule cache to ensure the deleted rule is no longer used
    RuleEngine.getInstance().clearCache(userId);
    
    return new Response(null, { status: 204 });
  } catch (error: any) {
    logger.error("Error deleting rule:", error);
    return new Response(error.message || "Failed to delete rule", { status: 500 });
  }
}
