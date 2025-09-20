"use server";
import { getSession } from "auth/server";
import { workflowRepository } from "lib/db/repository";

export async function selectExecuteAbilityWorkflowsAction() {
  const session = await getSession();
  if (!session) {
    return [];
  }
  const workflows = await workflowRepository.selectExecuteAbility(
    session.user.id,
  );
  return workflows;
}
