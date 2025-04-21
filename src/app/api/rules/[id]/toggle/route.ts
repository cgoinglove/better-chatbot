import { rulesService } from "lib/db/rules-service";
import { RuleEngine } from "lib/ai/rule-engine";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const data = await request.json();
    const { isEnabled } = data as { isEnabled: boolean };
    
    if (typeof isEnabled !== 'boolean') {
      return new Response("isEnabled must be a boolean", { status: 400 });
    }
    
    // Verify the rule exists and belongs to the current user
    const existingRule = await rulesService.selectRule(id);
    if (!existingRule) {
      return new Response("Rule not found", { status: 404 });
    }
    
    const userId = getMockUserSession().id;
    if (existingRule.userId !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    
    const updatedRule = await rulesService.toggleRuleStatus(id, isEnabled);
    
    // Clear the rule cache to ensure the updated rule status is used
    RuleEngine.getInstance().clearCache(userId);
    
    return Response.json(updatedRule);
  } catch (error: any) {
    logger.error("Error toggling rule status:", error);
    return new Response(error.message || "Failed to toggle rule status", { status: 500 });
  }
}
