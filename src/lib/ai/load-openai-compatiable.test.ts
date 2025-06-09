import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
const VALID_CONFIG = JSON.stringify([
  {
    provider: "MyProvider",
    baseUrl: "https://api.myprovider.com/v1",
    apiKeyEnvVar: "MY_PROVIDER_API_KEY",
    models: [
      {
        apiName: "model-a-v1",
        uiName: "cool-model-a",
        supportsTools: true,
      },
      {
        apiName: "model-b-v1",
        uiName: "basic-model-b",
        supportsTools: false,
      },
    ],
  },
]);

describe("openai-like dynamic model loader", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should return empty results when OPENAI_LIKE_DATA is not set", async () => {
    vi.stubEnv("OPENAI_LIKE_DATA", "");
    const { dynamicModels } = await import("./load-openai-compatiable");
    expect(Object.keys(dynamicModels).length).toBe(0);
  });

  it("should log an error and return empty for invalid JSON", async () => {
    vi.stubEnv("OPENAI_LIKE_DATA", "{ not json }");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { dynamicModels } = await import("./load-openai-compatiable");
    expect(errorSpy).toHaveBeenCalled();
    expect(Object.keys(dynamicModels).length).toBe(0);
    errorSpy.mockRestore();
  });

  it("should correctly load models from a valid configuration", async () => {
    const mockModelProviderFn = vi
      .fn()
      .mockImplementation((apiName: string) => ({
        id: `mock-model-for-${apiName}`,
      }));

    vi.doMock("@ai-sdk/openai-compatible", () => ({
      createOpenAICompatible: vi.fn().mockReturnValue(mockModelProviderFn),
    }));
    vi.stubEnv("OPENAI_LIKE_DATA", VALID_CONFIG);
    vi.stubEnv("MY_PROVIDER_API_KEY", "test-key-123");

    const { dynamicModels, dynamicUnsupportedModels } = await import(
      "./load-openai-compatiable"
    );

    const { createOpenAICompatible } = await import(
      "@ai-sdk/openai-compatible"
    );

    expect(createOpenAICompatible).toHaveBeenCalledWith({
      name: "MyProvider",
      apiKey: "test-key-123",
      baseURL: "https://api.myprovider.com/v1",
    });

    expect(mockModelProviderFn).toHaveBeenCalledWith("model-a-v1");
    expect(mockModelProviderFn).toHaveBeenCalledWith("model-b-v1");

    expect(Object.keys(dynamicModels["myprovider"]).length).toBe(2);
    expect(dynamicUnsupportedModels.size).toBe(1);
  });
});
