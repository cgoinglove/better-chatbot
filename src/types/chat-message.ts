import { Message } from "ai";

// Type for message parts
type TextPart = {
  type: 'text';
  text: string;
};

export type UIMessage = Message & {
  parts?: Array<TextPart | { type: string }>;
  threadId: string;
};
