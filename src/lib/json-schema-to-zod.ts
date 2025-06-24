import { z } from "zod";
import { JSONSchema7 } from "json-schema";

/**
 * Converts a JSON Schema to a Zod schema (simplified version)
 * Supports: string, number, boolean, object, array, enum
 * @param jsonSchema - The JSON Schema object to convert
 * @returns A Zod schema
 */
export function jsonSchemaToZod(jsonSchema: JSONSchema7): z.ZodType<any> {
  // Handle enum
  if (jsonSchema.enum) {
    if (jsonSchema.enum.length === 0) {
      return z.never();
    }
    if (jsonSchema.enum.length === 1) {
      return z.literal(jsonSchema.enum[0] as any);
    }
    return z.enum(jsonSchema.enum as any);
  }

  const type = jsonSchema.type;

  switch (type) {
    case "string": {
      return z.string();
    }

    case "number": {
      return z.number();
    }

    case "integer": {
      return z.number().int();
    }

    case "boolean": {
      return z.boolean();
    }

    case "array": {
      if (
        !jsonSchema.items ||
        typeof jsonSchema.items === "boolean" ||
        Array.isArray(jsonSchema.items)
      ) {
        return z.array(z.unknown());
      }

      return z.array(jsonSchemaToZod(jsonSchema.items as JSONSchema7));
    }

    case "object": {
      if (!jsonSchema.properties) {
        return z.record(z.unknown());
      }

      const shape: Record<string, z.ZodType> = {};
      const required = (jsonSchema.required as string[]) || [];

      for (const [key, propSchema] of Object.entries(jsonSchema.properties)) {
        if (typeof propSchema === "boolean") {
          shape[key] = z.unknown().optional();
          continue;
        }

        let zodProp = jsonSchemaToZod(propSchema);

        if (!required.includes(key)) {
          zodProp = zodProp.optional();
        }

        shape[key] = zodProp;
      }

      return z.object(shape);
    }

    case "null": {
      return z.null();
    }

    default: {
      // If type is not specified or unknown, return z.unknown()
      return z.unknown();
    }
  }
}

/**
 * Converts a JSON Schema string to a Zod schema
 * @param jsonSchemaString - The JSON Schema as a string
 * @returns A Zod schema
 */
export function jsonSchemaStringToZod(
  jsonSchemaString: string,
): z.ZodType<any> {
  try {
    const jsonSchema = JSON.parse(jsonSchemaString) as JSONSchema7;
    return jsonSchemaToZod(jsonSchema);
  } catch (error) {
    throw new Error(`Failed to parse JSON Schema: ${error}`);
  }
}
