/**
 * Shared vocabulary for the billing/entitlement seam.
 *
 * The cloud edition implements these against Autumn; the community edition
 * ships a no-op implementation. Nothing in here may import an edition-specific
 * module — this file is identical in both editions.
 */

/**
 * Who a metered action is billed to.
 *
 * `customerId` is null in the community edition (and for unauthenticated
 * callers): there is no billing customer, so metering is skipped while the
 * surrounding feature keeps working.
 */
export type BillingContext = {
  customerId: string | null;
  userId: string;
  entityId?: string;
  customerData: {
    email: string;
    name: string;
    image?: string | null;
  };
  organizationName?: string;
};

/** Entitlements that gate a feature rather than a credit balance. */
export type Feature = "local_models" | "exaai";

/** Who to bill, carried on every usage event. */
type UsageTarget = {
  customerId: string | null;
  entityId?: string;
  properties?: Record<string, any>;
};

/** A metered action that has already happened. Reported after the fact. */
export type UsageEvent = UsageTarget &
  (
    | {
        kind: "tokens";
        modelId: string;
        promptTokens: number;
        completionTokens: number;
        idempotencyKey: string;
      }
    | {
        kind: "assemblyai";
        durationSeconds: number;
        sessionId: string;
      }
    | {
        kind: "agentset";
        parsedPages: number;
        documentId: string;
        idempotencyKey?: string;
      }
    | {
        kind: "exa";
        idempotencyKey: string;
      }
    | {
        kind: "e2b";
        executionTimeMs: number;
        vcpuCount: number;
        memoryMb: number;
        sandboxExecutionId: string;
      }
  );

/** Payload for the account-created side effects (CRM sync in the cloud). */
export type CreatedUser = {
  id: string;
  email: string;
  name?: string | null;
};

/** An organization invitation that needs an email delivered. */
export type OrganizationInvitation = {
  email: string;
  invitedByUsername: string;
  invitedByEmail: string;
  teamName: string;
  inviteLink: string;
};

/** A password reset email that needs delivering. */
export type PasswordResetEmail = {
  email: string;
  name?: string | null;
  resetUrl: string;
};
