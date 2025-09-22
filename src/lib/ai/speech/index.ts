import { UIMessage } from "ai";
import { ChatMention } from "app-types/chat";

export type UIMessageWithCompleted = UIMessage & { completed: boolean };

export interface VoiceChatSession {
  isActive: boolean;
  isListening: boolean;
  isUserSpeaking: boolean;
  isAssistantSpeaking: boolean;
  isLoading: boolean;
  messages: UIMessageWithCompleted[];
  error: Error | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
}

export type VoiceChatOptions = {
  toolMentions?: ChatMention[];
  agentId?: string;
  model?: string;
  voice?: string;
};

export type VoiceChatHook = (props?: {
  [key: string]: any;
}) => VoiceChatSession;

export const DEFAULT_VOICE_TOOLS = [
  {
    type: "function",
    name: "changeBrowserTheme",
    description: "Change the browser theme",
    parameters: {
      type: "object",
      properties: {
        theme: {
          type: "string",
          enum: ["light", "dark"],
        },
      },
      required: ["theme"],
    },
  },
  {
    type: "function",
    name: "endConversation",
    description:
      "End the current voice conversation, similar to hanging up a call. This tool should be invoked when the user clearly expresses a desire to finish, exit, or end the dialogue.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];
