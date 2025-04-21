import { Rule } from "app-types/rules";
import { rulesService } from "lib/db/rules-service";
import { RuleEngine } from "lib/ai/rule-engine";
import { getMockUserSession } from "lib/mock";
import logger from "logger";

export async function GET(request: Request) {
  try {
    const userId = getMockUserSession().id;
    const rules = await rulesService.selectRulesByUserId(userId);
    
    return Response.json(rules);
  } catch (error: any) {
    logger.error("Error fetching rules:", error);
    return new Response(error.message || "Failed to fetch rules", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = getMockUserSession().id;
    const data = await request.json();
    
    const { name, content, isEnabled, priority } = data as Partial<Rule>;
    
    if (!name || !content) {
      return new Response("Name and content are required", { status: 400 });
    }
    
    const rule = await rulesService.insertRule({
      name,
      content,
      isEnabled: isEnabled ?? true,
      priority: priority ?? 0,
      userId,
    });
    
    // Clear the rule cache to ensure the new rule is used
    RuleEngine.getInstance().clearCache(userId);
    
    return Response.json(rule);
  } catch (error: any) {
    logger.error("Error creating rule:", error);
    return new Response(error.message || "Failed to create rule", { status: 500 });
  }
}
