import type { AuthenticatedVoiceDevice } from "lib/voice/device-auth";

export function resolveVoiceBillingCustomerId(input: {
  userId: string;
  organizationId?: string | null;
}) {
  if (!input.organizationId) {
    return input.userId;
  }
  if (input.organizationId.startsWith("personal-")) {
    return input.userId;
  }
  return input.organizationId;
}

export function resolveVoiceActorBillingCustomerId(
  actor: AuthenticatedVoiceDevice,
) {
  return resolveVoiceBillingCustomerId({
    userId: actor.userId,
    organizationId: actor.organizationId,
  });
}
