import "load-env";
import { afterEach } from "vitest";
import { vi } from "vitest";

// Ensures that all mocks are reset between tests
afterEach(() => {
  vi.restoreAllMocks();
});
