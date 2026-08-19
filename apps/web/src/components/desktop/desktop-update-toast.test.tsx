// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const { custom } = vi.hoisted(() => ({ custom: vi.fn() }));
vi.mock("sonner", () => ({ toast: { custom } }));

import { renderUpdateToast } from "./desktop-update-toast";

describe("renderUpdateToast", () => {
  beforeEach(() => {
    custom.mockClear();
  });

  it("shows a persistent bottom-left toast when an update becomes available", () => {
    renderUpdateToast({ status: "available", version: "1.2.3" });

    expect(custom).toHaveBeenCalledTimes(1);
    const [, options] = custom.mock.calls[0]!;
    expect(options).toMatchObject({
      id: "desktop-update",
      position: "bottom-left",
      duration: Infinity,
    });
  });

  it("shows a dismissible error toast when the update fails", () => {
    renderUpdateToast({ status: "error", message: "network error" });

    expect(custom).toHaveBeenCalledTimes(1);
    const [, options] = custom.mock.calls[0]!;
    expect(options).toMatchObject({
      id: "desktop-update",
      position: "bottom-left",
      duration: 8000,
    });
  });

  it.each(["idle", "checking", "not-available"] as const)(
    "stays silent for %s state",
    (status) => {
      renderUpdateToast({ status });
      expect(custom).not.toHaveBeenCalled();
    },
  );
});
