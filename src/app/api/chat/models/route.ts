import { customModelProvider } from "lib/ai/models";
import { getSession } from "auth/server";

// Mock storage for API keys - in production, use a secure database
const apiKeyStore = new Map<string, Record<string, string>>();

export const GET = async () => {
  try {
    const session = await getSession();
    let userAPIKeys: Record<string, string> = {};

    if (session?.user?.id) {
      userAPIKeys = apiKeyStore.get(session.user.id) || {};
    }

    // Get the base model info
    const baseModelsInfo = customModelProvider.modelsInfo;

    // Enhance with user API key status
    const enhancedModelsInfo = baseModelsInfo.map((provider) => ({
      ...provider,
      hasAPIKey: provider.hasAPIKey || !!userAPIKeys[provider.provider],
      userHasAPIKey: !!userAPIKeys[provider.provider],
    }));

    return Response.json(
      enhancedModelsInfo.sort((a, b) => {
        if (a.hasAPIKey && !b.hasAPIKey) return -1;
        if (!a.hasAPIKey && b.hasAPIKey) return 1;
        return 0;
      }),
    );
  } catch (error) {
    console.error("Error fetching models:", error);
    // Fallback to original behavior
    return Response.json(
      customModelProvider.modelsInfo.sort((a, b) => {
        if (a.hasAPIKey && !b.hasAPIKey) return -1;
        if (!a.hasAPIKey && b.hasAPIKey) return 1;
        return 0;
      }),
    );
  }
};
