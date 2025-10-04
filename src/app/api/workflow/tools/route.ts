import { getSession } from "auth/server";
import { workflowRepository } from "lib/db/repository";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json([]);
  }
  const workflows = await workflowRepository.selectExecuteAbility(
    session.user.id,
  );
  return Response.json(workflows);
}
