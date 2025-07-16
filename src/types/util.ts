import { JSONSchema7 } from "json-schema";

export type ObjectJsonSchema7 = {
  type: "object";
  required?: string[];
  description?: string;
  properties: {
    [key: string]: JSONSchema7;
  };
};

export type TipTapMentionJsonContentPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "mention";
      attrs: {
        id: string;
        label: string;
      };
    };

export type TipTapMentionJsonContent = {
  type: "doc";
  content: {
    type: "paragraph";
    content?: (
      | {
          type: "text";
          text: string;
        }
      | {
          type: "mention";
          attrs: {
            id: string;
            label: string;
          };
        }
      | {
          type: "hardBreak";
        }
    )[];
  }[];
};
