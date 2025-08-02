import { agentRepository } from "lib/db/repository";
import { getSession } from "auth/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  const agent = await agentRepository.selectAgentById(id, session.user.id);

  if (!agent) {
    return Response.json(
      {
        error: "Agent not found",
      },
      { status: 404 },
    );
  }

  return Response.json(agent);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { id } = await params;
    await agentRepository.deleteAgent(id, session.user.id);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Failed to delete agent:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
