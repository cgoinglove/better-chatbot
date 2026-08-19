import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
}));

vi.mock("ai", () => ({
  generateObject: (...args: unknown[]) => mocks.generateObject(...args),
  generateText: (...args: unknown[]) => mocks.generateText(...args),
}));

const { extractJsonObject, generateObjectResilient } = await import(
  "./resilient-object"
);

describe("extractJsonObject", () => {
  it("parses plain JSON", () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown fences", () => {
    expect(extractJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJsonObject('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("ignores prose around the object", () => {
    expect(
      extractJsonObject('Here is the result:\n{"a":{"b":2}}\nHope that helps!'),
    ).toEqual({ a: { b: 2 } });
  });

  it("handles fenced JSON with prose outside the fence", () => {
    expect(
      extractJsonObject('Sure! ```json\n{"todos":[]}\n``` Let me know.'),
    ).toEqual({ todos: [] });
  });

  it("throws when there is no JSON object", () => {
    expect(() => extractJsonObject("no json here")).toThrow();
  });

  it("throws on malformed JSON", () => {
    expect(() => extractJsonObject('{"a":')).toThrow();
  });
});

describe("generateObjectResilient abort signal", () => {
  const schema = z.object({ ok: z.boolean() });

  function run(abortSignal: AbortSignal) {
    return generateObjectResilient({
      model: "primary-model",
      fallbackModel: "fallback-model",
      schema,
      system: "sys",
      prompt: "prompt",
      abortSignal,
    });
  }

  it("passes the signal to the primary attempt", async () => {
    mocks.generateObject.mockReset();
    mocks.generateText.mockReset();
    mocks.generateObject.mockResolvedValue({ object: { ok: true } });
    const signal = AbortSignal.timeout(10_000);

    await run(signal);

    expect(mocks.generateObject.mock.calls[0][0].abortSignal).toBe(signal);
  });

  it("passes the signal to every fallback layer", async () => {
    // All three attempts are sequential, so a caller on a deadline needs the
    // bound to apply to the whole chain, not just the first call.
    mocks.generateObject.mockReset();
    mocks.generateText.mockReset();
    mocks.generateObject
      .mockRejectedValueOnce(new Error("strict parse failed"))
      .mockResolvedValueOnce({ object: { ok: true } });
    mocks.generateText.mockRejectedValue(new Error("repair failed"));
    const signal = AbortSignal.timeout(10_000);

    const result = await run(signal);

    expect(result.via).toBe("fallback");
    expect(mocks.generateObject.mock.calls[0][0].abortSignal).toBe(signal);
    expect(mocks.generateText.mock.calls[0][0].abortSignal).toBe(signal);
    expect(mocks.generateObject.mock.calls[1][0].abortSignal).toBe(signal);
  });
});
