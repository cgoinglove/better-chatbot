import { agentRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import { z } from "zod";
import { serverCache } from "lib/cache";
import { CacheKeys } from "lib/cache/cache-keys";
import { AgentUpsertSchema } from "app-types/agent";

export async function GET() {
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const agents = await agentRepository.selectAgentsByUserId(session.user.id);
    return Response.json(agents);
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const data = AgentUpsertSchema.parse(body);

    const agent = await agentRepository.upsertAgent({
      ...data,
      userId: session.user.id,
    });
    serverCache.delete(CacheKeys.agentInstructions(agent.id));

    return Response.json(agent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Failed to upsert agent:", error);
    return Response.json(
      { message: "Internal Server Error" },
      {
        status: 500,
      },
    );
  }
}
