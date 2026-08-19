import { describe, expect, test } from "vitest";
import {
  buildExtractionSystemPrompt,
  buildGatherSystemPrompt,
} from "./prompts";

describe("buildGatherSystemPrompt", () => {
  test("anchors the connector-read prompt to the current date", () => {
    const prompt = buildGatherSystemPrompt({ projectName: "Test project" });

    expect(prompt).toContain(String(new Date().getFullYear()));
    expect(prompt).toContain(
      "Interpret 'recent' relative to the current date above",
    );
  });

  test("includes the project's system prompt when set", () => {
    const prompt = buildGatherSystemPrompt({
      projectName: "Test project",
      projectSystemPrompt: "Only track invoices over $10k.",
    });

    expect(prompt).toContain(
      "Project instructions: Only track invoices over $10k.",
    );
  });

  test("omits the project instructions line when unset", () => {
    const prompt = buildGatherSystemPrompt({ projectName: "Test project" });

    expect(prompt).not.toContain("Project instructions:");
  });
});

describe("buildExtractionSystemPrompt", () => {
  test("anchors the widget-extraction prompt to the current date", () => {
    const prompt = buildExtractionSystemPrompt();

    expect(prompt).toContain(String(new Date().getFullYear()));
    expect(prompt).toContain("never assume a year");
  });

  // The schema is a discriminated union on `kind`; when the prompt does not name
  // the legal values the model invents its own ("list", "calendar") and the whole
  // extraction fails validation.
  test("names the widget kinds the schema accepts", () => {
    const prompt = buildExtractionSystemPrompt();

    expect(prompt).toContain('"table"');
    expect(prompt).toContain('"metric"');
  });
});
