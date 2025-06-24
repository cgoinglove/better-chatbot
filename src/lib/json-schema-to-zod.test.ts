import { describe, it, expect } from "vitest";

import { JSONSchema7 } from "json-schema";
import { jsonSchemaToZod, jsonSchemaStringToZod } from "./json-schema-to-zod";

describe("jsonSchemaToZod (simplified)", () => {
  it("should convert string type", () => {
    const jsonSchema: JSONSchema7 = { type: "string" };
    const zodSchema = jsonSchemaToZod(jsonSchema);

    expect(zodSchema.parse("hello")).toBe("hello");
    expect(() => zodSchema.parse(123)).toThrow();
  });

  it("should convert number type", () => {
    const jsonSchema: JSONSchema7 = { type: "number" };
    const zodSchema = jsonSchemaToZod(jsonSchema);

    expect(zodSchema.parse(123)).toBe(123);
    expect(zodSchema.parse(123.45)).toBe(123.45);
    expect(() => zodSchema.parse("123")).toThrow();
  });

  it("should convert integer type", () => {
    const jsonSchema: JSONSchema7 = { type: "integer" };
    const zodSchema = jsonSchemaToZod(jsonSchema);

    expect(zodSchema.parse(123)).toBe(123);
    expect(() => zodSchema.parse(123.45)).toThrow();
  });

  it("should convert boolean type", () => {
    const jsonSchema: JSONSchema7 = { type: "boolean" };
    const zodSchema = jsonSchemaToZod(jsonSchema);

    expect(zodSchema.parse(true)).toBe(true);
    expect(zodSchema.parse(false)).toBe(false);
    expect(() => zodSchema.parse("true")).toThrow();
  });

  it("should convert array type", () => {
    const jsonSchema: JSONSchema7 = {
      type: "array",
      items: { type: "string" },
    };
    const zodSchema = jsonSchemaToZod(jsonSchema);

    expect(zodSchema.parse(["a", "b", "c"])).toEqual(["a", "b", "c"]);
    expect(() => zodSchema.parse([1, 2, 3])).toThrow();
  });

  it("should convert object type", () => {
    const jsonSchema: JSONSchema7 = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "integer" },
      },
      required: ["name"],
    };
    const zodSchema = jsonSchemaToZod(jsonSchema);

    const validData = {
      name: "John",
      age: 30,
    };

    expect(zodSchema.parse(validData)).toEqual(validData);

    // Missing required field
    expect(() => zodSchema.parse({ age: 30 })).toThrow();

    // Optional field can be omitted
    expect(zodSchema.parse({ name: "John" })).toEqual({
      name: "John",
    });
  });

  it("should handle enum", () => {
    const jsonSchema: JSONSchema7 = {
      enum: ["red", "green", "blue"],
    };
    const zodSchema = jsonSchemaToZod(jsonSchema);

    expect(zodSchema.parse("red")).toBe("red");
    expect(() => zodSchema.parse("yellow")).toThrow();
  });

  it("should handle single enum value as literal", () => {
    const jsonSchema: JSONSchema7 = {
      enum: ["red"],
    };
    const zodSchema = jsonSchemaToZod(jsonSchema);

    expect(zodSchema.parse("red")).toBe("red");
    expect(() => zodSchema.parse("blue")).toThrow();
  });

  it("should handle null type", () => {
    const jsonSchema: JSONSchema7 = { type: "null" };
    const zodSchema = jsonSchemaToZod(jsonSchema);

    expect(zodSchema.parse(null)).toBe(null);
    expect(() => zodSchema.parse("null")).toThrow();
  });

  it("should handle unknown type", () => {
    const jsonSchema: JSONSchema7 = {};
    const zodSchema = jsonSchemaToZod(jsonSchema);

    expect(zodSchema.parse("anything")).toBe("anything");
    expect(zodSchema.parse(123)).toBe(123);
    expect(zodSchema.parse(true)).toBe(true);
  });
});

describe("jsonSchemaStringToZod", () => {
  it("should parse JSON string and convert to Zod", () => {
    const jsonSchemaString = JSON.stringify({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name"],
    });

    const zodSchema = jsonSchemaStringToZod(jsonSchemaString);

    expect(zodSchema.parse({ name: "John", age: 30 })).toEqual({
      name: "John",
      age: 30,
    });
  });

  it("should throw error for invalid JSON", () => {
    expect(() => jsonSchemaStringToZod("invalid json")).toThrow();
  });
});
