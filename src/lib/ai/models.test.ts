import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  OPENAI_FILE_MIME_TYPES,
  ANTHROPIC_FILE_MIME_TYPES,
} from "./file-support";

vi.mock("server-only", () => ({}));

let modelsModule: typeof import("./models");

beforeAll(async () => {
  modelsModule = await import("./models");
});

describe("customModelProvider file support metadata", () => {
  it("includes default file support for OpenAI gpt-4.1", () => {
    const { customModelProvider, getFilePartSupportedMimeTypes } = modelsModule;
    const model = customModelProvider.getModel({
      provider: "openai",
      model: "gpt-4.1",
    });
    expect(getFilePartSupportedMimeTypes(model)).toEqual(
      Array.from(OPENAI_FILE_MIME_TYPES),
    );

    const openaiProvider = customModelProvider.modelsInfo.find(
      (item) => item.provider === "openai",
    );
    const metadata = openaiProvider?.models.find(
      (item) => item.name === "gpt-4.1",
    );

    expect(metadata?.supportedFileMimeTypes).toEqual(
      Array.from(OPENAI_FILE_MIME_TYPES),
    );
  });

  it("adds rich support for anthropic sonnet-4.5", () => {
    const { customModelProvider, getFilePartSupportedMimeTypes } = modelsModule;
    const model = customModelProvider.getModel({
      provider: "anthropic",
      model: "sonnet-4.5",
    });
    expect(getFilePartSupportedMimeTypes(model)).toEqual(
      Array.from(ANTHROPIC_FILE_MIME_TYPES),
    );
  });
});
