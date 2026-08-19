import { describe, expect, test } from "vitest";
import { resolveVoiceBillingCustomerId } from "./billing-customer";

describe("resolveVoiceBillingCustomerId", () => {
  test("uses user id when no organization is attached", () => {
    expect(
      resolveVoiceBillingCustomerId({ userId: "user-1", organizationId: null }),
    ).toBe("user-1");
  });

  test("uses user id for personal org compatibility", () => {
    expect(
      resolveVoiceBillingCustomerId({
        userId: "user-1",
        organizationId: "personal-user-1",
      }),
    ).toBe("user-1");
  });

  test("uses organization id for team billing", () => {
    expect(
      resolveVoiceBillingCustomerId({
        userId: "user-1",
        organizationId: "org-1",
      }),
    ).toBe("org-1");
  });
});
