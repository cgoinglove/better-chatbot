// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmailPreviewUI } from "./email-preview";

const DRAFT = "**Das müsstest du tun:**\n- Zielkunden beschreiben";

afterEach(cleanup);

describe("EmailPreviewUI", () => {
  it("renders the draft instead of showing the model's markdown markers", () => {
    render(
      <EmailPreviewUI
        to="anthony@example.com"
        subject="Sales Agent Demo"
        body={DRAFT}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(screen.getByText("Das müsstest du tun:").tagName).toBe("STRONG");
    expect(screen.queryByText(/\*\*/)).toBeNull();
  });

  it("hands the approved body to the caller so the edit is what gets sent", () => {
    const onApprove = vi.fn();
    render(
      <EmailPreviewUI
        to="anthony@example.com"
        subject="Sales Agent Demo"
        body={DRAFT}
        onApprove={onApprove}
        onReject={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Kurzfassung" },
    });
    fireEvent.click(screen.getByRole("button", { name: /approve & send/i }));

    expect(onApprove).toHaveBeenCalledWith("Kurzfassung");
  });

  it("stays read-only once the proposal has settled", () => {
    render(
      <EmailPreviewUI
        to="anthony@example.com"
        subject="Sales Agent Demo"
        body="Moin Anthony"
        outcome="approved"
      />,
    );

    expect(screen.getByText("Email Approved")).not.toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(
      screen.queryByRole("button", { name: /approve & send/i }),
    ).toBeNull();
  });
});
