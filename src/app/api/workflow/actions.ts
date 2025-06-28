import { getSession } from "auth/server";
import { workflowRepository } from "lib/db/repository";

export async function getExecuteAbilityWorkflowsAction() {
  const session = await getSession();
  const workflows = await workflowRepository.selectExecuteAbility(
    session.user.id,
  );
  return workflows;
}
