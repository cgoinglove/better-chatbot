import { JSONSchema7 } from "json-schema";

export type ObjectJsonSchema7 = {
  type: "object";
  required?: string[];
  description?: string;
  properties: {
    [key: string]: JSONSchema7;
  };
};
